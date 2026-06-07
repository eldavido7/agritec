import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const DEFAULT_COUNT = 1;

type TxClient = Prisma.TransactionClient;

async function getExistingMaxId(tx: TxClient, sequenceName: string): Promise<number> {
  const extractMax = (rows: Array<{ id: string }>) =>
    rows.reduce((max, row) => {
      const value = Number.parseInt(row.id, 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

  switch (sequenceName) {
    case "user":
      return extractMax(await tx.user.findMany({ select: { id: true } }));
    case "buyer_profile":
      return extractMax(await tx.buyerProfile.findMany({ select: { id: true } }));
    case "seller_profile":
      return extractMax(await tx.sellerProfile.findMany({ select: { id: true } }));
    case "cart":
      return extractMax(await tx.cart.findMany({ select: { id: true } }));
    case "cart_item":
      return extractMax(await tx.cartItem.findMany({ select: { id: true } }));
    case "wishlist_item":
      return extractMax(await tx.wishlistItem.findMany({ select: { id: true } }));
    case "address":
      return extractMax(await tx.address.findMany({ select: { id: true } }));
    case "product":
      return extractMax(await tx.product.findMany({ select: { id: true } }));
    case "product_variant":
      return extractMax(await tx.productVariant.findMany({ select: { id: true } }));
    case "discount":
      return extractMax(await tx.discount.findMany({ select: { id: true } }));
    case "parent_order":
      return extractMax(await tx.parentOrder.findMany({ select: { id: true } }));
    case "payment":
      return extractMax(await tx.payment.findMany({ select: { id: true } }));
    case "seller_order_group":
      return extractMax(await tx.sellerOrderGroup.findMany({ select: { id: true } }));
    case "order_item":
      return extractMax(await tx.orderItem.findMany({ select: { id: true } }));
    case "order_address_snapshot":
      return extractMax(await tx.orderAddressSnapshot.findMany({ select: { id: true } }));
    case "seller_wallet":
      return extractMax(await tx.sellerWallet.findMany({ select: { id: true } }));
    case "wallet_transaction":
      return extractMax(await tx.walletTransaction.findMany({ select: { id: true } }));
    case "seller_bank_account":
      return extractMax(await tx.sellerBankAccount.findMany({ select: { id: true } }));
    case "withdrawal_request":
      return extractMax(await tx.withdrawalRequest.findMany({ select: { id: true } }));
    case "notification":
      return extractMax(await tx.notification.findMany({ select: { id: true } }));
    case "audit_log":
      return extractMax(await tx.auditLog.findMany({ select: { id: true } }));
    case "inventory_movement":
      return extractMax(await tx.inventoryMovement.findMany({ select: { id: true } }));
    case "conversation":
      return extractMax(await tx.conversation.findMany({ select: { id: true } }));
    case "conversation_participant":
      return extractMax(await tx.conversationParticipant.findMany({ select: { id: true } }));
    case "message":
      return extractMax(await tx.message.findMany({ select: { id: true } }));
    case "message_attachment":
      return extractMax(await tx.messageAttachment.findMany({ select: { id: true } }));
    default:
      return 0;
  }
}

export async function reserveSequentialIds(
  tx: TxClient,
  sequenceName: string,
  count = DEFAULT_COUNT
): Promise<string[]> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("INVALID_SEQUENCE_COUNT");
  }

  const existingCounter = await tx.idCounter.findUnique({
    where: { name: sequenceName },
  });

  if (!existingCounter) {
    const currentValue = await getExistingMaxId(tx, sequenceName);
    await tx.idCounter.create({
      data: {
        name: sequenceName,
        currentValue,
      },
    });
  }

  const updated = await tx.idCounter.update({
    where: { name: sequenceName },
    data: {
      currentValue: {
        increment: count,
      },
    },
  });

  const start = updated.currentValue - count + 1;
  return Array.from({ length: count }, (_, index) => String(start + index));
}

export async function reserveSequentialId(tx: TxClient, sequenceName: string): Promise<string> {
  const [id] = await reserveSequentialIds(tx, sequenceName, 1);
  return id;
}

