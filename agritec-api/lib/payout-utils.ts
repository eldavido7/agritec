import {
  NotificationType,
  Prisma,
  UserRole,
  WalletTransactionType,
  WithdrawalStatus,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { reserveSequentialId } from "@/lib/id-sequence";
import {
  createAuditLog,
  createNotification,
  createWalletTransaction,
  getOrCreateSellerWallet,
} from "@/lib/wallet-utils";
import { sendAdminPayoutRequestAlertEmail } from "@/lib/email";
import {
  finalizePaystackTransfer,
  initiatePaystackTransfer,
  PaystackTransfer,
  verifyPaystackTransfer,
} from "@/lib/paystack";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toTransferSubunit(amount: number) {
  return amount * 100;
}

function generateWithdrawalReference(withdrawalId: string) {
  return `agt-wdr-${withdrawalId}-${Date.now()}`;
}

function getTransferFailureMessage(transfer: PaystackTransfer) {
  return transfer.gateway_response || transfer.reason || transfer.status || "Transfer failed";
}

function isTransferProcessingStatus(status: string) {
  const normalized = status.toLowerCase();
  return ["success", "pending", "processing", "received", "queued"].includes(normalized);
}

function isTransferFailedStatus(status: string) {
  const normalized = status.toLowerCase();
  return ["failed", "reversed", "rejected"].includes(normalized);
}

function isTransferOtpStatus(status: string) {
  return status.toLowerCase() === "otp";
}

async function sendAdminPayoutRequestEmails(args: {
  withdrawalId: string;
  sellerName: string;
  farmName: string;
  amount: number;
  trigger: "manual" | "auto";
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
    },
    select: {
      email: true,
      fullName: true,
    },
  });

  await Promise.all(
    admins
      .filter((admin) => Boolean(admin.email))
      .map(async (admin) => {
        try {
          await sendAdminPayoutRequestAlertEmail({
            toEmail: admin.email,
            adminName: admin.fullName,
            sellerName: args.sellerName,
            farmName: args.farmName,
            amount: args.amount,
            withdrawalRequestId: args.withdrawalId,
            trigger: args.trigger,
          });
        } catch (error) {
          console.error("[PAYOUT_REQUEST_ADMIN_EMAIL_ERROR]", {
            withdrawalId: args.withdrawalId,
            adminEmail: admin.email,
            error,
          });
        }
      })
  );
}

async function restoreFailedWithdrawalInTx(
  tx: Prisma.TransactionClient,
  args: {
    withdrawalId: string;
    paystackTransferStatus?: string | null;
    failureReason: string;
    rawResponse?: unknown;
    finalStatus?: WithdrawalStatus;
  }
) {
  const withdrawal = await tx.withdrawalRequest.findUnique({
    where: { id: args.withdrawalId },
    include: {
      wallet: true,
      seller: { include: { user: true } },
    },
  });

  if (!withdrawal) {
    throw new Error("WITHDRAWAL_NOT_FOUND");
  }

  if (withdrawal.status === WithdrawalStatus.COMPLETED || withdrawal.status === WithdrawalStatus.FAILED || withdrawal.status === WithdrawalStatus.REJECTED) {
    return withdrawal;
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
    description: `Restored payout funds for withdrawal ${withdrawal.id}`,
    withdrawalRequestId: withdrawal.id,
    idempotencyKey: `withdrawal:${withdrawal.id}:failed-restore`,
    metadata: toJsonValue({
      paystackTransferStatus: args.paystackTransferStatus ?? null,
      failureReason: args.failureReason,
    }),
  });

  const updatedWithdrawal = await tx.withdrawalRequest.update({
    where: { id: withdrawal.id },
    data: {
      status: args.finalStatus ?? WithdrawalStatus.FAILED,
      paystackTransferStatus: args.paystackTransferStatus ?? withdrawal.paystackTransferStatus,
      failureReason: args.failureReason,
      rawVerifyResponse: args.rawResponse ? toJsonValue(args.rawResponse) : withdrawal.rawVerifyResponse ?? undefined,
      processedAt: new Date(),
    },
    include: {
      wallet: true,
      seller: { include: { user: true } },
      bankAccount: true,
    },
  });

  await createNotification(tx, {
    userId: updatedWithdrawal.seller.userId,
    type: NotificationType.PAYOUT,
    title: "Payout failed",
    body: args.failureReason,
    targetType: "withdrawalRequest",
    targetId: updatedWithdrawal.id,
    metadata: toJsonValue({
      withdrawalRequestId: updatedWithdrawal.id,
      amount: updatedWithdrawal.amount,
    }),
  });

  return updatedWithdrawal;
}

