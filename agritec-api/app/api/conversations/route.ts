import { ConversationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  ensureBuyerSellerConversation,
  ensureBuyerSupportConversation,
  ensureSellerSupportConversation,
  findSupportAdminUser,
  serializeConversation,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";

const createConversationSchema = z.object({
  type: z.nativeEnum(ConversationType),
  sellerId: z.string().trim().min(1).optional(),
  relatedParentOrderId: z.string().trim().min(1).optional().nullable(),
  subject: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (user.role === UserRole.SELLER && user.sellerProfile) {
      await prisma.$transaction(async (tx) => {
        const supportUser = await findSupportAdminUser(tx);
        if (!supportUser) {
          return;
        }

        await ensureSellerSupportConversation(tx, {
          sellerUserId: user.id,
          supportUserId: supportUser.id,
          subject: "Seller support",
        });
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: user.id } },
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
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    const currentParticipants = await prisma.conversationParticipant.findMany({
      where: {
        userId: user.id,
        conversationId: { in: conversations.map((conversation) => conversation.id) },
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });
    const lastReadMap = new Map(currentParticipants.map((participant) => [participant.conversationId, participant.lastReadAt]));

    const unreadCounts = await Promise.all(
      conversations.map((conversation) =>
        prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: user.id },
            ...(lastReadMap.get(conversation.id)
              ? { createdAt: { gt: lastReadMap.get(conversation.id)! } }
              : {}),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conversation, index) =>
        serializeConversation(conversation, user.id, unreadCounts[index] ?? 0)
      ),
    });
  } catch (error) {
    console.error("[CONVERSATIONS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = createConversationSchema.parse(await request.json());

    const conversation = await prisma.$transaction(async (tx) => {
      if (payload.type === ConversationType.BUYER_SUPPORT) {
        const supportUser = await findSupportAdminUser(tx);
        if (!supportUser) {
          throw new Error("SUPPORT_USER_NOT_FOUND");
        }

        return ensureBuyerSupportConversation(tx, {
          buyerUserId: user.id,
          supportUserId: supportUser.id,
          subject: payload.subject ?? null,
        });
      }

      if (!payload.sellerId) {
        throw new Error("SELLER_ID_REQUIRED");
      }

      const seller = await tx.sellerProfile.findUnique({
        where: { id: payload.sellerId },
        include: { user: true },
      });
      if (!seller || !seller.user.isActive) {
        throw new Error("SELLER_NOT_FOUND");
      }

      return ensureBuyerSellerConversation(tx, {
        buyerUserId: user.id,
        sellerUserId: seller.userId,
        relatedParentOrderId: payload.relatedParentOrderId ?? null,
        subject: payload.subject ?? null,
      });
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

    return NextResponse.json({ success: true, conversation: serializeConversation(hydrated, user.id, 0) });
  } catch (error) {
    console.error("[CONVERSATIONS_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid conversation payload" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "SUPPORT_USER_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Support user not configured" }, { status: 500 });
    }
    if (error instanceof Error && error.message === "SELLER_ID_REQUIRED") {
      return NextResponse.json({ success: false, message: "sellerId is required for buyer-seller chat" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "SELLER_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: "Failed to create conversation" }, { status: 500 });
  }
}



