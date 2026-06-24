import { ConversationType, MessageType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  createConversationMessage,
  getConversationForUser,
  queueConversationMessageEmailAlerts,
  queueSupportAssignmentAlertEmail,
  serializeConversationMessage,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/wallet-utils";

const createMessageSchema = z
  .object({
    body: z.string().trim().optional().nullable(),
    type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT),
    relatedParentOrderId: z.string().trim().min(1).optional().nullable(),
    attachments: z
      .array(
        z.object({
          secureUrl: z.string().url(),
          publicId: z.string().trim().min(1),
          mimeType: z.string().trim().min(1).optional().nullable(),
        }),
      )
      .max(10)
      .optional()
      .default([]),
  })
  .superRefine((value, ctx) => {
    const hasBody = (value.body ?? "").trim().length > 0;
    const hasAttachments = (value.attachments ?? []).length > 0;

    if (!hasBody && !hasAttachments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a message or at least one attachment",
        path: ["body"],
      });
    }

    if ((value.attachments ?? []).some((attachment) => !attachment.publicId.startsWith("agritec/chats/"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid chat attachment",
        path: ["attachments"],
      });
    }
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation =
      user.role === UserRole.ADMIN
        ? await prisma.conversation.findFirst({
            where: {
              id,
              OR: [
                { participants: { some: { userId: user.id } } },
                { type: { in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT] } },
              ],
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
          })
        : await getConversationForUser(id, user.id);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.conversationParticipant.updateMany({
        where: {
          conversationId: id,
          userId: user.id,
        },
        data: { lastReadAt: now },
      }),
      prisma.notification.updateMany({
        where: {
          userId: user.id,
          type: "MESSAGE",
          targetType: "conversation",
          targetId: id,
          isRead: false,
        },
        data: { isRead: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      messages: conversation.messages.map(serializeConversationMessage),
    });
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = createMessageSchema.parse(await request.json());

    const conversation =
      user.role === UserRole.ADMIN
        ? await prisma.conversation.findFirst({
            where: {
              id,
              OR: [
                { participants: { some: { userId: user.id } } },
                { type: { in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT] } },
              ],
            },
            select: {
              id: true,
              type: true,
            },
          })
        : await getConversationForUser(id, user.id);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await createConversationMessage(tx, {
        conversationId: id,
        senderId: user.id,
        body: payload.body?.trim() || null,
        type: payload.attachments.length > 0 && !(payload.body?.trim().length)
          ? MessageType.IMAGE
          : payload.type,
        relatedParentOrderId: payload.relatedParentOrderId ?? null,
        attachments: payload.attachments.map((attachment) => ({
          secureUrl: attachment.secureUrl,
          publicId: attachment.publicId,
          mimeType: attachment.mimeType ?? null,
        })),
      });

      if (
        user.role === UserRole.ADMIN &&
        conversation.type !== ConversationType.BUYER_SELLER
      ) {
        await createAuditLog(tx, {
          adminId: user.id,
          action: "support.public_reply.sent",
          targetType: "conversation",
          targetId: id,
          metadata: {
            messageId: created.message.id,
          },
        });
      }

      return created;
    });

    if (result.supportAssignmentAlertAssignmentId) {
      queueSupportAssignmentAlertEmail({
        conversationId: id,
        assignmentId: result.supportAssignmentAlertAssignmentId,
      });
    }

    queueConversationMessageEmailAlerts(result.message.id);

    return NextResponse.json({ success: true, message: serializeConversationMessage(result.message) });
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid message payload" }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message === "SUPPORT_CONVERSATION_ASSIGNED_TO_OTHER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This support conversation is assigned to another admin. Reassign it or add an internal comment instead.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
  }
}
