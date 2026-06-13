import { PaymentStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  finalizeSuccessfulPayment,
  getParentOrderWithRelations,
  markPaymentVerificationState,
} from "@/lib/payment-order-utils";
import { serializeOrder } from "@/lib/marketplace-serializers";
import { verifyPaystackTransaction } from "@/lib/paystack";

const PENDING_TIMEOUT_MS = 15 * 60 * 1000;

function isFailureStatus(status: string) {
  return ["abandoned", "failed", "reversed"].includes(status.toLowerCase());
}

async function buildOrderPayload(parentOrderId: string) {
  const order = await getParentOrderWithRelations(parentOrderId);
  return order ? serializeOrder(order) : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await context.params;
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: {
        parentOrder: {
          select: {
            id: true,
            buyerId: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    if (user.role === UserRole.BUYER) {
      if (!user.buyerProfile || payment.parentOrder.buyerId !== user.buyerProfile.id) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }

    if (payment.status === PaymentStatus.PAID) {
      return NextResponse.json({
        success: true,
        reference,
        orderId: payment.parentOrderId,
        status: "PAID",
        verified: true,
        final: true,
        message: "Payment verified successfully",
        order: await buildOrderPayload(payment.parentOrderId),
      });
    }

    if (payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.CANCELLED) {
      return NextResponse.json({
        success: true,
        reference,
        orderId: payment.parentOrderId,
        status: payment.status,
        verified: false,
        final: true,
        message: payment.status === PaymentStatus.CANCELLED ? "Payment was cancelled" : "Payment failed",
        order: await buildOrderPayload(payment.parentOrderId),
      });
    }

    const verification = await verifyPaystackTransaction(reference);
    const paymentStatus = verification.status.toLowerCase();

    if (paymentStatus === "success") {
      const result = await finalizeSuccessfulPayment({
        reference,
        verification,
      });

      return NextResponse.json({
        success: true,
        reference,
        orderId: result.order.id,
        status: "PAID",
        verified: true,
        final: true,
        alreadyProcessed: result.alreadyProcessed,
        message: "Payment verified successfully",
        order: serializeOrder(result.order),
      });
    }

    if (isFailureStatus(paymentStatus)) {
      const normalizedStatus = paymentStatus === "abandoned" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
      await markPaymentVerificationState({
        reference,
        paymentStatus: normalizedStatus,
        rawVerifyResponse: verification,
      });

      return NextResponse.json({
        success: true,
        reference,
        orderId: payment.parentOrderId,
        status: normalizedStatus,
        verified: false,
        final: true,
        message: verification.gateway_response || verification.message || "Payment verification failed",
        order: await buildOrderPayload(payment.parentOrderId),
      });
    }

    const status =
      Date.now() - payment.createdAt.getTime() >= PENDING_TIMEOUT_MS
        ? "PENDING_TIMEOUT"
        : "PENDING";

    return NextResponse.json({
      success: true,
      reference,
      orderId: payment.parentOrderId,
      status,
      verified: false,
      final: false,
      message:
        verification.gateway_response ||
        verification.message ||
        (status === "PENDING_TIMEOUT"
          ? "Payment confirmation is taking longer than expected. Check again."
          : "Payment is still pending"),
    });
  } catch (error) {
    console.error("[PAYMENT_STATUS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch payment status" }, { status: 500 });
  }
}

