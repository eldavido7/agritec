import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createSupportInternalComment,
  getSupportConversationWithHistory,
  isSupportConversationType,
} from "@/lib/support-utils";
import { createAuditLog } from "@/lib/wallet-utils";

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment is required"),
});

export async function POST(
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
    const payload = commentSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const conversation = await getSupportConversationWithHistory(tx, id);
      if (!conversation || !isSupportConversationType(conversation.type)) {
        throw new Error("SUPPORT_CONVERSATION_NOT_FOUND");
      }

      const comment = await createSupportInternalComment(tx, {
        conversationId: id,
        authorUserId: admin.id,
        body: payload.body,
      });

      await createAuditLog(tx, {
        adminId: admin.id,
        action: "support.internal_comment.created",
        targetType: "conversation",
        targetId: id,
        metadata: {
          commentId: comment.id,
        },
      });

      return comment;
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: result.id,
        body: result.body,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        author: {
          id: result.authorUser.id,
          fullName: result.authorUser.fullName,
          email: result.authorUser.email,
          role: result.authorUser.role,
        },
      },
    });
  } catch (error) {
    console.error("[ADMIN_SUPPORT_COMMENT_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message ?? "Invalid comment payload",
        },
        { status: 400 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "SUPPORT_CONVERSATION_NOT_FOUND"
    ) {
      return NextResponse.json(
        { success: false, message: "Support conversation not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to add internal comment" },
      { status: 500 },
    );
  }
}