export async function requestSellerFullPayout(args: {
  sellerId: string;
  trigger: "manual" | "auto";
}) {
  return prisma.$transaction(async (tx) => {
    const seller = await tx.sellerProfile.findUnique({
      where: { id: args.sellerId },
      include: {
        user: true,
        bankAccount: true,
        wallet: true,
      },
    });

    if (!seller) {
      throw new Error("SELLER_NOT_FOUND");
    }

    if (!seller.bankAccount || !seller.bankAccount.isVerified || !seller.bankAccount.paystackRecipientCode) {
      throw new Error("BANK_ACCOUNT_NOT_VERIFIED_FOR_PAYOUTS");
    }

    const wallet = seller.wallet ?? (await getOrCreateSellerWallet(tx, seller.id));

    const activeWithdrawal = await tx.withdrawalRequest.findFirst({
      where: {
        sellerId: seller.id,
        status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING] },
      },
    });

    if (activeWithdrawal || wallet.processingBalance > 0) {
      throw new Error("PAYOUT_ALREADY_IN_PROGRESS");
    }

    if (wallet.availableBalance <= 0) {
      throw new Error("NO_AVAILABLE_BALANCE_FOR_PAYOUT");
    }

    const withdrawalId = await reserveSequentialId(tx, "withdrawal_request");
    const updatedWallet = await tx.sellerWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: {
          decrement: wallet.availableBalance,
        },
        processingBalance: {
          increment: wallet.availableBalance,
        },
      },
    });

    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        id: withdrawalId,
        sellerId: seller.id,
        walletId: wallet.id,
        bankAccountId: seller.bankAccount.id,
        amount: wallet.availableBalance,
        status: WithdrawalStatus.PENDING,
        idempotencyKey: `${args.trigger}:${seller.id}:${withdrawalId}`,
      },
      include: {
        seller: { include: { user: true } },
        wallet: true,
        bankAccount: true,
      },
    });

    await createWalletTransaction(tx, {
      walletId: wallet.id,
      type: WalletTransactionType.PAYOUT_REQUESTED,
      amount: wallet.availableBalance,
      pendingBalanceAfter: updatedWallet.pendingBalance,
      availableBalanceAfter: updatedWallet.availableBalance,
      processingBalanceAfter: updatedWallet.processingBalance,
      withdrawnBalanceAfter: updatedWallet.withdrawnBalance,
      description: args.trigger === "auto" ? "Automatic weekly payout request" : "Manual payout request",
      withdrawalRequestId: withdrawal.id,
      idempotencyKey: `withdrawal:${withdrawal.id}:requested`,
      metadata: toJsonValue({ trigger: args.trigger }),
    });

    await createNotification(tx, {
      userId: seller.userId,
      type: NotificationType.PAYOUT,
      title: "Payout request submitted",
      body:
        args.trigger === "auto"
          ? `An automatic payout request for NGN ${withdrawal.amount.toLocaleString()} has been submitted and is awaiting admin review.`
          : `Your payout request for NGN ${withdrawal.amount.toLocaleString()} has been submitted and is awaiting admin review.`,
      targetType: "withdrawalRequest",
      targetId: withdrawal.id,
      metadata: toJsonValue({
        withdrawalRequestId: withdrawal.id,
        amount: withdrawal.amount,
        trigger: args.trigger,
      }),
    });

    const admins = await tx.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification(tx, {
        userId: admin.id,
        type: NotificationType.PAYOUT,
        title: args.trigger === "auto" ? "Automatic payout request" : "New payout request",
        body: `${seller.farmName} requested payout of NGN ${withdrawal.amount.toLocaleString()}.`,
        targetType: "withdrawalRequest",
        targetId: withdrawal.id,
        metadata: toJsonValue({
          withdrawalRequestId: withdrawal.id,
          sellerId: seller.id,
          sellerUserId: seller.userId,
          amount: withdrawal.amount,
          trigger: args.trigger,
        }),
      });
    }

    return withdrawal;
  }).then(async (withdrawal) => {
    await sendAdminPayoutRequestEmails({
      withdrawalId: withdrawal.id,
      sellerName: withdrawal.seller.user.fullName,
      farmName: withdrawal.seller.farmName,
      amount: withdrawal.amount,
      trigger: args.trigger,
    });

    return withdrawal;
  });
}

