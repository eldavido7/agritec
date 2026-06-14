import {
  NotificationType,
  ParentOrderStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  SellerOrderGroupStatus,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { reserveSequentialId } from "@/lib/id-sequence";
import { createPaystackRefund } from "@/lib/paystack";
import {
  createAuditLog,
  createNotification,
  syncParentOrderStatusFromGroups,
} from "@/lib/wallet-utils";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function subunitToAmount(amount: number | null | undefined) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount / 100);
}

function mapPaystackRefundStatus(status: string | null | undefined): RefundStatus {
  switch ((status ?? "").toLowerCase()) {
    case "processed":
      return RefundStatus.PROCESSED;
    case "processing":
      return RefundStatus.PROCESSING;
    case "needs-attention":
      return RefundStatus.NEEDS_ATTENTION;
    case "failed":
      return RefundStatus.FAILED;
    case "pending":
    default:
      return RefundStatus.PENDING;
  }
}

function extractRefundIdFromMerchantNote(merchantNote: string | null | undefined) {
  if (!merchantNote) {
    return null;
  }

  const match = merchantNote.match(/AGT-REF:([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

async function syncRefundedPaymentAndParentState(tx: Prisma.TransactionClient, parentOrderId: string, paymentId: string) {
  const groups = await tx.sellerOrderGroup.findMany({
    where: { parentOrderId },
    select: { status: true },
  });

  const processedRefunds = await tx.refund.findMany({
    where: {
      parentOrderId,
      status: RefundStatus.PROCESSED,
    },
    select: { amount: true },
  });

  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { amount: true, status: true },
  });

  const totalRefunded = processedRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  const allGroupsRefunded = groups.length > 0 && groups.every((group) => group.status === SellerOrderGroupStatus.REFUNDED);

  if (payment && totalRefunded >= payment.amount && payment.status !== PaymentStatus.REFUNDED) {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });

    await tx.parentOrder.update({
      where: { id: parentOrderId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  }

  if (allGroupsRefunded) {
    await tx.parentOrder.update({
      where: { id: parentOrderId },
      data: {
        status: ParentOrderStatus.REFUNDED,
        cancelledAt: new Date(),
      },
    });
    return;
  }

  await syncParentOrderStatusFromGroups(tx, parentOrderId);
}

async function markRefundProcessed(refundId: string, payload: Record<string, unknown>) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: {
        parentOrder: {
          include: {
            buyer: {
              include: {
                user: true,
              },
            },
          },
        },
        sellerOrderGroup: {
          include: {
            seller: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new Error("REFUND_NOT_FOUND");
    }

    if (refund.status === RefundStatus.PROCESSED) {
      return refund;
    }

    const nextPaystackRefundId = payload.id == null ? refund.paystackRefundId : String(payload.id);

    await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.PROCESSED,
        paystackRefundId: nextPaystackRefundId,
        rawWebhookPayload: toJsonValue(payload),
        failureReason: null,
        processedAt: new Date(),
      },
    });

    if (refund.sellerOrderGroupId && refund.sellerOrderGroup?.status !== SellerOrderGroupStatus.REFUNDED) {
      await tx.sellerOrderGroup.update({
        where: { id: refund.sellerOrderGroupId },
        data: {
          status: SellerOrderGroupStatus.REFUNDED,
        },
      });
    }

    await syncRefundedPaymentAndParentState(tx, refund.parentOrderId, refund.paymentId);

    const farmName = refund.sellerOrderGroup?.farmNameSnapshot ?? "seller group";
    const buyerUserId = refund.parentOrder.buyer.userId;
    await createNotification(tx, {
      userId: buyerUserId,
      type: NotificationType.ORDER,
      title: "Refund processed",
      body: `Your refund for ${farmName} has been completed successfully.`,
      targetType: "parentOrder",
      targetId: refund.parentOrderId,
      metadata: toJsonValue({
        refundId: refund.id,
        parentOrderId: refund.parentOrderId,
        sellerOrderGroupId: refund.sellerOrderGroupId,
        amount: refund.amount,
      }),
    });

    if (refund.sellerOrderGroup?.seller.userId) {
      await createNotification(tx, {
        userId: refund.sellerOrderGroup.seller.userId,
        type: NotificationType.ORDER,
        title: "Refund completed",
        body: `Refund for cancelled order group ${refund.sellerOrderGroup.id} has been completed.`,
        targetType: "sellerOrderGroup",
        targetId: refund.sellerOrderGroup.id,
        metadata: toJsonValue({
          refundId: refund.id,
          parentOrderId: refund.parentOrderId,
          sellerOrderGroupId: refund.sellerOrderGroupId,
          amount: refund.amount,
        }),
      });
    }

    if (refund.initiatedByAdminId) {
      await createAuditLog(tx, {
        adminId: refund.initiatedByAdminId,
        action: "refund.processed",
        targetType: "refund",
        targetId: refund.id,
        metadata: toJsonValue({
          parentOrderId: refund.parentOrderId,
          sellerOrderGroupId: refund.sellerOrderGroupId,
          amount: refund.amount,
        }),
      });
    }

    return tx.refund.findUniqueOrThrow({
      where: { id: refund.id },
    });
  });
}

