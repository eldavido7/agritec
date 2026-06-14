import { DevicePlatform, NotificationType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getFirebaseMessagingClient } from "@/lib/firebase-admin";

type NotificationWithUser = Prisma.NotificationGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        fullName: true;
        deviceTokens: {
          where: { isActive: true };
          select: {
            id: true;
            token: true;
            platform: true;
            deviceId: true;
          };
        };
      };
    };
  };
}>;

function titleForNotification(notification: NotificationWithUser) {
  return notification.title.trim() || "AgriTec";
}

function bodyForNotification(notification: NotificationWithUser) {
  return notification.body.trim() || "You have a new update.";
}

function dataForNotification(notification: NotificationWithUser) {
  const metadata =
    notification.metadata && typeof notification.metadata === "object"
      ? (notification.metadata as Record<string, unknown>)
      : {};

  return {
    notificationId: notification.id,
    type: notification.type,
    targetType: notification.targetType ?? "",
    targetId: notification.targetId ?? "",
    conversationId: `${metadata.conversationId ?? ""}`,
    parentOrderId: `${metadata.parentOrderId ?? notification.targetId ?? ""}`,
    sellerId: `${metadata.sellerId ?? ""}`,
    click_action: "FLUTTER_NOTIFICATION_CLICK",
  };
}

async function markTokensInactive(tokens: string[]) {
  if (tokens.length === 0) return;
  await prisma.deviceToken.updateMany({
    where: { token: { in: tokens } },
    data: { isActive: false },
  });
}

export async function deliverPushForNotification(notificationId: string) {
  const messaging = getFirebaseMessagingClient();
  if (!messaging) {
    return { delivered: false, reason: "messaging_not_configured" as const };
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          deviceTokens: {
            where: { isActive: true },
            select: {
              id: true,
              token: true,
              platform: true,
              deviceId: true,
            },
          },
        },
      },
    },
  });

  if (!notification) {
    return { delivered: false, reason: "notification_not_found" as const };
  }

  if (notification.user.deviceTokens.length === 0) {
    return { delivered: false, reason: "no_active_device_tokens" as const };
  }

  const tokens = notification.user.deviceTokens
    .filter((item) => item.platform !== DevicePlatform.WEB)
    .map((item) => item.token)
    .filter((item) => item.trim().length > 0);

  if (tokens.length === 0) {
    return { delivered: false, reason: "no_mobile_device_tokens" as const };
  }

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: titleForNotification(notification),
      body: bodyForNotification(notification),
    },
    data: dataForNotification(notification),
    android: {
      priority: "high",
      notification: {
        channelId: "agritec_general",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  });

  const invalidTokens = response.responses
    .map((result, index) => ({ result, token: tokens[index] }))
    .filter(({ result }) => {
      const code = result.error?.code ?? "";
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
    })
    .map(({ token }) => token);

  if (invalidTokens.length > 0) {
    await markTokensInactive(invalidTokens);
  }

  return {
    delivered: response.successCount > 0,
    reason: response.successCount > 0 ? ("sent" as const) : ("no_successful_deliveries" as const),
  };
}

export function queueNotificationPush(notificationId: string) {
  const delays = [400, 1200, 2500];

  const attemptDelivery = (attemptIndex: number) => {
    setTimeout(() => {
      void deliverPushForNotification(notificationId)
        .then((result) => {
          if (result.reason === "notification_not_found" && attemptIndex < delays.length - 1) {
            attemptDelivery(attemptIndex + 1);
            return;
          }

          if (!result.delivered && result.reason !== "no_active_device_tokens" && result.reason !== "no_mobile_device_tokens") {
            console.warn("[FCM_PUSH_NOT_DELIVERED]", {
              notificationId,
              reason: result.reason,
              attempt: attemptIndex + 1,
            });
          }
        })
        .catch((error) => {
          console.error("[FCM_PUSH_DELIVERY_ERROR]", {
            notificationId,
            attempt: attemptIndex + 1,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }, delays[attemptIndex]);
  };

  attemptDelivery(0);
}

export function shouldSendPushForNotificationType(type: NotificationType) {
  return [NotificationType.MESSAGE, NotificationType.ORDER, NotificationType.PAYOUT, NotificationType.SYSTEM].includes(type);
}