export async function approveWithdrawalRequest(args: {
  withdrawalId: string;
  adminId?: string | null;
}) {
  const locked = await prisma.withdrawalRequest.updateMany({
    where: {
      id: args.withdrawalId,
      status: WithdrawalStatus.PENDING,
    },
    data: {
      status: WithdrawalStatus.APPROVED,
      approvedByAdminId: args.adminId ?? null,
      approvedAt: new Date(),
    },
  });

  if (locked.count === 0) {
    throw new Error("WITHDRAWAL_NOT_PENDING");
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: args.withdrawalId },
    include: {
      seller: { include: { user: true } },
      wallet: true,
      bankAccount: true,
    },
  });

  if (!withdrawal) {
    throw new Error("WITHDRAWAL_NOT_FOUND");
  }

  if (!withdrawal.bankAccount.isVerified || !withdrawal.bankAccount.paystackRecipientCode) {
    await prisma.$transaction(async (tx) => {
      const restored = await restoreFailedWithdrawalInTx(tx, {
        withdrawalId: withdrawal.id,
        failureReason: "Please verify your bank account before receiving payouts.",
        finalStatus: WithdrawalStatus.REJECTED,
      });

      if (args.adminId) {
        await createAuditLog(tx, {
          adminId: args.adminId,
          action: "withdrawal.reject.missing_bank_account",
          targetType: "withdrawalRequest",
          targetId: restored.id,
        });
      }
    });
    throw new Error("BANK_ACCOUNT_NOT_VERIFIED_FOR_PAYOUTS");
  }

  const transferReference = withdrawal.paystackTransferReference ?? generateWithdrawalReference(withdrawal.id);

  try {
    const transfer = await initiatePaystackTransfer({
      recipientCode: withdrawal.bankAccount.paystackRecipientCode,
      amountInSubunit: toTransferSubunit(withdrawal.amount),
      reason: `AgriTec seller payout ${withdrawal.id}`,
      reference: transferReference,
      currencyCode: "NGN",
    });

    return prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: isTransferOtpStatus(transfer.status) ? WithdrawalStatus.APPROVED : WithdrawalStatus.PROCESSING,
          paystackTransferCode: transfer.transfer_code ?? withdrawal.paystackTransferCode,
          paystackTransferReference: transfer.reference,
          paystackTransferStatus: transfer.status,
          rawTransferResponse: toJsonValue(transfer),
          processedAt: isTransferOtpStatus(transfer.status) ? null : new Date(),
          failureReason: isTransferOtpStatus(transfer.status) ? "Transfer requires OTP finalization." : null,
        },
        include: {
          seller: { include: { user: true } },
          wallet: true,
          bankAccount: true,
        },
      });

      if (args.adminId) {
        await createAuditLog(tx, {
          adminId: args.adminId,
          action: isTransferOtpStatus(transfer.status) ? "withdrawal.transfer.otp_required" : "withdrawal.transfer.initiated",
          targetType: "withdrawalRequest",
          targetId: updated.id,
          metadata: toJsonValue({
            paystackTransferReference: updated.paystackTransferReference,
            paystackTransferCode: updated.paystackTransferCode,
            paystackTransferStatus: updated.paystackTransferStatus,
          }),
        });
      }

      await createNotification(tx, {
        userId: updated.seller.userId,
        type: NotificationType.PAYOUT,
        title: isTransferOtpStatus(transfer.status) ? "Payout awaiting finalization" : "Payout is processing",
        body: isTransferOtpStatus(transfer.status)
          ? `Your payout of NGN ${updated.amount.toLocaleString()} requires final transfer confirmation.`
          : `Your payout of NGN ${updated.amount.toLocaleString()} is now processing.`,
        targetType: "withdrawalRequest",
        targetId: updated.id,
        metadata: toJsonValue({
          withdrawalRequestId: updated.id,
          paystackTransferReference: updated.paystackTransferReference,
        }),
      });

      return updated;
    });
  } catch (error) {
    return prisma.$transaction(async (tx) => {
      const updated = await restoreFailedWithdrawalInTx(tx, {
        withdrawalId: withdrawal.id,
        paystackTransferStatus: "failed",
        failureReason: error instanceof Error ? error.message : "Transfer initiation failed",
        rawResponse: error instanceof Error ? { message: error.message } : { error: String(error) },
      });

      if (args.adminId) {
        await createAuditLog(tx, {
          adminId: args.adminId,
          action: "withdrawal.transfer.failed",
          targetType: "withdrawalRequest",
          targetId: updated.id,
          metadata: toJsonValue({ reason: updated.failureReason }),
        });
      }

      return updated;
    });
  }
}

