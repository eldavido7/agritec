import { NextResponse } from "next/server";
import { PaymentStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { buildCheckoutQuote } from "@/lib/checkout-quote";
import prisma from "@/lib/prisma";
import {
  createPendingCheckoutOrder,
  getParentOrderWithRelations,
  markPaymentInitializationFailed,
} from "@/lib/payment-order-utils";
import { serializeOrder } from "@/lib/marketplace-serializers";
import { initializePaystackTransaction } from "@/lib/paystack";

const initializeSchema = z.object({
  addressId: z.string().trim().min(1, "Address is required"),
  discountCodes: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  logisticsSelections: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  allGroupsLogisticsCompanyId: z.string().trim().min(1).optional().nullable(),
  callbackUrl: z.string().trim().url().optional(),
  channels: z.array(z.string().trim().min(1)).optional(),
});

function checkoutErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, message: error.issues[0]?.message ?? "Invalid checkout payload" },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed to initialize checkout";

  switch (message) {
    case "ADDRESS_NOT_FOUND":
      return NextResponse.json({ success: false, message: "Selected address was not found" }, { status: 404 });
    case "CART_NOT_FOUND":
      return NextResponse.json({ success: false, message: "Cart not found" }, { status: 404 });
    case "SHIPPING_SETTINGS_NOT_CONFIGURED":
      return NextResponse.json(
        { success: false, message: "Shipping settings are not configured" },
        { status: 500 }
      );
    case "LOGISTICS_COMPANY_NOT_FOUND":
      return NextResponse.json(
        { success: false, message: "Selected logistics company was not found" },
        { status: 404 }
      );
    case "NO_ELIGIBLE_LOGISTICS_COMPANIES":
      return NextResponse.json(
        { success: false, message: "No eligible logistics companies are available for this address" },
        { status: 400 }
      );
    case "CART_EMPTY":
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    case "PAYSTACK_SECRET_KEY_NOT_CONFIGURED":
      return NextResponse.json(
        { success: false, message: "Paystack is not configured on the server" },
        { status: 500 }
      );
    default:
      if (message.startsWith("LOGISTICS_SELECTION_REQUIRED:")) {
        return NextResponse.json(
          { success: false, message: "Logistics selection is required for each seller group" },
          { status: 400 }
        );
      }
      if (message.startsWith("LOGISTICS_COMPANY_NOT_ELIGIBLE:")) {
        return NextResponse.json(
          { success: false, message: "Selected logistics company is not eligible for one or more seller groups" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, message: "Failed to initialize checkout" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let pendingOrderId: string | null = null;
  let pendingPaymentId: string | null = null;

  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const payload = initializeSchema.parse(rawBody);
    const quote = await buildCheckoutQuote({
      buyerId: user.buyerProfile.id,
      addressId: payload.addressId,
      discountCodes: payload.discountCodes,
      logisticsSelections: payload.logisticsSelections,
      allGroupsLogisticsCompanyId: payload.allGroupsLogisticsCompanyId ?? null,
    });

    const pendingOrder = await createPendingCheckoutOrder({
      buyerUser: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone ?? null,
        buyerProfile: { id: user.buyerProfile.id },
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
      email: user.email,
      amountInSubunit: pendingOrder.payment.amount * 100,
      reference: pendingOrder.payment.reference,
      currencyCode: pendingOrder.payment.currencyCode,
      callbackUrl,
      channels: payload.channels,
      metadata: {
        parentOrderId: pendingOrder.id,
        paymentId: pendingOrder.payment.id,
        buyerId: user.buyerProfile.id,
      },
    });

    await prisma.payment.update({
      where: { id: pendingOrder.payment.id },
      data: {
        status: PaymentStatus.INITIALIZED,
        accessCode: initializeResult.access_code,
        authorizationUrl: initializeResult.authorization_url,
        rawInitializeResponse: initializeResult,
      },
    });

    const order = await getParentOrderWithRelations(pendingOrder.id);
    if (!order || !order.payment) {
      throw new Error("ORDER_NOT_FOUND_AFTER_INITIALIZE");
    }

    return NextResponse.json({
      success: true,
      message: "Checkout initialized",
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
    console.error("[CHECKOUT_INITIALIZE_POST_ERROR]", error);

    if (pendingOrderId && pendingPaymentId) {
      await markPaymentInitializationFailed({
        parentOrderId: pendingOrderId,
        paymentId: pendingPaymentId,
        rawResponse: {
          message: error instanceof Error ? error.message : "Failed to initialize Paystack checkout",
        },
      }).catch(() => null);
    }

    return checkoutErrorResponse(error);
  }
}

