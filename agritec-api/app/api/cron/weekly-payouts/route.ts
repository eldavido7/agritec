import { NextResponse } from "next/server";
import { approveWithdrawalRequest, getEligibleAutoPayoutSellerIds, requestSellerFullPayout } from "@/lib/payout-utils";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET_NOT_CONFIGURED");
  }

  const header = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerIds = await getEligibleAutoPayoutSellerIds();
    const results: Array<Record<string, unknown>> = [];

    for (const sellerId of sellerIds) {
      try {
        const payout = await requestSellerFullPayout({
          sellerId,
          trigger: "auto",
        });

        const approved = await approveWithdrawalRequest({
          withdrawalId: payout.id,
          adminId: null,
        });

        results.push({
          sellerId,
          withdrawalRequestId: approved.id,
          status: approved.status,
          success: true,
        });
      } catch (error) {
        results.push({
          sellerId,
          success: false,
          error: error instanceof Error ? error.message : "AUTO_PAYOUT_FAILED",
        });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error("[CRON_WEEKLY_PAYOUTS_POST_ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to run weekly payouts";
    if (message === "CRON_SECRET_NOT_CONFIGURED") {
      return NextResponse.json({ success: false, message: "CRON_SECRET is not configured" }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: "Failed to run weekly payouts" }, { status: 500 });
  }
}
