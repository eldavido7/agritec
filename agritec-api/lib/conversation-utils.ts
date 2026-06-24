import { ConversationType, MessageType, NotificationType, Prisma, UserRole } from "@prisma/client";
import { reserveSequentialId } from "@/lib/id-sequence";
import {
  sendChatMessageAlertEmail,
  sendSupportAssignmentAlertEmail,
} from "@/lib/email";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/wallet-utils";
import {
  assignSupportConversation,
  autoAssignSupportConversation,
  deriveCurrentSupportAssignment,
  isSupportConversationType,
  listActiveAdminUsers,
  refreshSupportResponseDeadline,
  reopenSupportConversation,
  serializeSupportConversationSummary,
  toSupportJsonValue,
} from "@/lib/support-utils";

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
      assignments: {
        include: {
          assignedAdmin: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isActive: true,
              lastActiveAt: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
    support: serializeSupportConversationSummary({
      type: conversation.type,
      supportStatus: conversation.supportStatus,
      assignments: Array.isArray(conversation.assignments)
        ? conversation.assignments
        : [],
    }),
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
      supportStatus: "ACTIVE",
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
  const uniqueKey = `seller-support:${args.sellerUserId}`;
  const existing = await tx.conversation.findFirst({
    where: {
      OR: [
        { uniqueKey },
        {
          uniqueKey: { startsWith: "admin-seller:" },
          participants: { some: { userId: args.sellerUserId } },
        },
      ],
      type: { in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT] },
    },
  });
  if (existing) return existing;

  const conversationId = await reserveSequentialId(tx, "conversation");
  const participantId1 = await reserveSequentialId(tx, "conversation_participant");
  const participantId2 = await reserveSequentialId(tx, "conversation_participant");

  await tx.conversation.create({
    data: {
      id: conversationId,
      type: ConversationType.SELLER_SUPPORT,
      uniqueKey,
      supportStatus: "ACTIVE",
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
  skipSupportAssignmentAutomation?: boolean;
}) {
  let supportAssignmentAlertAssignmentId: string | null = null;
  const conversation = await tx.conversation.findUnique({
    where: { id: args.conversationId },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
      assignments: {
        include: {
          assignedAdmin: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              isActive: true,
              lastActiveAt: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
    },
  });
  if (!conversation) {
    throw new Error("CONVERSATION_NOT_FOUND");
  }

  const sender = await tx.user.findUnique({
    where: { id: args.senderId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      lastActiveAt: true,
    },
  });
  if (!sender) {
    throw new Error("SENDER_NOT_FOUND");
  }

  if (
    isSupportConversationType(conversation.type) &&
    !args.skipSupportAssignmentAutomation
  ) {
    const currentAssignment = deriveCurrentSupportAssignment(
      conversation.assignments as any[],
    );

    if (sender.role === UserRole.ADMIN) {
      if (
        currentAssignment.assignedAdminId &&
        currentAssignment.assignedAdminId !== sender.id
      ) {
        throw new Error("SUPPORT_CONVERSATION_ASSIGNED_TO_OTHER_ADMIN");
      }

      if (conversation.supportStatus === "RESOLVED") {
        await reopenSupportConversation(tx, {
          conversationId: conversation.id,
          assignedByUserId: sender.id,
          note: "Reopened by support reply.",
        });
      }

      if (!currentAssignment.assignedAdminId) {
        await assignSupportConversation(tx, {
          conversationId: conversation.id,
          assignedAdminId: sender.id,
          assignedByUserId: sender.id,
          eventType: "CLAIM",
          note: "Claimed automatically on public reply.",
        });
      }
    } else {
      if (conversation.supportStatus === "RESOLVED") {
        await reopenSupportConversation(tx, {
          conversationId: conversation.id,
          note: "Reopened by customer message.",
        });
      }

      if (!currentAssignment.assignedAdminId) {
        const assignment = await autoAssignSupportConversation(tx, {
          conversationId: conversation.id,
          note: "Assigned automatically after inbound support message.",
        });
        supportAssignmentAlertAssignmentId = assignment?.id ?? null;
      } else {
        await refreshSupportResponseDeadline(tx, {
          conversationId: conversation.id,
        });
      }
    }
  }

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

  let notificationRecipients = recipients.map((recipient) => recipient.user);

  if (isSupportConversationType(conversation.type)) {
    if (sender.role === UserRole.ADMIN) {
      notificationRecipients = conversation.participants
        .map((participant) => participant.user)
        .filter(
          (participant) =>
            participant.id !== sender.id && participant.role !== UserRole.ADMIN,
        );
    } else {
      const refreshedConversation = await tx.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          assignments: {
            include: {
              assignedAdmin: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  isActive: true,
                  lastActiveAt: true,
                },
              },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          },
        },
      });
      const refreshedAssignment = deriveCurrentSupportAssignment(
        (refreshedConversation?.assignments ?? []) as any[],
      );

      notificationRecipients = refreshedAssignment.assignedAdmin
        ? [refreshedAssignment.assignedAdmin as any]
        : await listActiveAdminUsers(tx, { excludeUserIds: [sender.id] });
    }
  }

  for (const recipient of notificationRecipients) {
    await createNotification(tx, {
      userId: recipient.id,
      type: NotificationType.MESSAGE,
      title: `New message from ${message.sender.fullName}`,
      body: notificationBody,
      targetType: "conversation",
      targetId: args.conversationId,
      metadata: toSupportJsonValue({
        conversationId: args.conversationId,
        messageId: message.id,
        senderId: args.senderId,
        relatedParentOrderId: args.relatedParentOrderId ?? null,
      }),
    });
  }

  return {
    message,
    supportAssignmentAlertAssignmentId,
  };
}

