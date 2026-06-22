import { AddressCreatorRole, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { buildAdminAssistedQuote } from "@/lib/admin-assisted-order-utils";
import { createPendingAssistedOrder, getParentOrderWithRelations, markPaymentInitializationFailed } from "@/lib/payment-order-utils";
import { serializeOrder } from "@/lib/marketplace-serializers";
import { initializePaystackTransaction } from "@/lib/paystack";
import prisma from "@/lib/prisma";
import { reserveSequentialId } from "@/lib/id-sequence";

const assistedLineSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional().nullable(),
  quantity: z.number().int().positive(),
});

const manualAddressSchema = z.object({
  displayName: z.string().trim().optional().nullable(),
  addressLine: z.string().trim().min(1),
  fullAddress: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  lga: z.string().trim().optional().nullable(),
  area: z.string().trim().optional().nullable(),
  landmark: z.string().trim().optional().nullable(),
  saveToBuyerProfile: z.boolean().optional().default(false),
});

const assistedInitializeSchema = z.object({
  buyerId: z.string().trim().min(1),
  items: z.array(assistedLineSchema).min(1),
  discountCodes: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  logisticsSelections: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  allGroupsLogisticsCompanyId: z.string().trim().min(1).optional().nullable(),
  addressId: z.string().trim().min(1).optional(),
  manualAddress: manualAddressSchema.optional(),
  callbackUrl: z.string().trim().url().optional(),
  channels: z.array(z.string().trim().min(1)).optional(),
}).superRefine((value, ctx) => {
  if (!value.addressId && !value.manualAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either addressId or manualAddress",
      path: ["addressId"],
    });
  }
});

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, message: error.issues[0]?.message ?? "Invalid assisted order payload" },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed to initialize assisted order";
  if (message === "BUYER_NOT_FOUND") {
    return NextResponse.json({ success: false, message: "Buyer not found" }, { status: 404 });
  }
  if (message.startsWith("PRODUCT_NOT_FOUND:")) {
    return NextResponse.json({ success: false, message: "One or more products were not found" }, { status: 404 });
  }
  if (message.startsWith("VARIANT_NOT_FOUND:")) {
    return NextResponse.json({ success: false, message: "One or more variants were not found" }, { status: 404 });
  }
  if (message.startsWith("INSUFFICIENT_INVENTORY:")) {
    return NextResponse.json({ success: false, message: "One or more products do not have enough inventory" }, { status: 400 });
  }
  if (message === "ASSISTED_ORDER_ITEMS_EMPTY") {
    return NextResponse.json({ success: false, message: "At least one order item is required" }, { status: 400 });
  }
  if (message === "SHIPPING_SETTINGS_NOT_CONFIGURED") {
    return NextResponse.json({ success: false, message: "Shipping settings are not configured" }, { status: 500 });
  }
  if (message === "LOGISTICS_COMPANY_NOT_FOUND") {
    return NextResponse.json({ success: false, message: "Selected logistics company was not found" }, { status: 404 });
  }
  if (message === "ALL_GROUPS_LOGISTICS_MUST_BE_NATIONWIDE") {
    return NextResponse.json({ success: false, message: "All-groups logistics selection must be a nationwide company" }, { status: 400 });
  }
  if (message === "NO_ELIGIBLE_LOGISTICS_COMPANIES") {
    return NextResponse.json({ success: false, message: "No eligible logistics companies are available for this address" }, { status: 400 });
  }
  if (message === "BUYER_ADDRESS_NOT_FOUND") {
    return NextResponse.json({ success: false, message: "Selected buyer address was not found" }, { status: 404 });
  }
  if (message === "PAYSTACK_SECRET_KEY_NOT_CONFIGURED") {
    return NextResponse.json({ success: false, message: "Paystack is not configured on the server" }, { status: 500 });
  }
  if (message.startsWith("LOGISTICS_SELECTION_REQUIRED:")) {
    return NextResponse.json({ success: false, message: "Logistics selection is required for each seller group" }, { status: 400 });
  }
  if (message.startsWith("LOGISTICS_COMPANY_NOT_ELIGIBLE:")) {
    return NextResponse.json({ success: false, message: "Selected logistics company is not eligible for one or more seller groups" }, { status: 400 });
  }

  return NextResponse.json({ success: false, message: "Failed to initialize assisted order" }, { status: 500 });
}

