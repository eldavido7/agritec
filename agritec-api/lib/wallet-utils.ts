import {
  NotificationType,
  ParentOrderStatus,
  Prisma,
  SellerOrderGroupStatus,
  WalletTransactionType,
} from "@prisma/client";
import { reserveSequentialId } from "@/lib/id-sequence";
import { queueNotificationPush, shouldSendPushForNotificationType } from "@/lib/push-notifications";

type TxClient = Prisma.TransactionClient;

export function computeSellerEarnings(args: {
  productSubtotal: number;
  discountTotal: number;
  commissionRateBps: number;
}) {
  const netSales = Math.max(0, args.productSubtotal - args.discountTotal);
  const platformCommissionAmount = Math.floor((netSales * args.commissionRateBps) / 10000);
  const sellerEarningsAmount = Math.max(0, netSales - platformCommissionAmount);

  return {
    netSales,
    platformCommissionAmount,
    sellerEarningsAmount,
  };
}

export async function getCommissionRateBps(tx: TxClient) {
  const settings = await tx.commissionSettings.findUnique({ where: { id: "commission" } });
  return settings?.commissionRateBps ?? 0;
}

export async function getOrCreateSellerWallet(tx: TxClient, sellerId: string) {
  const existing = await tx.sellerWallet.findUnique({ where: { sellerId } });
  if (existing) {
    return existing;
  }

  const walletId = await reserveSequentialId(tx, "seller_wallet");
  return tx.sellerWallet.create({
    data: {
      id: walletId,
      sellerId,
    },
  });
}

export async function createWalletTransaction(tx: TxClient, args: {
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  pendingBalanceAfter: number;
  availableBalanceAfter: number;
  processingBalanceAfter: number;
  withdrawnBalanceAfter: number;
  description?: string | null;
  parentOrderId?: string | null;
  sellerOrderGroupId?: string | null;
  withdrawalRequestId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const transactionId = await reserveSequentialId(tx, "wallet_transaction");
  return tx.walletTransaction.create({
    data: {
      id: transactionId,
      walletId: args.walletId,
      type: args.type,
      amount: args.amount,
      pendingBalanceAfter: args.pendingBalanceAfter,
      availableBalanceAfter: args.availableBalanceAfter,
      processingBalanceAfter: args.processingBalanceAfter,
      withdrawnBalanceAfter: args.withdrawnBalanceAfter,
      description: args.description ?? null,
      parentOrderId: args.parentOrderId ?? null,
      sellerOrderGroupId: args.sellerOrderGroupId ?? null,
      withdrawalRequestId: args.withdrawalRequestId ?? null,
      idempotencyKey: args.idempotencyKey ?? null,
      metadata: args.metadata,
    },
  });
}

export async function createNotification(tx: TxClient, args: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const notificationId = await reserveSequentialId(tx, "notification");
  const notification = await tx.notification.create({
    data: {
      id: notificationId,
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      metadata: args.metadata,
    },
  });

  if (shouldSendPushForNotificationType(args.type)) {
    queueNotificationPush(notification.id);
  }

  return notification;
}

export async function createAuditLog(tx: TxClient, args: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const auditLogId = await reserveSequentialId(tx, "audit_log");
  return tx.auditLog.create({
    data: {
      id: auditLogId,
      adminId: args.adminId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId ?? null,
      metadata: args.metadata,
    },
  });
}

export async function syncParentOrderStatusFromGroups(tx: TxClient, parentOrderId: string) {
  const groups = await tx.sellerOrderGroup.findMany({
    where: { parentOrderId },
    select: { status: true },
  });

  if (groups.length === 0) return;

  const statuses = groups.map((group) => group.status);
  let nextStatus: ParentOrderStatus | null = null;

  if (statuses.every((status) => status === SellerOrderGroupStatus.REFUNDED)) {
    nextStatus = ParentOrderStatus.REFUNDED;
  } else if (
    statuses.every(
      (status) =>
        status === SellerOrderGroupStatus.CANCELLED || status === SellerOrderGroupStatus.REFUNDED,
    )
  ) {
    nextStatus = ParentOrderStatus.CANCELLED;
  } else if (statuses.every((status) => status === SellerOrderGroupStatus.DELIVERED)) {
    nextStatus = ParentOrderStatus.FULFILLED;
  } else if (
    statuses.some(
      (status) => status === SellerOrderGroupStatus.DELIVERED || status === SellerOrderGroupStatus.SHIPPED,
    )
  ) {
    nextStatus = ParentOrderStatus.PARTIALLY_FULFILLED;
  }

  if (nextStatus) {
    await tx.parentOrder.update({
      where: { id: parentOrderId },
      data: { status: nextStatus },
    });
  }
}
