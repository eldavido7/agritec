import {
  SupportAssignmentEventType,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { queueSupportAssignmentAlertEmail } from "@/lib/conversation-utils";
import prisma from "@/lib/prisma";
import {
  assignSupportConversation,
  deriveCurrentSupportAssignment,
  getSupportConversationWithHistory,
  isSupportConversationType,
  lockSupportConversation,
  reopenSupportConversation,
  resolveSupportConversation,
  serializeSupportAssignmentEvent,
  unassignSupportConversation,
} from "@/lib/support-utils";
import { createAuditLog } from "@/lib/wallet-utils";

const assignmentSchema = z.object({
  action: z.enum(["claim", "assign", "reassign", "unassign", "resolve", "reopen"]),
  assignedAdminId: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

function eventTypeForAction(action: "claim" | "assign" | "reassign") {
  switch (action) {
    case "claim":
      return SupportAssignmentEventType.CLAIM;
    case "reassign":
      return SupportAssignmentEventType.REASSIGN;
    default:
      return SupportAssignmentEventType.MANUAL_ASSIGN;
  }
}

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
    const payload = assignmentSchema.parse(await request.json());

    const assignment = await prisma.$transaction(
      async (tx) => {
        const conversation = await getSupportConversationWithHistory(tx, id);
        if (!conversation || !isSupportConversationType(conversation.type)) {
          throw new Error("SUPPORT_CONVERSATION_NOT_FOUND");
        }

        const currentAssignment = deriveCurrentSupportAssignment(
          conversation.assignments as any[],
        );
        const locked = await lockSupportConversation(tx, {
          conversationId: id,
          updatedAt: conversation.updatedAt,
        });
        if (!locked) {
          throw new Error("SUPPORT_ASSIGNMENT_CONFLICT");
        }

        let created;
        switch (payload.action) {
          case "claim":
            if (
              currentAssignment.queueState === "ASSIGNED" &&
              currentAssignment.assignedAdminId !== admin.id
            ) {
              throw new Error("SUPPORT_ALREADY_ASSIGNED");
            }
            created = await assignSupportConversation(tx, {
              conversationId: id,
              assignedAdminId: admin.id,
              assignedByUserId: admin.id,
              eventType: eventTypeForAction("claim"),
              note: payload.note ?? "Claimed from queue.",
            });
            break;
          case "assign":
          case "reassign":
            if (!payload.assignedAdminId) {
              throw new Error("ASSIGNED_ADMIN_REQUIRED");
            }
            created = await assignSupportConversation(tx, {
              conversationId: id,
              assignedAdminId: payload.assignedAdminId,
              assignedByUserId: admin.id,
              eventType: eventTypeForAction(payload.action),
              note: payload.note ?? null,
            });
            break;
          case "unassign":
            created = await unassignSupportConversation(tx, {
              conversationId: id,
              assignedByUserId: admin.id,
              note: payload.note ?? "Returned to queue.",
            });
            break;
          case "resolve":
            created = await resolveSupportConversation(tx, {
              conversationId: id,
              assignedByUserId: admin.id,
              note: payload.note ?? "Resolved by admin.",
            });
            break;
          case "reopen":
            created = await reopenSupportConversation(tx, {
              conversationId: id,
              assignedByUserId: admin.id,
              note: payload.note ?? "Reopened by admin.",
            });
            break;
        }

        await createAuditLog(tx, {
          adminId: admin.id,
          action: `support.assignment.${payload.action}`,
          targetType: "conversation",
          targetId: id,
          metadata: {
            assignedAdminId: payload.assignedAdminId ?? null,
            previousAssignedAdminId: currentAssignment.assignedAdminId,
          },
        });

        const refreshed = await getSupportConversationWithHistory(tx, id);
        return {
          assignment: created,
          conversation: refreshed,
        };
      },
      {
        timeout: 15000,
      },
    );

    if (assignment.assignment?.assignedAdminId) {
      queueSupportAssignmentAlertEmail({
        conversationId: id,
        assignmentId: assignment.assignment.id,
      });
    }

    return NextResponse.json({
      success: true,
      assignment: assignment.assignment
        ? serializeSupportAssignmentEvent(assignment.assignment as any)
        : null,
      support: assignment.conversation
        ? {
            status: assignment.conversation.supportStatus,
            assignments: assignment.conversation.assignments.map(
              serializeSupportAssignmentEvent,
            ),
          }
        : null,
    });
  } catch (error) {
    console.error("[ADMIN_SUPPORT_ASSIGNMENT_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.issues[0]?.message ?? "Invalid support assignment payload",
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
    if (
      error instanceof Error &&
      error.message === "ASSIGNED_ADMIN_REQUIRED"
    ) {
      return NextResponse.json(
        { success: false, message: "assignedAdminId is required for this action" },
        { status: 400 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "SUPPORT_ALREADY_ASSIGNED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This support conversation is already assigned. Reassign it instead of claiming it.",
        },
        { status: 409 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "SUPPORT_ASSIGNMENT_CONFLICT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This support conversation changed while you were updating it. Refresh and try again.",
        },
        { status: 409 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "ASSIGNED_ADMIN_NOT_AVAILABLE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected admin is not active and cannot receive support assignments.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update support assignment" },
      { status: 500 },
    );
  }
}
