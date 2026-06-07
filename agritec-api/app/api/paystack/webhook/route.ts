import { NextResponse } from "next/server";
import { finalizeSuccessfulPayment } from "@/lib/payment-order-utils";
import {
  completeWithdrawalTransferByReference,
  failWithdrawalTransferByReference,
} from "@/lib/payout-utils";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    reference?: string;
    transfer_code?: string | null;
    status?: string;
    amount?: number;
    currency?: string | null;
    paid_at?: string | null;
    customer?: { email?: string | null } | null;
    gateway_response?: string | null;
    reason?: string | null;
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ success: false, message: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as PaystackWebhookPayload;

    if (payload.event === "charge.success") {
      const reference = payload.data?.reference;
      if (!reference || payload.data?.status?.toLowerCase() !== "success" || typeof payload.data.amount !== "number") {
        return NextResponse.json({ success: false, message: "Invalid Paystack charge webhook payload" }, { status: 400 });
      }

      const result = await finalizeSuccessfulPayment({
        reference,
        verification: {
          reference,
          status: payload.data.status,
          amount: payload.data.amount,
          currency: payload.data.currency,
          paid_at: payload.data.paid_at,
          customer: payload.data.customer,
          ...payload.data,
        },
      });

      return NextResponse.json({
        success: true,
        processed: true,
        alreadyProcessed: result.alreadyProcessed,
        parentOrderId: result.order.id,
        paymentReference: reference,
      });
    }

    if (["transfer.success", "transfer.failed", "transfer.reversed"].includes(payload.event ?? "")) {
      const reference = payload.data?.reference ?? payload.data?.transfer_code;
      if (!reference || !payload.data?.status) {
        return NextResponse.json({ success: false, message: "Invalid Paystack transfer webhook payload" }, { status: 400 });
      }

      if (payload.event === "transfer.success") {
        const payout = await completeWithdrawalTransferByReference(reference, {
          reference,
          transfer_code: payload.data.transfer_code,
          amount: payload.data.amount ?? 0,
          currency: payload.data.currency,
          status: payload.data.status,
          gateway_response: payload.data.gateway_response,
          reason: payload.data.reason,
        });

        return NextResponse.json({
          success: true,
          processed: true,
          payoutId: payout.id,
          transferReference: reference,
        });
      }

      const payout = await failWithdrawalTransferByReference(reference, {
        reference,
        transfer_code: payload.data.transfer_code,
        amount: payload.data.amount ?? 0,
        currency: payload.data.currency,
        status: payload.data.status,
        gateway_response: payload.data.gateway_response,
        reason: payload.data.reason,
      });

      return NextResponse.json({
        success: true,
        processed: true,
        payoutId: payout.id,
        transferReference: reference,
      });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    console.error("[PAYSTACK_WEBHOOK_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to process Paystack webhook" }, { status: 500 });
  }
}
