import {
  InventoryMovementType,
  NotificationType,
  Prisma,
  SellerOrderGroupStatus,
  WalletTransactionType,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { reserveSequentialId } from "@/lib/id-sequence";
import {
  createAuditLog,
  createNotification,
  createWalletTransaction,
  getOrCreateSellerWallet,
  syncParentOrderStatusFromGroups,
} from "@/lib/wallet-utils";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function statusLabel(status: SellerOrderGroupStatus) {
  switch (status) {
    case SellerOrderGroupStatus.PENDING:
      return "Pending";
    case SellerOrderGroupStatus.CONFIRMED:
      return "Confirmed";
    case SellerOrderGroupStatus.PROCESSING:
      return "Processing";
    case SellerOrderGroupStatus.SHIPPED:
      return "Shipped";
    case SellerOrderGroupStatus.DELIVERED:
      return "Delivered";
    case SellerOrderGroupStatus.CANCELLED:
      return "Cancelled";
    case SellerOrderGroupStatus.REFUNDED:
      return "Refunded";
    default:
      return status;
  }
}

async function notifyStatusChange(tx: Prisma.TransactionClient, args: {
  parentOrderId: string;
  sellerOrderGroupId: string;
  sellerUserId: string;
  buyerUserId: string;
  nextStatus: SellerOrderGroupStatus;
  sellerName: string;
  farmName: string;
}) {
  const readableStatus = statusLabel(args.nextStatus);

  await createNotification(tx, {
    userId: args.sellerUserId,
    type: NotificationType.ORDER,
    title: `Order group ${readableStatus}`,
    body: `Admin updated order group ${args.sellerOrderGroupId} from ${args.farmName} to ${readableStatus}.`,
    targetType: "sellerOrderGroup",
    targetId: args.sellerOrderGroupId,
    metadata: toJsonValue({
      parentOrderId: args.parentOrderId,
      sellerOrderGroupId: args.sellerOrderGroupId,
      status: args.nextStatus,
    }),
  });

  await createNotification(tx, {
    userId: args.buyerUserId,
    type: NotificationType.ORDER,
    title: `Order update: ${readableStatus}`,
    body: `${args.farmName} is now ${readableStatus.toLowerCase()} for order group ${args.sellerOrderGroupId}.`,
    targetType: "parentOrder",
    targetId: args.parentOrderId,
    metadata: toJsonValue({
      parentOrderId: args.parentOrderId,
      sellerOrderGroupId: args.sellerOrderGroupId,
      sellerName: args.sellerName,
      farmName: args.farmName,
      status: args.nextStatus,
    }),
  });
}

export async function releaseSellerGroupEarnings(tx: Prisma.TransactionClient, sellerOrderGroupId: string) {
  const group = await tx.sellerOrderGroup.findUnique({
    where: { id: sellerOrderGroupId },
    include: {
      seller: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("SELLER_ORDER_GROUP_NOT_FOUND");
  }

  const wallet = await getOrCreateSellerWallet(tx, group.sellerId);
  const releaseKey = `seller-group:${group.id}:release`;
  const existingRelease = await tx.walletTransaction.findUnique({ where: { idempotencyKey: releaseKey } });
  if (existingRelease) {
    return group;
  }

  const updatedWallet = await tx.sellerWallet.update({
    where: { id: wallet.id },
    data: {
      pendingBalance: {
        decrement: group.sellerEarningsAmount,
      },
      availableBalance: {
        increment: group.sellerEarningsAmount,
      },
    },
  });

  await createWalletTransaction(tx, {
    walletId: wallet.id,
    type: WalletTransactionType.ORDER_AVAILABLE_RELEASE,
    amount: group.sellerEarningsAmount,
    pendingBalanceAfter: updatedWallet.pendingBalance,
    availableBalanceAfter: updatedWallet.availableBalance,
    processingBalanceAfter: updatedWallet.processingBalance,
    withdrawnBalanceAfter: updatedWallet.withdrawnBalance,
    description: `Released seller earnings for order group ${group.id}`,
    parentOrderId: group.parentOrderId,
    sellerOrderGroupId: group.id,
    idempotencyKey: releaseKey,
    metadata: toJsonValue({
      sellerEarningsAmount: group.sellerEarningsAmount,
    }),
  });

  await createNotification(tx, {
    userId: group.seller.userId,
    type: NotificationType.PAYOUT,
    title: "Earnings released",
    body: `NGN ${group.sellerEarningsAmount.toLocaleString()} is now available from order group ${group.id}.`,
    targetType: "sellerOrderGroup",
    targetId: group.id,
    metadata: toJsonValue({
      parentOrderId: group.parentOrderId,
      sellerOrderGroupId: group.id,
    }),
  });

  return group;
}

export async function reverseCancelledSellerGroup(tx: Prisma.TransactionClient, sellerOrderGroupId: string) {
  const group = await tx.sellerOrderGroup.findUnique({
    where: { id: sellerOrderGroupId },
    include: {
      seller: {
        include: {
          user: true,
        },
      },
      items: true,
    },
  });

  if (!group) {
    throw new Error("SELLER_ORDER_GROUP_NOT_FOUND");
  }

  const wallet = await getOrCreateSellerWallet(tx, group.sellerId);
  const reversalKey = `seller-group:${group.id}:pending-reversal`;
  const existingReversal = await tx.walletTransaction.findUnique({ where: { idempotencyKey: reversalKey } });
  const pendingCredit = await tx.walletTransaction.findFirst({
    where: {
      walletId: wallet.id,
      type: WalletTransactionType.ORDER_PENDING_CREDIT,
      sellerOrderGroupId: group.id,
    },
  });

  if (!existingReversal && pendingCredit && group.sellerEarningsAmount > 0) {
    const updatedWallet = await tx.sellerWallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: {
          decrement: group.sellerEarningsAmount,
        },
        totalEarnings: {
          decrement: group.sellerEarningsAmount,
        },
      },
    });

    await createWalletTransaction(tx, {
      walletId: wallet.id,
      type: WalletTransactionType.REFUND_DEBIT,
      amount: -group.sellerEarningsAmount,
      pendingBalanceAfter: updatedWallet.pendingBalance,
      availableBalanceAfter: updatedWallet.availableBalance,
      processingBalanceAfter: updatedWallet.processingBalance,
      withdrawnBalanceAfter: updatedWallet.withdrawnBalance,
      description: `Reversed pending earnings for cancelled order group ${group.id}`,
      parentOrderId: group.parentOrderId,
      sellerOrderGroupId: group.id,
      idempotencyKey: reversalKey,
      metadata: toJsonValue({
        sellerEarningsAmount: group.sellerEarningsAmount,
      }),
    });
  }

  for (const item of group.items) {
    const restoreKey = `seller-group:${group.id}:inventory-restore:${item.id}`;
    const existingRestore = await tx.inventoryMovement.findUnique({ where: { idempotencyKey: restoreKey } });
    if (existingRestore) continue;

    const saleMovement = await tx.inventoryMovement.findFirst({
      where: {
        orderItemId: item.id,
        type: InventoryMovementType.SALE_DEDUCTION,
      },
    });

    if (!saleMovement) continue;

    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          inventory: {
            increment: item.quantity,
          },
        },
      });
    }

    if (item.productId) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          inventory: {
            increment: item.quantity,
          },
        },
      });
    }

    const movementId = await reserveSequentialId(tx, "inventory_movement");
    await tx.inventoryMovement.create({
      data: {
        id: movementId,
        sellerId: item.sellerId,
        productId: item.productId,
        variantId: item.variantId,
        orderItemId: item.id,
        type: InventoryMovementType.REFUND_RESTORE,
        quantityDelta: item.quantity,
        idempotencyKey: restoreKey,
        metadata: toJsonValue({
          parentOrderId: group.parentOrderId,
          sellerOrderGroupId: group.id,
        }),
      },
    });
  }

  await createNotification(tx, {
    userId: group.seller.userId,
    type: NotificationType.ORDER,
    title: "Order group cancelled",
    body: `Order group ${group.id} was cancelled before completion. Pending earnings were reversed.`,
    targetType: "sellerOrderGroup",
    targetId: group.id,
    metadata: toJsonValue({
      parentOrderId: group.parentOrderId,
      sellerOrderGroupId: group.id,
    }),
  });

  return group;
}

