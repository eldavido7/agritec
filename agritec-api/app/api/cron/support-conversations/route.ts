import {
  ConversationType,
  SupportAssignmentEventType,
  SupportConversationStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import {
  createConversationMessage,
  queueConversationMessageEmailAlerts,
  queueSupportAssignmentAlertEmail,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";
import {
  SUPPORT_AUTO_REPLY_DELAY_MS,
  assignSupportConversation,
  deriveCurrentSupportAssignment,
  deriveSupportTriedAdminIds,
  findAvailableSupportAdmin,
  isSupportConversationType,
  unassignSupportConversation,
} from "@/lib/support-utils";

const SUPPORT_AUTO_REPLY_MARKER = "AUTO_REPLY_FOR_MESSAGE:";
const SUPPORT_AUTO_REPLY_BODY =
  "We have received your message. A support admin will pick this up as soon as one is available.";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET_NOT_CONFIGURED");
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

function appendAutoReplyMarker(
  note: string | null | undefined,
  messageId: string,
) {
  const marker = `${SUPPORT_AUTO_REPLY_MARKER}${messageId}`;
  if ((note ?? "").includes(marker)) {
    return note ?? null;
  }

  const nextNote = [note?.trim(), marker].filter(Boolean).join(" | ");
  return nextNote || marker;
}

async function processOverdueAssignments() {
  const now = new Date();
  const conversations = await prisma.conversation.findMany({
    where: {
      type: {
        in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT],
      },
      supportStatus: SupportConversationStatus.ACTIVE,
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
              isActive: true,
              lastActiveAt: true,
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
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
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
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
  });

  const overdueResults: Array<Record<string, unknown>> = [];
  const autoReplyResults: Array<Record<string, unknown>> = [];
  const autoReplyCutoff = Date.now() - SUPPORT_AUTO_REPLY_DELAY_MS;

  for (const conversation of conversations) {
    if (!isSupportConversationType(conversation.type)) {
      continue;
    }

    const latestMessage = conversation.messages[0] ?? null;
    const currentAssignment = deriveCurrentSupportAssignment(
      conversation.assignments as any[],
    );
    const latestAssignment = currentAssignment.latest;

      if (
      latestMessage &&
      currentAssignment.assignedAdminId &&
      currentAssignment.responseDueAt &&
      currentAssignment.responseDueAt.getTime() <= now.getTime() &&
      latestMessage.sender.role !== UserRole.ADMIN
    ) {
      let queuedAssignmentId: string | null = null;
      const result = await prisma.$transaction(async (tx) => {
        const triedAdminIds = deriveSupportTriedAdminIds(
          conversation.assignments as any[],
        );
        const nextAdmin = await findAvailableSupportAdmin(tx, {
          excludeUserIds: triedAdminIds,
        });

        if (nextAdmin) {
          const assignment = await assignSupportConversation(tx, {
            conversationId: conversation.id,
            assignedAdminId: nextAdmin.id,
            assignedByUserId: null,
            eventType: SupportAssignmentEventType.REASSIGN,
            note: "Reassigned automatically after response deadline elapsed.",
          });
          queuedAssignmentId = assignment.id;

          return {
            conversationId: conversation.id,
            action: "reassigned",
            assignmentId: assignment.id,
            assignedAdminId: nextAdmin.id,
          };
        }

        await unassignSupportConversation(tx, {
          conversationId: conversation.id,
          assignedByUserId: null,
          note: "Returned to queue automatically after response deadline elapsed.",
        });

        return {
          conversationId: conversation.id,
          action: "unassigned",
        };
      });

      console.info("[SUPPORT_CONVERSATION_CRON_OVERDUE]", result);
      if (queuedAssignmentId) {
        queueSupportAssignmentAlertEmail({
          conversationId: conversation.id,
          assignmentId: queuedAssignmentId,
        });
      }
      overdueResults.push(result);
      continue;
    }

    const alreadyMarked =
      latestAssignment?.note?.includes(
        `${SUPPORT_AUTO_REPLY_MARKER}${latestMessage?.id ?? ""}`,
      ) ?? false;
    const adminParticipant = conversation.participants.find(
      (participant) => participant.user.role === UserRole.ADMIN,
    );

    if (
      latestMessage &&
      latestMessage.sender.role !== UserRole.ADMIN &&
      currentAssignment.queueState === "UNASSIGNED" &&
      latestMessage.createdAt.getTime() <= autoReplyCutoff &&
      !alreadyMarked &&
      adminParticipant
    ) {
      let autoReplyMessageId: string | null = null;
      const result = await prisma.$transaction(async (tx) => {
        const createdMessage = await createConversationMessage(tx, {
          conversationId: conversation.id,
          senderId: adminParticipant.userId,
          body: SUPPORT_AUTO_REPLY_BODY,
          skipSupportAssignmentAutomation: true,
        });

        const latest = await tx.supportConversationAssignment.findFirst({
          where: { conversationId: conversation.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        if (latest) {
          await tx.supportConversationAssignment.update({
            where: { id: latest.id },
            data: {
              note: appendAutoReplyMarker(latest.note, latestMessage.id),
            },
          });
        } else {
          await unassignSupportConversation(tx, {
            conversationId: conversation.id,
            assignedByUserId: null,
            note: appendAutoReplyMarker(null, latestMessage.id),
          });
        }

        autoReplyMessageId = createdMessage.id;
        return {
          conversationId: conversation.id,
          action: "auto_reply_sent",
          messageId: createdMessage.id,
        };
      });

      console.info("[SUPPORT_CONVERSATION_CRON_AUTO_REPLY]", result);
      if (autoReplyMessageId) {
        queueConversationMessageEmailAlerts(autoReplyMessageId);
      }
      autoReplyResults.push(result);
    }
  }

  return {
    scanned: conversations.length,
    overdueResults,
    autoReplyResults,
  };
}

async function handleCronRequest(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await processOverdueAssignments();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[CRON_SUPPORT_CONVERSATIONS_POST_ERROR]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run support conversation cron";
    if (message === "CRON_SECRET_NOT_CONFIGURED") {
      return NextResponse.json(
        { success: false, message: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to run support conversation cron",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
