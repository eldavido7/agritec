import prisma from "@/lib/prisma";
import { sendBuyerOrderGroupStatusEmail } from "@/lib/email";
import { deliverPushForNotification } from "@/lib/push-notifications";

type OrderStatusAlertContext = {
  operationStartedAt: Date;
  description?: string | null;
  logLabel: string;
  sellerOrderGroup: {
    id: string;
    parentOrderId: string;
    status: string;
    farmNameSnapshot: string;
    productSubtotal: number;
    shippingFee: number;
    groupTotal: number;
    deliveryRegion?: string | null;
    seller?: {
      userId: string;
    } | null;
    logisticsCompany?: {
      userId: string;
    } | null;
    parentOrder?: {
      addressSnapshot?: {
        addressLine?: string | null;
        fullAddress?: string | null;
      } | null;
      buyer?: {
        userId: string;
        user?: {
          email?: string | null;
          fullName: string;
        } | null;
      } | null;
    } | null;
  };
};

async function findLatestNotificationId(args: {
  userId: string | null | undefined;
  targetType: string;
  targetId: string;
  operationStartedAt: Date;
}) {
  if (!args.userId) return null;

  const notification = await prisma.notification.findFirst({
    where: {
      userId: args.userId,
      targetType: args.targetType,
      targetId: args.targetId,
      createdAt: {
        gte: args.operationStartedAt,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
    },
  });

  return notification?.id ?? null;
}

export async function deliverOrderStatusAlerts(
  args: OrderStatusAlertContext,
) {
  const result = args.sellerOrderGroup;
  const buyerUser = result.parentOrder?.buyer?.user ?? null;
  const addressSnapshot = result.parentOrder?.addressSnapshot ?? null;

  if (buyerUser?.email) {
    try {
      await sendBuyerOrderGroupStatusEmail({
        toEmail: buyerUser.email,
        buyerName: buyerUser.fullName,
        parentOrderId: result.parentOrderId,
        sellerOrderGroupId: result.id,
        farmName: result.farmNameSnapshot,
        status: result.status as any,
        description: args.description ?? null,
        productSubtotal: result.productSubtotal,
        shippingFee: result.shippingFee,
        groupTotal: result.groupTotal,
        deliveryRegion: result.deliveryRegion ?? null,
        addressLine: addressSnapshot?.addressLine ?? null,
        fullAddress: addressSnapshot?.fullAddress ?? null,
      });
      console.info(`[${args.logLabel}_EMAIL_SENT]`, {
        sellerOrderGroupId: result.id,
        parentOrderId: result.parentOrderId,
        buyerEmail: buyerUser.email,
      });
    } catch (error) {
      console.error(`[${args.logLabel}_EMAIL_ERROR]`, error);
    }
  }

  const notificationIds = (
    await Promise.all([
      findLatestNotificationId({
        userId: result.parentOrder?.buyer?.userId,
        targetType: "parentOrder",
        targetId: result.parentOrderId,
        operationStartedAt: args.operationStartedAt,
      }),
      findLatestNotificationId({
        userId: result.seller?.userId,
        targetType: "sellerOrderGroup",
        targetId: result.id,
        operationStartedAt: args.operationStartedAt,
      }),
      findLatestNotificationId({
        userId: result.logisticsCompany?.userId,
        targetType: "sellerOrderGroup",
        targetId: result.id,
        operationStartedAt: args.operationStartedAt,
      }),
    ])
  ).filter((notificationId): notificationId is string => Boolean(notificationId));

  for (const notificationId of notificationIds) {
    try {
      const delivery = await deliverPushForNotification(notificationId);
      console.info(`[${args.logLabel}_PUSH_RESULT]`, {
        notificationId,
        delivery,
      });
    } catch (error) {
      console.error(`[${args.logLabel}_PUSH_ERROR]`, {
        notificationId,
        error,
      });
    }
  }
}
