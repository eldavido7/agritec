import { ConversationType, NotificationType, Prisma, UserRole } from "@prisma/client";
import { reserveSequentialId } from "@/lib/id-sequence";
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
          body: latestMessage.body,
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

export async function createConversationMessage(tx: TxClient, args: {
  conversationId: string;
  senderId: string;
  body: string;
  relatedParentOrderId?: string | null;
}) {
  const messageId = await reserveSequentialId(tx, "message");
  const message = await tx.message.create({
    data: {
      id: messageId,
      conversationId: args.conversationId,
      senderId: args.senderId,
      body: args.body,
      relatedParentOrderId: args.relatedParentOrderId ?? null,
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

  for (const recipient of recipients) {
    await createNotification(tx, {
      userId: recipient.userId,
      type: NotificationType.MESSAGE,
      title: `New message from ${message.sender.fullName}`,
      body: args.body,
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
