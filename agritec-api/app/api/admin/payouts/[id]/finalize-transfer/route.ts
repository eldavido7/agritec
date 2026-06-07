import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { finalizeOtpWithdrawalTransfer } from "@/lib/payout-utils";

const otpSchema = z.object({
  otp: z.string().trim().min(1),
});

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
    const payload = otpSchema.parse(await request.json());
    const payout = await finalizeOtpWithdrawalTransfer({
      withdrawalId: id,
      adminId: user.id,
      otp: payload.otp,
    });

    return NextResponse.json({ success: true, message: "Transfer finalized successfully", payout });
  } catch (error) {
    console.error("[ADMIN_PAYOUT_FINALIZE_TRANSFER_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "OTP is required" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to finalize transfer";
    if (message === "WITHDRAWAL_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Withdrawal not found." }, { status: 404 });
    }
    if (message === "TRANSFER_CODE_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Transfer code not found." }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to finalize transfer" }, { status: 500 });
  }
}
