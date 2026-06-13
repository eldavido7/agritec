import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  finalizeSuccessfulPayment,
  markPaymentVerificationState,
} from "@/lib/payment-order-utils";
import { verifyPaystackTransaction } from "@/lib/paystack";

function isFailureStatus(status: string) {
  return ["abandoned", "failed", "reversed"].includes(status.toLowerCase());
}

function buildMobileCallbackUrl(args: {
  reference?: string | null;
  orderId?: string | null;
  status: string;
}) {
  const url = new URL("agritec://payment/callback");
  if (args.reference) {
    url.searchParams.set("reference", args.reference);
  }
  if (args.orderId) {
    url.searchParams.set("orderId", args.orderId);
  }
  url.searchParams.set("status", args.status);
  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(buildMobileCallbackUrl({ status: "FAILED" }));
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { reference },
      select: {
        id: true,
        parentOrderId: true,
        status: true,
      },
    });

    if (!payment) {
      return NextResponse.redirect(
        buildMobileCallbackUrl({ reference, status: "FAILED" })
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      return NextResponse.redirect(
        buildMobileCallbackUrl({
          reference,
          orderId: payment.parentOrderId,
          status: "PAID",
        })
      );
    }

    const verification = await verifyPaystackTransaction(reference);
    const paymentStatus = verification.status.toLowerCase();

    if (paymentStatus === "success") {
      const result = await finalizeSuccessfulPayment({
        reference,
        verification,
      });

      return NextResponse.redirect(
        buildMobileCallbackUrl({
          reference,
          orderId: result.order.id,
          status: "PAID",
        })
      );
    }

    if (isFailureStatus(paymentStatus)) {
      const normalizedStatus = paymentStatus === "abandoned" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
      await markPaymentVerificationState({
        reference,
        paymentStatus: normalizedStatus,
        rawVerifyResponse: verification,
      });

      return NextResponse.redirect(
        buildMobileCallbackUrl({
          reference,
          orderId: payment.parentOrderId,
          status: normalizedStatus,
        })
      );
    }

    return NextResponse.redirect(
      buildMobileCallbackUrl({
        reference,
        orderId: payment.parentOrderId,
        status: "PENDING",
      })
    );
  } catch (error) {
    console.error("[PAYSTACK_CALLBACK_GET_ERROR]", error);
    return NextResponse.redirect(
      buildMobileCallbackUrl({
        reference,
        status: "FAILED",
      })
    );
  }
}