export async function POST(request: Request) {
  let pendingOrderId: string | null = null;
  let pendingPaymentId: string | null = null;

  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = assistedInitializeSchema.parse(await request.json());

    const buyer = await prisma.buyerProfile.findUnique({
      where: { id: payload.buyerId },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
      },
    });

    if (!buyer) {
      throw new Error("BUYER_NOT_FOUND");
    }

    let addressRecord;
    if (payload.addressId) {
      addressRecord = await prisma.address.findFirst({
        where: {
          id: payload.addressId,
          buyerId: buyer.id,
        },
      });

      if (!addressRecord) {
        throw new Error("BUYER_ADDRESS_NOT_FOUND");
      }
    } else if (payload.manualAddress) {
      const manualAddress = payload.manualAddress;
      let savedAddressId: string | null = null;
      if (manualAddress.saveToBuyerProfile) {
        savedAddressId = await prisma.$transaction(async (tx) => {
          const addressId = await reserveSequentialId(tx, "address");
          const existingDefault = await tx.address.findFirst({
            where: { buyerId: buyer.id, isDefault: true },
            select: { id: true },
          });

          await tx.address.create({
            data: {
              id: addressId,
              buyerId: buyer.id,
              displayName: manualAddress?.displayName ?? null,
              addressLine: manualAddress.addressLine,
              fullAddress: manualAddress.fullAddress,
              city: manualAddress.city,
              state: manualAddress.state,
              lga: manualAddress.lga ?? null,
              area: manualAddress.area ?? null,
              landmark: manualAddress.landmark ?? null,
              latitude: null,
              longitude: null,
              isDefault: !existingDefault,
              isManualAddress: true,
              isAdminAssisted: true,
              createdByRole: AddressCreatorRole.ADMIN,
            },
          });

          return addressId;
        });
      }

      addressRecord = {
        id: savedAddressId,
        buyerId: buyer.id,
        displayName: manualAddress.displayName ?? null,
        addressLine: manualAddress.addressLine,
        fullAddress: manualAddress.fullAddress,
        city: manualAddress.city,
        state: manualAddress.state,
        lga: manualAddress.lga ?? null,
        area: manualAddress.area ?? null,
        landmark: manualAddress.landmark ?? null,
        latitude: null,
        longitude: null,
        isDefault: false,
        isManualAddress: true,
        isAdminAssisted: true,
        createdByRole: AddressCreatorRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (!addressRecord) {
      throw new Error("BUYER_ADDRESS_NOT_FOUND");
    }

    const quote = await buildAdminAssistedQuote({
      buyerId: buyer.id,
      items: payload.items,
      address: {
        id: addressRecord.id ?? null,
        displayName: addressRecord.displayName ?? null,
        addressLine: addressRecord.addressLine,
        fullAddress: addressRecord.fullAddress,
        city: addressRecord.city,
        state: addressRecord.state,
        lga: addressRecord.lga ?? null,
        area: addressRecord.area ?? null,
        landmark: addressRecord.landmark ?? null,
        latitude: addressRecord.latitude != null ? Number(addressRecord.latitude) : null,
        longitude: addressRecord.longitude != null ? Number(addressRecord.longitude) : null,
        isManualAddress: addressRecord.isManualAddress,
        isAdminAssisted: addressRecord.isAdminAssisted,
        createdByRole: addressRecord.createdByRole,
      },
      discountCodes: payload.discountCodes,
      logisticsSelections: payload.logisticsSelections,
      allGroupsLogisticsCompanyId: payload.allGroupsLogisticsCompanyId ?? null,
    });

    const pendingOrder = await createPendingAssistedOrder({
      buyerUser: {
        id: buyer.user.id,
        email: buyer.user.email,
        fullName: buyer.user.fullName,
        phone: buyer.user.phone ?? null,
        buyerProfile: { id: buyer.id },
      },
      quote,
      discountCodes: payload.discountCodes,
    });

    if (!pendingOrder.payment) {
      throw new Error("PENDING_PAYMENT_NOT_CREATED");
    }

    pendingOrderId = pendingOrder.id;
    pendingPaymentId = pendingOrder.payment.id;

    const callbackUrl =
      payload.callbackUrl ??
      process.env.PAYSTACK_CALLBACK_URL ??
      new URL("/api/paystack/callback", request.url).toString();
    const initializeResult = await initializePaystackTransaction({
      email: buyer.user.email,
      amountInSubunit: pendingOrder.payment.amount * 100,
      reference: pendingOrder.payment.reference,
      currencyCode: pendingOrder.payment.currencyCode,
      callbackUrl,
      channels: payload.channels,
      metadata: {
        parentOrderId: pendingOrder.id,
        paymentId: pendingOrder.payment.id,
        buyerId: buyer.id,
        initiatedByAdminId: admin.id,
        isAdminAssisted: true,
      },
    });

    await prisma.payment.update({
      where: { id: pendingOrder.payment.id },
      data: {
        status: "INITIALIZED",
        accessCode: initializeResult.access_code,
        authorizationUrl: initializeResult.authorization_url,
        rawInitializeResponse: initializeResult,
        metadata: {
          ...((pendingOrder.payment.metadata as object) ?? {}),
          initiatedByAdminId: admin.id,
          isAdminAssisted: true,
        },
      },
    });

    const order = await getParentOrderWithRelations(pendingOrder.id);
    if (!order || !order.payment) {
      throw new Error("ORDER_NOT_FOUND_AFTER_INITIALIZE");
    }

    return NextResponse.json({
      success: true,
      message: "Assisted order initialized",
      orderId: order.id,
      reference: order.payment.reference,
      authorizationUrl: order.payment.authorizationUrl,
      order: serializeOrder(order),
      payment: {
        id: order.payment.id,
        provider: order.payment.provider,
        status: order.payment.status,
        reference: order.payment.reference,
        accessCode: order.payment.accessCode,
        authorizationUrl: order.payment.authorizationUrl,
        amount: order.payment.amount,
        amountInSubunit: order.payment.amount * 100,
        currencyCode: order.payment.currencyCode,
      },
    });
  } catch (error) {
    console.error("[ADMIN_ASSISTED_ORDER_INITIALIZE_POST_ERROR]", error);

    if (pendingOrderId && pendingPaymentId) {
      await markPaymentInitializationFailed({
        parentOrderId: pendingOrderId,
        paymentId: pendingPaymentId,
        rawResponse: {
          message: error instanceof Error ? error.message : "Failed to initialize assisted Paystack checkout",
        },
      }).catch(() => null);
    }

    return errorResponse(error);
  }
}

