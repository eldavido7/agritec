import { AddressCreatorRole, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { buildAdminAssistedQuote } from "@/lib/admin-assisted-order-utils";
import prisma from "@/lib/prisma";

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
});

const assistedQuoteSchema = z
  .object({
    buyerId: z.string().trim().min(1),
    items: z.array(assistedLineSchema).min(1),
    discountCodes: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
    logisticsSelections: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
    allGroupsLogisticsCompanyId: z.string().trim().min(1).optional().nullable(),
    addressId: z.string().trim().min(1).optional(),
    manualAddress: manualAddressSchema.optional(),
  })
  .superRefine((value, ctx) => {
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
      { success: false, message: error.issues[0]?.message ?? "Invalid assisted quote payload" },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed to generate assisted order quote";
  if (message === "BUYER_NOT_FOUND") {
    return NextResponse.json({ success: false, message: "Buyer not found" }, { status: 404 });
  }
  if (message === "BUYER_ADDRESS_NOT_FOUND") {
    return NextResponse.json({ success: false, message: "Selected buyer address was not found" }, { status: 404 });
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
  if (message.startsWith("PRODUCT_NOT_FOUND:")) {
    return NextResponse.json({ success: false, message: "One or more products were not found" }, { status: 404 });
  }
  if (message.startsWith("VARIANT_NOT_FOUND:")) {
    return NextResponse.json({ success: false, message: "One or more variants were not found" }, { status: 404 });
  }
  if (message.startsWith("INSUFFICIENT_INVENTORY:")) {
    return NextResponse.json({ success: false, message: "One or more products do not have enough inventory" }, { status: 400 });
  }

  return NextResponse.json(
    { success: false, message: "Failed to generate assisted order quote" },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = assistedQuoteSchema.parse(await request.json());

    const buyer = await prisma.buyerProfile.findUnique({
      where: { id: payload.buyerId },
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
      addressRecord = {
        id: null,
        buyerId: buyer.id,
        displayName: payload.manualAddress.displayName ?? null,
        addressLine: payload.manualAddress.addressLine,
        fullAddress: payload.manualAddress.fullAddress,
        city: payload.manualAddress.city,
        state: payload.manualAddress.state,
        lga: payload.manualAddress.lga ?? null,
        area: payload.manualAddress.area ?? null,
        landmark: payload.manualAddress.landmark ?? null,
        latitude: null,
        longitude: null,
        isDefault: false,
        isManualAddress: true,
        isAdminAssisted: true,
        createdByRole: AddressCreatorRole.ADMIN,
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
      allowPlatformFallbackWithoutSelection: true,
    });

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error("[ADMIN_ASSISTED_ORDER_QUOTE_POST_ERROR]", error);
    return errorResponse(error);
  }
}