const CHAT_EMAIL_THROTTLE_MINUTES = 30;

function shouldEmailWebRecipient(args: {
  senderRole: UserRole;
  recipientRole: UserRole;
  conversationType?: ConversationType | string;
}) {
  void args.senderRole;

  if (args.recipientRole === UserRole.ADMIN || args.recipientRole === UserRole.SELLER) {
    return true;
  }

  return (
    args.recipientRole === UserRole.BUYER &&
    isSupportConversationType(args.conversationType)
  );
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
              assignments: {
                include: {
                  assignedAdmin: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      isActive: true,
                      lastActiveAt: true,
                    },
                  },
                },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              },
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
      const currentSupportAssignment = isSupportConversationType(
        message.conversation.type,
      )
        ? deriveCurrentSupportAssignment(
            (message.conversation.assignments ?? []) as any[],
          )
        : null;
      const recipients =
        currentSupportAssignment?.assignedAdmin && message.sender.role !== UserRole.ADMIN
        ? [
            {
              userId: currentSupportAssignment.assignedAdmin.id,
              user: {
                id: currentSupportAssignment.assignedAdmin.id,
                email: currentSupportAssignment.assignedAdmin.email,
                fullName: currentSupportAssignment.assignedAdmin.fullName,
                role: UserRole.ADMIN,
              },
            },
          ]
        : message.conversation.participants.filter(
            (participant) => participant.userId !== message.senderId,
          );

      await Promise.all(
        recipients.map(async (participant) => {
          const recipient = participant.user;

          if (
            isSupportConversationType(message.conversation.type) &&
            recipient.role === UserRole.ADMIN
          ) {
            return;
          }

          if (
            currentSupportAssignment &&
            recipient.role === UserRole.ADMIN &&
            recipient.id !== currentSupportAssignment.assignedAdminId
          ) {
            return;
          }

          if (
            !recipient.email ||
            !shouldEmailWebRecipient({
              senderRole: message.sender.role,
              recipientRole: recipient.role,
              conversationType: message.conversation.type,
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
            recipientRole: recipient.role as "BUYER" | "SELLER" | "ADMIN",
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

export function queueSupportAssignmentAlertEmail(args: {
  conversationId: string;
  assignmentId: string;
}) {
  queueMicrotask(async () => {
    try {
      const assignment = await prisma.supportConversationAssignment.findUnique({
        where: { id: args.assignmentId },
        include: {
          conversation: {
            select: {
              id: true,
              type: true,
            },
          },
          assignedAdmin: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (
        !assignment ||
        !assignment.assignedAdmin ||
        !assignment.assignedAdmin.email
      ) {
        return;
      }

      if (
        ![
          "AUTO_ASSIGN",
          "MANUAL_ASSIGN",
          "CLAIM",
          "REASSIGN",
        ].includes(assignment.eventType)
      ) {
        return;
      }

      const latestAssignment =
        await prisma.supportConversationAssignment.findFirst({
          where: { conversationId: assignment.conversationId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            assignedAdminId: true,
          },
        });

      if (
        !latestAssignment ||
        latestAssignment.id !== assignment.id ||
        latestAssignment.assignedAdminId !== assignment.assignedAdminId
      ) {
        return;
      }

      const subjectLabel =
        assignment.eventType === "REASSIGN"
          ? "Support conversation reassigned to you"
          : assignment.eventType === "AUTO_ASSIGN"
            ? "New support conversation assigned to you"
            : "Support conversation assigned to you";

      await sendSupportAssignmentAlertEmail({
        toEmail: assignment.assignedAdmin.email,
        adminName: assignment.assignedAdmin.fullName,
        conversationId: assignment.conversationId,
        conversationType: assignment.conversation.type,
        assignedByName: assignment.assignedByUser?.fullName ?? null,
        note: assignment.note ?? null,
        subjectLabel,
      });
    } catch (error) {
      console.error("[SUPPORT_ASSIGNMENT_EMAIL_ALERT_ERROR]", {
        assignmentId: args.assignmentId,
        conversationId: args.conversationId,
        error,
      });
    }
  });
}



