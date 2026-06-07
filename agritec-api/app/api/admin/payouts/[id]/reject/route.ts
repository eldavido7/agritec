import { NextResponse } from "next/server";
import { NotificationType, UserRole, WalletTransactionType, WithdrawalStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createAuditLog, createNotification, createWalletTransaction } from "@/lib/wallet-utils";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

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
    const payout = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id },
        include: {
          seller: { include: { user: true } },
          wallet: true,
        },
      });

      if (!withdrawal) throw new Error("WITHDRAWAL_NOT_FOUND");
      if (
        withdrawal.status !== WithdrawalStatus.PENDING &&
        withdrawal.status !== WithdrawalStatus.APPROVED &&
        withdrawal.status !== WithdrawalStatus.PROCESSING
      ) {
        throw new Error("WITHDRAWAL_NOT_REJECTABLE");
      }

      const updatedWallet = await tx.sellerWallet.update({
        where: { id: withdrawal.walletId },
        data: {
          processingBalance: {
            decrement: withdrawal.amount,
          },
          availableBalance: {
            increment: withdrawal.amount,
          },
        },
      });

      await createWalletTransaction(tx, {
        walletId: withdrawal.walletId,
        type: WalletTransactionType.PAYOUT_FAILED_RESTORE,
        amount: withdrawal.amount,
        pendingBalanceAfter: updatedWallet.pendingBalance,
        availableBalanceAfter: updatedWallet.availableBalance,
        processingBalanceAfter: updatedWallet.processingBalance,
        withdrawnBalanceAfter: updatedWallet.withdrawnBalance,
        description: `Rejected withdrawal ${withdrawal.id}`,
        withdrawalRequestId: withdrawal.id,
        idempotencyKey: `withdrawal:${withdrawal.id}:rejected-restore`,
        metadata: toJsonValue({ rejectedByAdminId: user.id }),
      });

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          approvedByAdminId: user.id,
          failureReason: "Payout request was rejected by admin.",
          processedAt: new Date(),
        },
        include: {
          seller: { include: { user: true } },
          wallet: true,
          bankAccount: true,
        },
      });

      await createAuditLog(tx, {
        adminId: user.id,
        action: "withdrawal.reject",
        targetType: "withdrawalRequest",
        targetId: updated.id,
      });

      await createNotification(tx, {
        userId: updated.seller.userId,
        type: NotificationType.PAYOUT,
        title: "Payout rejected",
        body: "Your payout request was rejected and the funds were returned to your available balance.",
        targetType: "withdrawalRequest",
        targetId: updated.id,
      });

      return updated;
    });

    return NextResponse.json({ success: true, message: "Payout rejected successfully", payout });
  } catch (error) {
    console.error("[ADMIN_PAYOUT_REJECT_POST_ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to reject payout";
    if (message === "WITHDRAWAL_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Withdrawal not found." }, { status: 404 });
    }
    if (message === "WITHDRAWAL_NOT_REJECTABLE") {
      return NextResponse.json({ success: false, message: "Withdrawal cannot be rejected in its current state." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to reject payout" }, { status: 500 });
  }
}
