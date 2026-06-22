import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  serializeConversation,
  serializeConversationMessage,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";
import {
  getSupportConversationWithHistory,
  isSupportConversationType,
  serializeSupportAssignmentEvent,
} from "@/lib/support-utils";

function serializeInternalComment(comment: any) {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.authorUser.id,
      fullName: comment.authorUser.fullName,
      email: comment.authorUser.email,
      role: comment.authorUser.role,
    },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const conversation = await getSupportConversationWithHistory(prisma, id);
    if (!conversation || !isSupportConversationType(conversation.type)) {
      return NextResponse.json(
        { success: false, message: "Support conversation not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.conversationParticipant.updateMany({
        where: {
          conversationId: conversation.id,
          userId: admin.id,
        },
        data: { lastReadAt: new Date() },
      }),
      prisma.notification.updateMany({
        where: {
          userId: admin.id,
          type: "MESSAGE",
          targetType: "conversation",
          targetId: conversation.id,
          isRead: false,
        },
        data: { isRead: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      conversation: serializeConversation(conversation, admin.id, 0),
      messages: conversation.messages.map(serializeConversationMessage),
      assignments: conversation.assignments.map(serializeSupportAssignmentEvent),
      internalComments: conversation.internalComments.map(serializeInternalComment),
    });
  } catch (error) {
    console.error("[ADMIN_SUPPORT_CONVERSATION_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch support conversation" },
      { status: 500 },
    );
  }
}