export async function finalizeOtpWithdrawalTransfer(args: {
  withdrawalId: string;
  adminId?: string | null;
  otp: string;
}) {
  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: args.withdrawalId },
    include: {
      seller: { include: { user: true } },
      wallet: true,
      bankAccount: true,
    },
  });

  if (!withdrawal) {
    throw new Error("WITHDRAWAL_NOT_FOUND");
  }

  if (!withdrawal.paystackTransferCode) {
    throw new Error("TRANSFER_CODE_NOT_FOUND");
  }

  const transfer = await finalizePaystackTransfer({
    transferCode: withdrawal.paystackTransferCode,
    otp: args.otp,
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: {
        status: WithdrawalStatus.PROCESSING,
        paystackTransferStatus: transfer.status,
        rawVerifyResponse: toJsonValue(transfer),
        processedAt: new Date(),
        failureReason: null,
      },
      include: {
        seller: { include: { user: true } },
        wallet: true,
        bankAccount: true,
      },
    });

    if (args.adminId) {
      await createAuditLog(tx, {
        adminId: args.adminId,
        action: "withdrawal.transfer.finalized",
        targetType: "withdrawalRequest",
        targetId: updated.id,
        metadata: toJsonValue({
          paystackTransferReference: updated.paystackTransferReference,
          paystackTransferCode: updated.paystackTransferCode,
        }),
      });
    }

    await createNotification(tx, {
      userId: updated.seller.userId,
      type: NotificationType.PAYOUT,
      title: "Payout is processing",
      body: `Your payout of NGN ${updated.amount.toLocaleString()} is now processing.`,
      targetType: "withdrawalRequest",
      targetId: updated.id,
      metadata: toJsonValue({ withdrawalRequestId: updated.id }),
    });

    return updated;
  });
}