async function markRefundFailed(refundId: string, payload: Record<string, unknown>) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (!refund) {
      throw new Error("REFUND_NOT_FOUND");
    }

    const failureReason =
      typeof payload.gateway_response === "string"
        ? payload.gateway_response
        : typeof payload.message === "string"
          ? payload.message
          : typeof payload.status === "string"
            ? payload.status
            : "Refund failed";

    const nextPaystackRefundId = payload.id == null ? refund.paystackRefundId : String(payload.id);

    const updated = await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.FAILED,
        paystackRefundId: nextPaystackRefundId,
        rawWebhookPayload: toJsonValue(payload),
        failureReason,
        failedAt: new Date(),
      },
    });

    if (refund.initiatedByAdminId) {
      await createAuditLog(tx, {
        adminId: refund.initiatedByAdminId,
        action: "refund.failed",
        targetType: "refund",
        targetId: refund.id,
        metadata: toJsonValue({
          parentOrderId: refund.parentOrderId,
          sellerOrderGroupId: refund.sellerOrderGroupId,
          amount: refund.amount,
          failureReason,
        }),
      });
    }

    const order = await tx.parentOrder.findUnique({
      where: { id: refund.parentOrderId },
      include: {
        buyer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (order) {
      await createNotification(tx, {
        userId: order.buyer.userId,
        type: NotificationType.ORDER,
        title: "Refund update",
        body: "Your refund could not be completed automatically. Support has been notified for manual follow-up.",
        targetType: "parentOrder",
        targetId: refund.parentOrderId,
        metadata: toJsonValue({
          refundId: refund.id,
          sellerOrderGroupId: refund.sellerOrderGroupId,
          failureReason,
        }),
      });
    }

    return updated;
  });
}

