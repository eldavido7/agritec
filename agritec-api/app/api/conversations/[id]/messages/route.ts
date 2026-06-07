import { MessageType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  createConversationMessage,
  getConversationForUser,
  serializeConversationMessage,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";

const createMessageSchema = z.object({
  body: z.string().trim().min(1),
  type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT),
  relatedParentOrderId: z.string().trim().min(1).optional().nullable(),
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
    const conversation = await getConversationForUser(id, user.id);
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

    const conversation = await getConversationForUser(id, user.id);
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    if (payload.type !== MessageType.TEXT) {
      return NextResponse.json({ success: false, message: "Only text messages are supported on this route" }, { status: 400 });
    }

    const message = await prisma.$transaction(async (tx) => {
      return createConversationMessage(tx, {
        conversationId: id,
        senderId: user.id,
        body: payload.body,
        relatedParentOrderId: payload.relatedParentOrderId ?? null,
      });
    });

    return NextResponse.json({ success: true, message: serializeConversationMessage(message) });
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid message payload" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
  }
}