export async function completeWithdrawalTransferByReference(reference: string, transfer: PaystackTransfer) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findFirst({
      where: {
        OR: [{ paystackTransferReference: reference }, { paystackTransferCode: reference }],
      },
      include: {
        wallet: true,
        seller: { include: { user: true } },
      },
    });

    if (!withdrawal) {
      throw new Error("WITHDRAWAL_NOT_FOUND");
    }

    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      return withdrawal;
    }

    const updatedWallet = await tx.sellerWallet.update({
      where: { id: withdrawal.walletId },
      data: {
        processingBalance: {
          decrement: withdrawal.amount,
        },
        withdrawnBalance: {
          increment: withdrawal.amount,
        },
      },
    });

    await createWalletTransaction(tx, {
      walletId: withdrawal.walletId,
      type: WalletTransactionType.PAYOUT_COMPLETED,
      amount: withdrawal.amount,
      pendingBalanceAfter: updatedWallet.pendingBalance,
      availableBalanceAfter: updatedWallet.availableBalance,
      processingBalanceAfter: updatedWallet.processingBalance,
      withdrawnBalanceAfter: updatedWallet.withdrawnBalance,
      description: `Completed payout for withdrawal ${withdrawal.id}`,
      withdrawalRequestId: withdrawal.id,
      idempotencyKey: `withdrawal:${withdrawal.id}:completed`,
      metadata: toJsonValue({
        paystackTransferReference: withdrawal.paystackTransferReference,
        paystackTransferCode: withdrawal.paystackTransferCode,
      }),
    });

    const updatedWithdrawal = await tx.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: {
        status: WithdrawalStatus.COMPLETED,
        paystackTransferStatus: transfer.status,
        rawVerifyResponse: toJsonValue(transfer),
        processedAt: new Date(),
        completedAt: new Date(),
        failureReason: null,
      },
      include: {
        seller: { include: { user: true } },
        wallet: true,
        bankAccount: true,
      },
    });

    await createNotification(tx, {
      userId: updatedWithdrawal.seller.userId,
      type: NotificationType.PAYOUT,
      title: "Payout completed",
      body: `Your payout of NGN ${updatedWithdrawal.amount.toLocaleString()} has been completed.`,
      targetType: "withdrawalRequest",
      targetId: updatedWithdrawal.id,
      metadata: toJsonValue({ withdrawalRequestId: updatedWithdrawal.id }),
    });

    return updatedWithdrawal;
  });
}

export async function failWithdrawalTransferByReference(reference: string, transfer: PaystackTransfer) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findFirst({
      where: {
        OR: [{ paystackTransferReference: reference }, { paystackTransferCode: reference }],
      },
    });

    if (!withdrawal) {
      throw new Error("WITHDRAWAL_NOT_FOUND");
    }

    return restoreFailedWithdrawalInTx(tx, {
      withdrawalId: withdrawal.id,
      paystackTransferStatus: transfer.status,
      failureReason: getTransferFailureMessage(transfer),
      rawResponse: transfer,
      finalStatus: WithdrawalStatus.FAILED,
    });
  });
}

export async function verifyAndSyncWithdrawalTransfer(reference: string) {
  const transfer = await verifyPaystackTransfer(reference);

  if (isTransferFailedStatus(transfer.status)) {
    const withdrawal = await failWithdrawalTransferByReference(reference, transfer);
    return { final: true, success: false, transfer, withdrawal };
  }

  if (isTransferProcessingStatus(transfer.status)) {
    if (transfer.status.toLowerCase() === "success") {
      const withdrawal = await completeWithdrawalTransferByReference(reference, transfer);
      return { final: true, success: true, transfer, withdrawal };
    }

    return { final: false, success: false, transfer, withdrawal: null };
  }

  if (isTransferOtpStatus(transfer.status)) {
    return { final: false, success: false, transfer, withdrawal: null };
  }

  return { final: false, success: false, transfer, withdrawal: null };
}

export async function getEligibleAutoPayoutSellerIds() {
  const threshold = (await prisma.payoutSettings.findUnique({ where: { id: "payout" } }))?.autoPayoutThreshold ?? 20000;

  const sellers = await prisma.sellerProfile.findMany({
    where: {
      autoPayoutEnabled: true,
      bankAccount: {
        is: {
          isVerified: true,
          paystackRecipientCode: { not: null },
        },
      },
      wallet: {
        is: {
          availableBalance: { gte: threshold },
          processingBalance: 0,
        },
      },
    },
    select: { id: true },
  });

  return sellers.map((seller) => seller.id);
}
