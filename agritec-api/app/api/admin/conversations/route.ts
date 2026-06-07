import { ConversationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  createConversationMessage,
  ensureBuyerSellerConversation,
  ensureBuyerSupportConversation,
  findSupportAdminUser,
  serializeConversation,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";

const createSchema = z.object({
  participantType: z.enum(["buyer", "seller"]),
  participantId: z.string().trim().min(1),
  subject: z.string().trim().min(1).optional().nullable(),
  initialMessage: z.string().trim().min(1).optional().nullable(),
  relatedParentOrderId: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type")?.trim() || undefined;
    const participantId = searchParams.get("participantId")?.trim() || undefined;

    const conversations = await prisma.conversation.findMany({
      where: {
        ...(type === "buyer-seller" ? { type: ConversationType.BUYER_SELLER } : {}),
        ...(type === "buyer-support" ? { type: ConversationType.BUYER_SUPPORT } : {}),
        ...(participantId ? { participants: { some: { userId: participantId } } } : {}),
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
              select: { id: true, fullName: true, email: true, role: true },
            },
            attachments: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conversation) => serializeConversation(conversation, admin.id, 0)),
    });
  } catch (error) {
    console.error("[ADMIN_CONVERSATIONS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch admin conversations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = createSchema.parse(await request.json());

    const conversation = await prisma.$transaction(async (tx) => {
      if (payload.participantType === "buyer") {
        const buyer = await tx.buyerProfile.findUnique({
          where: { id: payload.participantId },
          include: { user: true },
        });
        if (!buyer || !buyer.user.isActive) {
          throw new Error("BUYER_NOT_FOUND");
        }

        const supportConversation = await ensureBuyerSupportConversation(tx, {
          buyerUserId: buyer.userId,
          supportUserId: admin.id,
          subject: payload.subject ?? null,
        });

        if (payload.initialMessage) {
          await createConversationMessage(tx, {
            conversationId: supportConversation.id,
            senderId: admin.id,
            body: payload.initialMessage,
            relatedParentOrderId: payload.relatedParentOrderId ?? null,
          });
        }

        return supportConversation;
      }

      const seller = await tx.sellerProfile.findUnique({
        where: { id: payload.participantId },
        include: { user: true },
      });
      if (!seller || !seller.user.isActive) {
        throw new Error("SELLER_NOT_FOUND");
      }

      const uniqueKey = `admin-seller:${admin.id}:${seller.userId}`;
      let existing = await tx.conversation.findUnique({ where: { uniqueKey } });
      if (!existing) {
        const conversationId = await (await import("@/lib/id-sequence")).reserveSequentialId(tx, "conversation");
        const participantId1 = await (await import("@/lib/id-sequence")).reserveSequentialId(tx, "conversation_participant");
        const participantId2 = await (await import("@/lib/id-sequence")).reserveSequentialId(tx, "conversation_participant");
        await tx.conversation.create({
          data: {
            id: conversationId,
            type: ConversationType.BUYER_SUPPORT,
            uniqueKey,
            subject: payload.subject ?? null,
            relatedParentOrderId: payload.relatedParentOrderId ?? null,
            participants: {
              create: [
                { id: participantId1, userId: admin.id },
                { id: participantId2, userId: seller.userId },
              ],
            },
          },
        });
        existing = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
      }

      if (payload.initialMessage) {
        await createConversationMessage(tx, {
          conversationId: existing.id,
          senderId: admin.id,
          body: payload.initialMessage,
          relatedParentOrderId: payload.relatedParentOrderId ?? null,
        });
      }

      return existing;
    });

    const hydrated = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
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
            sender: { select: { id: true, fullName: true, email: true, role: true } },
            attachments: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, conversation: serializeConversation(hydrated, admin.id, 0) });
  } catch (error) {
    console.error("[ADMIN_CONVERSATIONS_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid admin conversation payload" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "BUYER_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Buyer not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "SELLER_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: "Failed to create admin conversation" }, { status: 500 });
  }
}
