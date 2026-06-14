import { ConversationType, MessageType, NotificationType, Prisma, UserRole } from "@prisma/client";
import { reserveSequentialId } from "@/lib/id-sequence";
import { sendChatMessageAlertEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/wallet-utils";

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

type TxClient = Prisma.TransactionClient;

export async function findSupportAdminUser(tx: TxClient) {
  const platform = await tx.platformSettings.findUnique({ where: { id: "platform" } });
  if (platform?.supportEmail) {
    const supportUser = await tx.user.findFirst({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
        email: platform.supportEmail,
      },
    });
    if (supportUser) return supportUser;
  }

  return tx.user.findFirst({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getConversationForUser(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              phone: true,
            },
          },
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function serializeConversation(conversation: any, currentUserId: string, unreadCount = 0) {
  const latestMessage = Array.isArray(conversation.messages) && conversation.messages.length > 0
    ? conversation.messages[conversation.messages.length - 1]
    : null;

  return {
    id: conversation.id,
    type: conversation.type,
    uniqueKey: conversation.uniqueKey,
    subject: conversation.subject,
    relatedParentOrderId: conversation.relatedParentOrderId,
    relatedSellerGroupId: conversation.relatedSellerGroupId,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    unreadCount,
    participants: Array.isArray(conversation.participants)
      ? conversation.participants.map((participant: any) => ({
          id: participant.id,
          userId: participant.userId,
          role: participant.user.role,
          fullName: participant.user.fullName,
          email: participant.user.email,
          phone: participant.user.phone,
          lastReadAt: participant.lastReadAt,
          isCurrentUser: participant.userId === currentUserId,
        }))
      : [],
    latestMessage: latestMessage
      ? {
          id: latestMessage.id,
          type: latestMessage.type,
          body: latestMessage.body || ((Array.isArray(latestMessage.attachments) && latestMessage.attachments.length > 0) ? "Sent an attachment" : null),
          senderId: latestMessage.senderId,
          senderName: latestMessage.sender.fullName,
          senderRole: latestMessage.sender.role,
          relatedParentOrderId: latestMessage.relatedParentOrderId,
          createdAt: latestMessage.createdAt,
        }
      : null,
  };
}

export function serializeConversationMessage(message: any) {
  return {
    id: message.id,
    type: message.type,
    body: message.body,
    relatedParentOrderId: message.relatedParentOrderId,
    sender: {
      id: message.sender.id,
      fullName: message.sender.fullName,
      email: message.sender.email,
      role: message.sender.role,
    },
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map((attachment: any) => ({
          id: attachment.id,
          secureUrl: attachment.secureUrl,
          publicId: attachment.publicId,
          mimeType: attachment.mimeType,
          createdAt: attachment.createdAt,
        }))
      : [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

export async function ensureBuyerSellerConversation(tx: TxClient, args: {
  buyerUserId: string;
  sellerUserId: string;
  relatedParentOrderId?: string | null;
  subject?: string | null;
}) {
  const uniqueKey = `buyer-seller:${args.buyerUserId}:${args.sellerUserId}`;
  const existing = await tx.conversation.findUnique({ where: { uniqueKey } });
  if (existing) return existing;

  const conversationId = await reserveSequentialId(tx, "conversation");
  const participantId1 = await reserveSequentialId(tx, "conversation_participant");
  const participantId2 = await reserveSequentialId(tx, "conversation_participant");

  await tx.conversation.create({
    data: {
      id: conversationId,
      type: ConversationType.BUYER_SELLER,
      uniqueKey,
      subject: args.subject ?? null,
      relatedParentOrderId: args.relatedParentOrderId ?? null,
      participants: {
        create: [
          { id: participantId1, userId: args.buyerUserId },
          { id: participantId2, userId: args.sellerUserId },
        ],
      },
    },
  });

  return tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
}

export async function ensureBuyerSupportConversation(tx: TxClient, args: {
  buyerUserId: string;
  supportUserId: string;
  subject?: string | null;
}) {
  const uniqueKey = `buyer-support:${args.buyerUserId}`;
  const existing = await tx.conversation.findUnique({ where: { uniqueKey } });
  if (existing) return existing;

  const conversationId = await reserveSequentialId(tx, "conversation");
  const participantId1 = await reserveSequentialId(tx, "conversation_participant");
  const participantId2 = await reserveSequentialId(tx, "conversation_participant");

  await tx.conversation.create({
    data: {
      id: conversationId,
      type: ConversationType.BUYER_SUPPORT,
      uniqueKey,
      subject: args.subject ?? null,
      participants: {
        create: [
          { id: participantId1, userId: args.buyerUserId },
          { id: participantId2, userId: args.supportUserId },
        ],
      },
    },
  });

  return tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
}

export async function ensureSellerSupportConversation(tx: TxClient, args: {
  sellerUserId: string;
  supportUserId: string;
  subject?: string | null;
}) {
  const uniqueKey = `admin-seller:${args.supportUserId}:${args.sellerUserId}`;
  const existing = await tx.conversation.findUnique({ where: { uniqueKey } });
  if (existing) return existing;

  const conversationId = await reserveSequentialId(tx, "conversation");
  const participantId1 = await reserveSequentialId(tx, "conversation_participant");
  const participantId2 = await reserveSequentialId(tx, "conversation_participant");

  await tx.conversation.create({
    data: {
      id: conversationId,
      type: ConversationType.BUYER_SUPPORT,
      uniqueKey,
      subject: args.subject ?? "Seller support",
      participants: {
        create: [
          { id: participantId1, userId: args.supportUserId },
          { id: participantId2, userId: args.sellerUserId },
        ],
      },
    },
  });

  return tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
}

export async function createConversationMessage(tx: TxClient, args: {
  conversationId: string;
  senderId: string;
  body?: string | null;
  type?: MessageType | null;
  relatedParentOrderId?: string | null;
  attachments?: Array<{
    secureUrl: string;
    publicId: string;
    mimeType?: string | null;
  }>;
}) {
  const messageId = await reserveSequentialId(tx, "message");
  const attachments = args.attachments ?? [];
  const message = await tx.message.create({
    data: {
      id: messageId,
      conversationId: args.conversationId,
      senderId: args.senderId,
      type: args.type ?? (attachments.length > 0 ? MessageType.IMAGE : MessageType.TEXT),
      body: args.body?.trim() || null,
      relatedParentOrderId: args.relatedParentOrderId ?? null,
      attachments:
        attachments.length > 0
          ? {
              create: await Promise.all(
                attachments.map(async (attachment) => ({
                  id: await reserveSequentialId(tx, "message_attachment"),
                  secureUrl: attachment.secureUrl,
                  publicId: attachment.publicId,
                  mimeType: attachment.mimeType ?? null,
                })),
              ),
            }
          : undefined,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      attachments: true,
    },
  });

  await tx.conversation.update({
    where: { id: args.conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  await tx.conversationParticipant.updateMany({
    where: {
      conversationId: args.conversationId,
      userId: args.senderId,
    },
    data: { lastReadAt: message.createdAt },
  });

  const recipients = await tx.conversationParticipant.findMany({
    where: {
      conversationId: args.conversationId,
      userId: { not: args.senderId },
    },
    include: {
      user: true,
    },
  });

  const notificationBody = args.body?.trim() || (attachments.length > 0 ? "Sent an attachment" : "New message");

  for (const recipient of recipients) {
    await createNotification(tx, {
      userId: recipient.userId,
      type: NotificationType.MESSAGE,
      title: `New message from ${message.sender.fullName}`,
      body: notificationBody,
      targetType: "conversation",
      targetId: args.conversationId,
      metadata: toJsonValue({
        conversationId: args.conversationId,
        messageId: message.id,
        senderId: args.senderId,
        relatedParentOrderId: args.relatedParentOrderId ?? null,
      }),
    });
  }

  return message;
}

const CHAT_EMAIL_THROTTLE_MINUTES = 30;

function shouldEmailWebRecipient(args: {
  senderRole: UserRole;
  recipientRole: UserRole;
}) {
  void args.senderRole;

  if (args.recipientRole !== UserRole.SELLER && args.recipientRole !== UserRole.ADMIN) {
    return false;
  }

  return true;
}

export function queueConversationMessageEmailAlerts(messageId: string) {
  queueMicrotask(async () => {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
          conversation: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!message) {
        return;
      }

      const cutoff = new Date(Date.now() - CHAT_EMAIL_THROTTLE_MINUTES * 60 * 1000);
      const recipients = message.conversation.participants.filter(
        (participant) => participant.userId !== message.senderId,
      );

      await Promise.all(
        recipients.map(async (participant) => {
          const recipient = participant.user;

          if (
            !recipient.email ||
            !shouldEmailWebRecipient({
              senderRole: message.sender.role,
              recipientRole: recipient.role,
            })
          ) {
            return;
          }

          const recentCount = await prisma.notification.count({
            where: {
              userId: recipient.id,
              type: NotificationType.MESSAGE,
              targetType: "conversation",
              targetId: message.conversationId,
              createdAt: { gte: cutoff },
            },
          });

          if (recentCount > 1) {
            return;
          }

          await sendChatMessageAlertEmail({
            toEmail: recipient.email,
            recipientName: recipient.fullName,
            recipientRole: recipient.role as "SELLER" | "ADMIN",
            senderName: message.sender.fullName,
            messagePreview: message.body?.trim() || "You have a new chat message.",
            conversationType: message.conversation.type,
            conversationId: message.conversationId,
          });
        }),
      );
    } catch (error) {
      console.error("[CHAT_MESSAGE_EMAIL_ALERT_ERROR]", {
        messageId,
        error,
      });
    }
  });
}



