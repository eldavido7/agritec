import { NotificationType, Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/wallet-utils";
import { deliverPushForNotification } from "@/lib/push-notifications";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export async function broadcastDiscountCreated(args: {
  discountId: string;
  sellerId: string;
  sellerName: string;
  farmName: string;
  code: string;
  description?: string | null;
  targetSummary?: string | null;
}) {
  const buyers = await prisma.user.findMany({
    where: {
      role: UserRole.BUYER,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (buyers.length === 0) {
    console.info("[DISCOUNT_BROADCAST_SKIPPED]", {
      reason: "no_active_buyers",
      discountId: args.discountId,
    });
    return;
  }

  const notificationIds = await prisma.$transaction(async (tx) => {
    const createdIds: string[] = [];
    const title = "New discount available";
    const targetText = args.targetSummary?.trim()
      ? ` for ${args.targetSummary.trim()}`
      : "";
    const body = args.description?.trim()
      ? `${args.farmName} created discount ${args.code}${targetText}. ${args.description.trim()}`
      : `${args.farmName} created discount ${args.code}${targetText}.`;

    for (const buyer of buyers) {
      const notification = await createNotification(tx, {
        userId: buyer.id,
        type: NotificationType.SYSTEM,
        title,
        body,
        targetType: "discount",
        targetId: args.discountId,
        metadata: toJsonValue({
          discountId: args.discountId,
          sellerId: args.sellerId,
          sellerName: args.sellerName,
          farmName: args.farmName,
          code: args.code,
          targetSummary: args.targetSummary ?? null,
        }),
      });
      createdIds.push(notification.id);
    }

    return createdIds;
  });

  console.info("[DISCOUNT_BROADCAST_CREATED]", {
    discountId: args.discountId,
    buyerCount: buyers.length,
  });

  await Promise.allSettled(
    notificationIds.map(async (notificationId) => {
      const result = await deliverPushForNotification(notificationId);
      console.info("[DISCOUNT_BROADCAST_PUSH_RESULT]", {
        notificationId,
        result,
      });
    }),
  );
}
