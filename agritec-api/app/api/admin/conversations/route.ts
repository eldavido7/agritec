import { ConversationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  createConversationMessage,
  ensureBuyerSupportConversation,
  ensureSellerSupportConversation,
  findSupportAdminUser,
  queueConversationMessageEmailAlerts,
  serializeConversation,
} from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";
import { assignSupportConversation } from "@/lib/support-utils";
import { createAuditLog } from "@/lib/wallet-utils";

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
        ...(participantId
          ? {
              participants: {
                some: {
                  userId: participantId,
                },
              },
            }
          : {}),
        ...(type === "buyer-support"
          ? { type: ConversationType.BUYER_SUPPORT }
          : type === "seller-support"
            ? { type: ConversationType.SELLER_SUPPORT }
            : { type: { in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT] } }),
      },
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

    const unreadCounts = await Promise.all(
      conversations.map((conversation) =>
        prisma.notification.count({
          where: {
            userId: admin.id,
            type: "MESSAGE",
            targetType: "conversation",
            targetId: conversation.id,
            isRead: false,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conversation, index) =>
        serializeConversation(conversation, admin.id, unreadCounts[index] ?? 0),
      ),
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

    const created = await prisma.$transaction(async (tx) => {
      let createdMessageId: string | null = null;

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

        await assignSupportConversation(tx, {
          conversationId: supportConversation.id,
          assignedAdminId: admin.id,
          assignedByUserId: admin.id,
          eventType: "CLAIM",
          note: "Claimed on conversation creation.",
        });

        if (payload.initialMessage) {
          const createdMessage = await createConversationMessage(tx, {
            conversationId: supportConversation.id,
            senderId: admin.id,
            body: payload.initialMessage,
            relatedParentOrderId: payload.relatedParentOrderId ?? null,
          });
          createdMessageId = createdMessage.message.id;
        }

        await createAuditLog(tx, {
          adminId: admin.id,
          action: "support.conversation.created",
          targetType: "conversation",
          targetId: supportConversation.id,
          metadata: {
            participantType: "buyer",
            participantId: payload.participantId,
            initialMessageCreated: Boolean(payload.initialMessage),
          },
        });

        return { conversation: supportConversation, createdMessageId };
      }

      const seller = await tx.sellerProfile.findUnique({
        where: { id: payload.participantId },
        include: { user: true },
      });
      if (!seller || !seller.user.isActive) {
        throw new Error("SELLER_NOT_FOUND");
      }

      const supportConversation = await ensureSellerSupportConversation(tx, {
        sellerUserId: seller.userId,
        supportUserId: admin.id,
        subject: payload.subject ?? null,
      });

      await assignSupportConversation(tx, {
        conversationId: supportConversation.id,
        assignedAdminId: admin.id,
        assignedByUserId: admin.id,
        eventType: "CLAIM",
        note: "Claimed on conversation creation.",
      });

      if (payload.initialMessage) {
        const createdMessage = await createConversationMessage(tx, {
          conversationId: supportConversation.id,
          senderId: admin.id,
          body: payload.initialMessage,
          relatedParentOrderId: payload.relatedParentOrderId ?? null,
        });
        createdMessageId = createdMessage.message.id;
      }

      await createAuditLog(tx, {
        adminId: admin.id,
        action: "support.conversation.created",
        targetType: "conversation",
        targetId: supportConversation.id,
        metadata: {
          participantType: "seller",
          participantId: payload.participantId,
          initialMessageCreated: Boolean(payload.initialMessage),
        },
      });

      return { conversation: supportConversation, createdMessageId };
    });

    if (created.createdMessageId) {
      queueConversationMessageEmailAlerts(created.createdMessageId);
    }

    const hydrated = await prisma.conversation.findUniqueOrThrow({
      where: { id: created.conversation.id },
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
