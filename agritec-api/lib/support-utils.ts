import {
  ConversationType,
  Prisma,
  PrismaClient,
  SupportAssignmentEventType,
  SupportConversationStatus,
  UserRole,
} from "@prisma/client";
import { reserveSequentialId } from "@/lib/id-sequence";

type TxClient = Prisma.TransactionClient;
type SupportQueryClient = Prisma.TransactionClient | PrismaClient;

const SUPPORT_ADMIN_ACTIVE_WINDOW_MINUTES = 15;
const SUPPORT_RESPONSE_DUE_MINUTES = 15;
export const SUPPORT_AUTO_REPLY_DELAY_MS = 60 * 1000;

export function toSupportJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function isSupportConversationType(
  value: ConversationType | string | null | undefined,
) {
  return (
    value === ConversationType.BUYER_SUPPORT ||
    value === ConversationType.SELLER_SUPPORT
  );
}

export function getSupportLifecycleStatus(
  supportStatus: SupportConversationStatus | null | undefined,
) {
  return supportStatus === SupportConversationStatus.RESOLVED
    ? SupportConversationStatus.RESOLVED
    : SupportConversationStatus.ACTIVE;
}

type SupportAssignmentLike = {
  id: string;
  eventType: SupportAssignmentEventType;
  assignedAdminId: string | null;
  note?: string | null;
  responseDueAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  assignedAdmin?: {
    id: string;
    fullName: string;
    email: string;
    isActive?: boolean;
    lastActiveAt?: Date | null;
  } | null;
  assignedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export function deriveSupportQueueState(
  assignments: SupportAssignmentLike[],
): "ASSIGNED" | "UNASSIGNED" {
  const latest = assignments[0] ?? null;
  if (!latest) return "UNASSIGNED";

  if (
    latest.eventType === SupportAssignmentEventType.AUTO_ASSIGN ||
    latest.eventType === SupportAssignmentEventType.MANUAL_ASSIGN ||
    latest.eventType === SupportAssignmentEventType.CLAIM ||
    latest.eventType === SupportAssignmentEventType.REASSIGN
  ) {
    return latest.assignedAdminId ? "ASSIGNED" : "UNASSIGNED";
  }

  return "UNASSIGNED";
}

export function deriveCurrentSupportAssignment(
  assignments: SupportAssignmentLike[],
) {
  const latest = assignments[0] ?? null;
  const queueState = deriveSupportQueueState(assignments);

  return {
    queueState,
    latest,
    assignedAdminId:
      queueState === "ASSIGNED" ? (latest?.assignedAdminId ?? null) : null,
    assignedAdmin:
      queueState === "ASSIGNED" ? (latest?.assignedAdmin ?? null) : null,
    responseDueAt:
      queueState === "ASSIGNED" ? (latest?.responseDueAt ?? null) : null,
  };
}

export function serializeSupportAssignmentEvent(
  assignment: SupportAssignmentLike,
) {
  return {
    id: assignment.id,
    eventType: assignment.eventType,
    note: assignment.note ?? null,
    responseDueAt: assignment.responseDueAt,
    resolvedAt: assignment.resolvedAt,
    createdAt: assignment.createdAt,
    assignedAdmin: assignment.assignedAdmin
      ? {
          id: assignment.assignedAdmin.id,
          fullName: assignment.assignedAdmin.fullName,
          email: assignment.assignedAdmin.email,
          isActive: assignment.assignedAdmin.isActive ?? true,
          lastActiveAt: assignment.assignedAdmin.lastActiveAt ?? null,
        }
      : null,
    assignedByUser: assignment.assignedByUser
      ? {
          id: assignment.assignedByUser.id,
          fullName: assignment.assignedByUser.fullName,
          email: assignment.assignedByUser.email,
        }
      : null,
  };
}

export function serializeSupportConversationSummary(args: {
  type: ConversationType | string;
  supportStatus: SupportConversationStatus;
  assignments: SupportAssignmentLike[];
}) {
  if (!isSupportConversationType(args.type)) {
    return null;
  }

  const lifecycleStatus = getSupportLifecycleStatus(args.supportStatus);
  const current = deriveCurrentSupportAssignment(args.assignments);

  return {
    lifecycleStatus,
    queueState: current.queueState,
    currentAssignedAdmin: current.assignedAdmin
      ? {
          id: current.assignedAdmin.id,
          fullName: current.assignedAdmin.fullName,
          email: current.assignedAdmin.email,
          isActive: current.assignedAdmin.isActive ?? true,
          lastActiveAt: current.assignedAdmin.lastActiveAt ?? null,
        }
      : null,
    responseDueAt: current.responseDueAt,
    latestEventType: current.latest?.eventType ?? null,
  };
}

export async function findAvailableSupportAdmin(
  tx: TxClient,
  args?: { excludeUserIds?: string[] },
) {
  const excludeUserIds = args?.excludeUserIds ?? [];
  const cutoff = new Date(
    Date.now() - SUPPORT_ADMIN_ACTIVE_WINDOW_MINUTES * 60 * 1000,
  );

  const available = await tx.user.findFirst({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      ...(excludeUserIds.length > 0
        ? { id: { notIn: excludeUserIds } }
        : {}),
      lastActiveAt: { gte: cutoff },
    },
    orderBy: [{ lastActiveAt: "desc" }, { createdAt: "asc" }],
  });
  if (available) return available;

  return tx.user.findFirst({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      ...(excludeUserIds.length > 0
        ? { id: { notIn: excludeUserIds } }
        : {}),
    },
    orderBy: [{ lastActiveAt: "desc" }, { createdAt: "asc" }],
  });
}

