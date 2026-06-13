import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  finalizeSuccessfulPayment,
  markPaymentVerificationState,
} from "@/lib/payment-order-utils";
import { verifyPaystackTransaction } from "@/lib/paystack";

const ANDROID_PACKAGE_NAME = "com.agritec.marketplace";

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

function buildAndroidIntentUrl(url: URL) {
  const query = url.search ? url.search : "";
  return `intent://payment/callback${query}#Intent;scheme=agritec;package=${ANDROID_PACKAGE_NAME};end`;
}

function buildDeepLinkHtml(url: URL) {
  const destination = url.toString();
  const androidIntent = buildAndroidIntentUrl(url);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to Agritec</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f8f5; color: #163020; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
      .card { background: #fff; border-radius: 18px; padding: 24px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      .spinner { width: 38px; height: 38px; margin: 0 auto 16px; border: 4px solid #dceadf; border-top-color: #136A43; border-radius: 50%; animation: spin 0.9s linear infinite; }
      a { color: #136A43; font-weight: 600; text-decoration: none; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h2>Returning to Agritec</h2>
      <p>Please wait while we bring you back to the app.</p>
      <p><a href="${destination}">Open Agritec</a></p>
    </div>
    <script>
      (function () {
        var customScheme = ${JSON.stringify(destination)};
        var androidIntent = ${JSON.stringify(androidIntent)};
        var opened = false;

        function tryOpen(url) {
          window.location.href = url;
        }

        tryOpen(customScheme);
        setTimeout(function () {
          if (opened) return;
          tryOpen(androidIntent);
        }, 500);
      })();
    </script>
  </body>
</html>`;
}

function deepLinkResponse(url: URL) {
  return new Response(buildDeepLinkHtml(url), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  if (!reference) {
    return deepLinkResponse(buildMobileCallbackUrl({ status: "FAILED" }));
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
      return deepLinkResponse(
        buildMobileCallbackUrl({ reference, status: "FAILED" })
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      return deepLinkResponse(
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

      return deepLinkResponse(
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

      return deepLinkResponse(
        buildMobileCallbackUrl({
          reference,
          orderId: payment.parentOrderId,
          status: normalizedStatus,
        })
      );
    }

    return deepLinkResponse(
      buildMobileCallbackUrl({
        reference,
        orderId: payment.parentOrderId,
        status: "PENDING",
      })
    );
  } catch (error) {
    console.error("[PAYSTACK_CALLBACK_GET_ERROR]", error);
    return deepLinkResponse(
      buildMobileCallbackUrl({
        reference,
        status: "FAILED",
      })
    );
  }
}
