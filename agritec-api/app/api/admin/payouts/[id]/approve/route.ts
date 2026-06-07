import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { approveWithdrawalRequest } from "@/lib/payout-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payout = await approveWithdrawalRequest({
      withdrawalId: id,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Payout approval processed successfully",
      payout,
    });
  } catch (error) {
    console.error("[ADMIN_PAYOUT_APPROVE_POST_ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to approve payout";
    switch (message) {
      case "WITHDRAWAL_NOT_PENDING":
        return NextResponse.json({ success: false, message: "Withdrawal is not pending." }, { status: 409 });
      case "WITHDRAWAL_NOT_FOUND":
        return NextResponse.json({ success: false, message: "Withdrawal not found." }, { status: 404 });
      case "BANK_ACCOUNT_NOT_VERIFIED_FOR_PAYOUTS":
        return NextResponse.json(
          { success: false, message: "Please verify your bank account before receiving payouts." },
          { status: 400 }
        );
      default:
        return NextResponse.json({ success: false, message: "Failed to approve payout" }, { status: 500 });
    }
  }
}