export async function listActiveAdminUsers(
  tx: TxClient,
  args?: { excludeUserIds?: string[] },
) {
  const excludeUserIds = args?.excludeUserIds ?? [];
  return tx.user.findMany({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      ...(excludeUserIds.length > 0 ? { id: { notIn: excludeUserIds } } : {}),
    },
    orderBy: [{ lastActiveAt: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      lastActiveAt: true,
      isActive: true,
    },
  });
}

export async function getSupportConversationWithHistory(
  tx: SupportQueryClient,
  conversationId: string,
) {
  return tx.conversation.findUnique({
    where: { id: conversationId },
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
      internalComments: {
        include: {
          authorUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
    },
  });
}

export async function recordSupportAssignmentEvent(
  tx: TxClient,
  args: {
    conversationId: string;
    eventType: SupportAssignmentEventType;
    assignedAdminId?: string | null;
    assignedByUserId?: string | null;
    note?: string | null;
    responseDueAt?: Date | null;
    resolvedAt?: Date | null;
  },
) {
  const id = await reserveSequentialId(tx, "support_conversation_assignment");
  return tx.supportConversationAssignment.create({
    data: {
      id,
      conversationId: args.conversationId,
      eventType: args.eventType,
      assignedAdminId: args.assignedAdminId ?? null,
      assignedByUserId: args.assignedByUserId ?? null,
      note: args.note?.trim() || null,
      responseDueAt: args.responseDueAt ?? null,
      resolvedAt: args.resolvedAt ?? null,
    },
  });
}

export async function createSupportInternalComment(
  tx: TxClient,
  args: {
    conversationId: string;
    authorUserId: string;
    body: string;
  },
) {
  const id = await reserveSequentialId(tx, "support_internal_comment");
  return tx.supportInternalComment.create({
    data: {
      id,
      conversationId: args.conversationId,
      authorUserId: args.authorUserId,
      body: args.body.trim(),
    },
    include: {
      authorUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function assignSupportConversation(
  tx: TxClient,
  args: {
    conversationId: string;
    assignedAdminId: string;
    assignedByUserId: string | null;
    eventType:
      | SupportAssignmentEventType.AUTO_ASSIGN
      | SupportAssignmentEventType.MANUAL_ASSIGN
      | SupportAssignmentEventType.CLAIM
      | SupportAssignmentEventType.REASSIGN;
    note?: string | null;
  },
) {
  await tx.conversation.update({
    where: { id: args.conversationId },
    data: { supportStatus: SupportConversationStatus.ACTIVE },
  });

  return recordSupportAssignmentEvent(tx, {
    conversationId: args.conversationId,
    eventType: args.eventType,
    assignedAdminId: args.assignedAdminId,
    assignedByUserId: args.assignedByUserId,
    note: args.note ?? null,
    responseDueAt: new Date(
      Date.now() + SUPPORT_RESPONSE_DUE_MINUTES * 60 * 1000,
    ),
  });
}

export async function refreshSupportResponseDeadline(
  tx: TxClient,
  args: {
    conversationId: string;
  },
) {
  const latestAssignment = await tx.supportConversationAssignment.findFirst({
    where: { conversationId: args.conversationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (!latestAssignment || !latestAssignment.assignedAdminId) {
    return null;
  }

  return tx.supportConversationAssignment.update({
    where: { id: latestAssignment.id },
    data: {
      responseDueAt: new Date(
        Date.now() + SUPPORT_RESPONSE_DUE_MINUTES * 60 * 1000,
      ),
    },
  });
}

export async function unassignSupportConversation(
  tx: TxClient,
  args: {
    conversationId: string;
    assignedByUserId: string | null;
    note?: string | null;
  },
) {
  await tx.conversation.update({
    where: { id: args.conversationId },
    data: { supportStatus: SupportConversationStatus.ACTIVE },
  });

  return recordSupportAssignmentEvent(tx, {
    conversationId: args.conversationId,
    eventType: SupportAssignmentEventType.UNASSIGN,
    assignedByUserId: args.assignedByUserId,
    note: args.note ?? null,
  });
}

export async function resolveSupportConversation(
  tx: TxClient,
  args: {
    conversationId: string;
    assignedByUserId: string | null;
    note?: string | null;
  },
) {
  const resolvedAt = new Date();
  await tx.conversation.update({
    where: { id: args.conversationId },
    data: { supportStatus: SupportConversationStatus.RESOLVED },
  });

  return recordSupportAssignmentEvent(tx, {
    conversationId: args.conversationId,
    eventType: SupportAssignmentEventType.RESOLVE,
    assignedByUserId: args.assignedByUserId,
    note: args.note ?? null,
    resolvedAt,
  });
}

export async function reopenSupportConversation(
  tx: TxClient,
  args: {
    conversationId: string;
    assignedByUserId?: string | null;
    note?: string | null;
  },
) {
  await tx.conversation.update({
    where: { id: args.conversationId },
    data: { supportStatus: SupportConversationStatus.ACTIVE },
  });

  return recordSupportAssignmentEvent(tx, {
    conversationId: args.conversationId,
    eventType: SupportAssignmentEventType.REOPEN,
    assignedByUserId: args.assignedByUserId ?? null,
    note: args.note ?? null,
  });
}

export async function autoAssignSupportConversation(
  tx: TxClient,
  args: {
    conversationId: string;
    assignedByUserId?: string | null;
    note?: string | null;
    excludeUserIds?: string[];
  },
) {
  const nextAdmin = await findAvailableSupportAdmin(tx, {
    excludeUserIds: args.excludeUserIds,
  });
  if (!nextAdmin) {
    await unassignSupportConversation(tx, {
      conversationId: args.conversationId,
      assignedByUserId: args.assignedByUserId ?? null,
      note: args.note ?? "No admin was available for automatic assignment.",
    });
    return null;
  }

  await assignSupportConversation(tx, {
    conversationId: args.conversationId,
    assignedAdminId: nextAdmin.id,
    assignedByUserId: args.assignedByUserId ?? nextAdmin.id,
    eventType: SupportAssignmentEventType.AUTO_ASSIGN,
    note: args.note ?? "Assigned automatically.",
  });

  return nextAdmin;
}