export async function updateSellerOrderGroupStatus(args: {
  sellerOrderGroupId: string;
  nextStatus: SellerOrderGroupStatus;
  actorRole: "ADMIN";
  actorAdminId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.sellerOrderGroup.findUnique({
      where: { id: args.sellerOrderGroupId },
      include: {
        items: true,
        seller: {
          include: {
            user: true,
          },
        },
        parentOrder: {
          include: {
            buyer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new Error("SELLER_ORDER_GROUP_NOT_FOUND");
    }

    if (group.status === args.nextStatus) {
      return tx.sellerOrderGroup.findUniqueOrThrow({
        where: { id: group.id },
        include: {
          items: true,
          seller: { include: { user: true } },
          parentOrder: {
            include: {
              addressSnapshot: true,
              payment: true,
              buyer: { include: { user: true } },
            },
          },
        },
      });
    }

    if (group.status === SellerOrderGroupStatus.CANCELLED || group.status === SellerOrderGroupStatus.REFUNDED) {
      throw new Error("ORDER_GROUP_ALREADY_CLOSED");
    }

    if (group.status === SellerOrderGroupStatus.DELIVERED && args.nextStatus === SellerOrderGroupStatus.CANCELLED) {
      throw new Error("DELIVERED_GROUP_CANNOT_BE_CANCELLED_HERE");
    }

    await tx.sellerOrderGroup.update({
      where: { id: group.id },
      data: { status: args.nextStatus },
    });

    if (args.nextStatus === SellerOrderGroupStatus.DELIVERED) {
      await releaseSellerGroupEarnings(tx, group.id);
    }

    if (args.nextStatus === SellerOrderGroupStatus.CANCELLED) {
      await reverseCancelledSellerGroup(tx, group.id);
    }

    await notifyStatusChange(tx, {
      parentOrderId: group.parentOrderId,
      sellerOrderGroupId: group.id,
      sellerUserId: group.seller.userId,
      buyerUserId: group.parentOrder.buyer.userId,
      nextStatus: args.nextStatus,
      sellerName: group.sellerNameSnapshot,
      farmName: group.farmNameSnapshot,
    });

    await createAuditLog(tx, {
      adminId: args.actorAdminId,
      action: "order_group.status.update",
      targetType: "sellerOrderGroup",
      targetId: group.id,
      metadata: toJsonValue({
        parentOrderId: group.parentOrderId,
        previousStatus: group.status,
        nextStatus: args.nextStatus,
      }),
    });

    await syncParentOrderStatusFromGroups(tx, group.parentOrderId);

    return tx.sellerOrderGroup.findUniqueOrThrow({
      where: { id: group.id },
      include: {
        items: true,
        seller: { include: { user: true } },
        parentOrder: {
          include: {
            addressSnapshot: true,
            payment: true,
            buyer: { include: { user: true } },
          },
        },
      },
    });
  });
}
