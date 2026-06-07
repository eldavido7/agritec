import { NextResponse } from "next/server";
import { PaymentStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  finalizeSuccessfulPayment,
  markPaymentVerificationState,
} from "@/lib/payment-order-utils";
import { serializeOrder } from "@/lib/marketplace-serializers";
import { verifyPaystackTransaction } from "@/lib/paystack";

const verifySchema = z.object({
  reference: z.string().trim().min(1, "Payment reference is required"),
});

function isPendingStatus(status: string) {
  return ["ongoing", "pending", "processing", "queued"].includes(status.toLowerCase());
}

function isFailureStatus(status: string) {
  return ["abandoned", "failed", "reversed"].includes(status.toLowerCase());
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const payload = verifySchema.parse(rawBody);

    const payment = await prisma.payment.findUnique({
      where: { reference: payload.reference },
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

    const verification = await verifyPaystackTransaction(payload.reference);
    const paymentStatus = verification.status.toLowerCase();

    if (paymentStatus === "success") {
      const result = await finalizeSuccessfulPayment({
        reference: payload.reference,
        verification,
      });

      return NextResponse.json({
        success: true,
        verified: true,
        alreadyProcessed: result.alreadyProcessed,
        paymentStatus: PaymentStatus.PAID,
        order: serializeOrder(result.order),
      });
    }

    if (isPendingStatus(paymentStatus)) {
      return NextResponse.json({
        success: true,
        verified: false,
        final: false,
        paymentStatus: verification.status,
        message: verification.gateway_response || verification.message || "Payment is still pending",
      });
    }

    if (isFailureStatus(paymentStatus)) {
      const normalizedStatus = paymentStatus === "abandoned" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
      await markPaymentVerificationState({
        reference: payload.reference,
        paymentStatus: normalizedStatus,
        rawVerifyResponse: verification,
      });

      return NextResponse.json(
        {
          success: false,
          verified: false,
          final: true,
          paymentStatus: verification.status,
          message: verification.gateway_response || verification.message || "Payment verification failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: false,
      final: false,
      paymentStatus: verification.status,
      message: verification.gateway_response || verification.message || "Payment status has not been finalized yet",
    });
  } catch (error) {
    console.error("[VERIFY_PAYSTACK_POST_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid verification payload" },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to verify payment";
    if (
      message === "PAYMENT_AMOUNT_MISMATCH" ||
      message === "PAYMENT_CURRENCY_MISMATCH" ||
      message === "PAYMENT_CUSTOMER_MISMATCH" ||
      message === "PAYMENT_REFERENCE_MISMATCH"
    ) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: "Failed to verify payment" }, { status: 500 });
  }
}