export async function initiateSellerOrderGroupRefund(args: {
  sellerOrderGroupId: string;
  adminId: string;
}) {
  const existingOpenRefund = await prisma.refund.findFirst({
    where: {
      sellerOrderGroupId: args.sellerOrderGroupId,
      status: {
        in: [RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.NEEDS_ATTENTION, RefundStatus.PROCESSED],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingOpenRefund) {
    return existingOpenRefund;
  }

  const prepared = await prisma.$transaction(async (tx) => {
    const group = await tx.sellerOrderGroup.findUnique({
      where: { id: args.sellerOrderGroupId },
      include: {
        parentOrder: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error("SELLER_ORDER_GROUP_NOT_FOUND");
    }

    if (group.status !== SellerOrderGroupStatus.CANCELLED) {
      throw new Error("SELLER_ORDER_GROUP_MUST_BE_CANCELLED_BEFORE_REFUND");
    }

    if (!group.parentOrder.payment || group.parentOrder.payment.status !== PaymentStatus.PAID) {
      throw new Error("SELLER_ORDER_GROUP_PAYMENT_NOT_ELIGIBLE_FOR_REFUND");
    }

    const refundId = await reserveSequentialId(tx, "refund");
    const merchantNote = `AGT-REF:${refundId};GROUP:${group.id};ORDER:${group.parentOrderId}`;
    const customerNote = `Refund for cancelled order group ${group.id}`;

    const refund = await tx.refund.create({
      data: {
        id: refundId,
        paymentId: group.parentOrder.payment.id,
        parentOrderId: group.parentOrderId,
        sellerOrderGroupId: group.id,
        amount: group.groupTotal,
        currencyCode: group.parentOrder.payment.currencyCode,
        status: RefundStatus.PENDING,
        paystackTransactionReference: group.parentOrder.payment.reference,
        customerNote,
        merchantNote,
        initiatedByAdminId: args.adminId,
        idempotencyKey: `refund:init:${group.id}`,
      },
    });

    await createAuditLog(tx, {
      adminId: args.adminId,
      action: "refund.initiated",
      targetType: "refund",
      targetId: refund.id,
      metadata: toJsonValue({
        parentOrderId: group.parentOrderId,
        sellerOrderGroupId: group.id,
        amount: refund.amount,
      }),
    });

    return {
      refund,
      paymentReference: group.parentOrder.payment.reference,
      currencyCode: group.parentOrder.payment.currencyCode,
      groupId: group.id,
      parentOrderId: group.parentOrderId,
    };
  });

  try {
    const response = await createPaystackRefund({
      transaction: prepared.paymentReference,
      amountInSubunit: prepared.refund.amount * 100,
      currencyCode: prepared.currencyCode,
      customerNote: prepared.refund.customerNote ?? undefined,
      merchantNote: prepared.refund.merchantNote ?? undefined,
    });

    const nextStatus = mapPaystackRefundStatus(response.status);
    const updatedRefund = await prisma.refund.update({
      where: { id: prepared.refund.id },
      data: {
        status: nextStatus,
        paystackRefundId: response.id == null ? null : String(response.id),
        rawCreateResponse: toJsonValue(response),
        failureReason: nextStatus === RefundStatus.FAILED ? (response.reason ?? response.status) : null,
        processedAt: nextStatus === RefundStatus.PROCESSED ? new Date() : null,
        failedAt: nextStatus === RefundStatus.FAILED ? new Date() : null,
      },
    });

    if (nextStatus === RefundStatus.PROCESSED) {
      return markRefundProcessed(prepared.refund.id, response as Record<string, unknown>);
    }

    if (nextStatus === RefundStatus.FAILED) {
      return markRefundFailed(prepared.refund.id, response as Record<string, unknown>);
    }

    return updatedRefund;
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Failed to initiate refund";
    return prisma.$transaction(async (tx) => {
      const failedRefund = await tx.refund.update({
        where: { id: prepared.refund.id },
        data: {
          status: RefundStatus.FAILED,
          failureReason,
          failedAt: new Date(),
        },
      });

      await createAuditLog(tx, {
        adminId: args.adminId,
        action: "refund.initiation_failed",
        targetType: "refund",
        targetId: prepared.refund.id,
        metadata: toJsonValue({
          parentOrderId: prepared.parentOrderId,
          sellerOrderGroupId: prepared.groupId,
          amount: prepared.refund.amount,
          failureReason,
        }),
      });

      return failedRefund;
    });
  }
}

export async function cancelParentOrderAndInitiateRefunds(args: {
  parentOrderId: string;
  adminId: string;
}) {
  const order = await prisma.parentOrder.findUnique({
    where: { id: args.parentOrderId },
    include: {
      payment: true,
      sellerGroups: true,
    },
  });

  if (!order) {
    throw new Error("PARENT_ORDER_NOT_FOUND");
  }

  if (order.sellerGroups.some((group) => group.status === SellerOrderGroupStatus.DELIVERED)) {
    throw new Error("DELIVERED_GROUP_CANNOT_BE_CANCELLED_HERE");
  }

  const { updateSellerOrderGroupStatus } = await import("@/lib/seller-order-group-utils");

  for (const group of order.sellerGroups) {
    if (group.status === SellerOrderGroupStatus.CANCELLED || group.status === SellerOrderGroupStatus.REFUNDED) {
      continue;
    }

    await updateSellerOrderGroupStatus({
      sellerOrderGroupId: group.id,
      nextStatus: SellerOrderGroupStatus.CANCELLED,
      actorRole: "ADMIN",
      actorAdminId: args.adminId,
    });
  }

  const refunds = [] as Array<{ sellerOrderGroupId: string; refundId?: string; status: string }>;
  if (order.payment?.status === PaymentStatus.PAID) {
    for (const group of order.sellerGroups) {
      const refund = await initiateSellerOrderGroupRefund({
        sellerOrderGroupId: group.id,
        adminId: args.adminId,
      });

      refunds.push({
        sellerOrderGroupId: group.id,
        refundId: refund.id,
        status: refund.status,
      });
    }
  }

  const updatedOrder = await prisma.parentOrder.findUniqueOrThrow({
    where: { id: args.parentOrderId },
    include: {
      addressSnapshot: true,
      payment: {
        include: {
          refunds: true,
        },
      },
      refunds: true,
      sellerGroups: {
        include: {
          items: true,
          refunds: true,
        },
      },
    },
  });

  return { order: updatedOrder, refunds };
}

export async function processPaystackRefundWebhook(payload: {
  event?: string;
  data?: Record<string, unknown>;
}) {
  const data = payload.data ?? {};
  const paystackRefundId = data.id == null ? null : String(data.id);
  const merchantNote = typeof data.merchant_note === "string" ? data.merchant_note : null;
  const embeddedRefundId = extractRefundIdFromMerchantNote(merchantNote);
  const transactionReference =
    typeof data.transaction_reference === "string"
      ? data.transaction_reference
      : typeof data.reference === "string"
        ? data.reference
        : null;
  const amount = subunitToAmount(typeof data.amount === "number" ? data.amount : null);
  const refundStatus = mapPaystackRefundStatus(typeof data.status === "string" ? data.status : null);

  let refund = paystackRefundId
    ? await prisma.refund.findFirst({ where: { paystackRefundId } })
    : null;

  if (!refund && embeddedRefundId) {
    refund = await prisma.refund.findUnique({ where: { id: embeddedRefundId } });
  }

  if (!refund && transactionReference && amount != null) {
    refund = await prisma.refund.findFirst({
      where: {
        paystackTransactionReference: transactionReference,
        amount,
        status: {
          in: [RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.NEEDS_ATTENTION],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!refund) {
    throw new Error("REFUND_NOT_FOUND");
  }

  if (refundStatus === RefundStatus.PROCESSED) {
    return markRefundProcessed(refund.id, data);
  }

  if (refundStatus === RefundStatus.FAILED) {
    return markRefundFailed(refund.id, data);
  }

  return prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: refundStatus,
      paystackRefundId: paystackRefundId ?? refund.paystackRefundId,
      rawWebhookPayload: toJsonValue(data),
      failureReason:
        refundStatus === RefundStatus.NEEDS_ATTENTION
          ? typeof data.message === "string"
            ? data.message
            : typeof data.status === "string"
              ? data.status
              : refund.failureReason
          : null,
    },
  });
}
