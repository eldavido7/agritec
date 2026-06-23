import {
  ConversationType,
  Prisma,
  PrismaClient,
  SupportAssignmentEventType,
  SupportConversationStatus,
  UserRole,
} from "@prisma/client";
import {
  getSupportConversationWithHistory,
  unassignSupportConversation,
} from "@/lib/support-utils";

type AdminQueryClient = Prisma.TransactionClient | PrismaClient;

export type AdminHistorySummary = {
  hasHistoricalRecords: boolean;
  canDelete: boolean;
  historicalRecordCount: number;
  activeAssignedSupportConversationCount: number;
};

export async function getAdminHistorySummary(
  db: AdminQueryClient,
  adminUserId: string,
): Promise<AdminHistorySummary> {
  const [
    auditLogs,
    approvedWithdrawals,
    updatedOrderStatuses,
    handledSupportAssignments,
    createdSupportAssignments,
    supportComments,
    notifications,
    sentMessages,
    conversationParticipations,
  ] = await Promise.all([
    db.auditLog.count({ where: { adminId: adminUserId } }),
    db.withdrawalRequest.count({ where: { approvedByAdminId: adminUserId } }),
    db.orderGroupStatusHistory.count({ where: { updatedByUserId: adminUserId } }),
    db.supportConversationAssignment.count({
      where: { assignedAdminId: adminUserId },
    }),
    db.supportConversationAssignment.count({
      where: { assignedByUserId: adminUserId },
    }),
    db.supportInternalComment.count({ where: { authorUserId: adminUserId } }),
    db.notification.count({ where: { userId: adminUserId } }),
    db.message.count({ where: { senderId: adminUserId } }),
    db.conversationParticipant.count({ where: { userId: adminUserId } }),
  ]);

  const activeSupportConversations = await db.conversation.findMany({
    where: {
      type: {
        in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT],
      },
      supportStatus: SupportConversationStatus.ACTIVE,
      assignments: {
        some: { assignedAdminId: adminUserId },
      },
    },
    select: {
      id: true,
      assignments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          assignedAdminId: true,
          eventType: true,
        },
      },
    },
  });

  const activeAssignedSupportConversationCount = activeSupportConversations.filter(
    (conversation) => {
      const latest = conversation.assignments[0];
      if (!latest || latest.assignedAdminId !== adminUserId) return false;
      return (
        latest.eventType === SupportAssignmentEventType.AUTO_ASSIGN ||
        latest.eventType === SupportAssignmentEventType.MANUAL_ASSIGN ||
        latest.eventType === SupportAssignmentEventType.CLAIM ||
        latest.eventType === SupportAssignmentEventType.REASSIGN
      );
    },
  ).length;

  const historicalRecordCount =
    auditLogs +
    approvedWithdrawals +
    updatedOrderStatuses +
    handledSupportAssignments +
    createdSupportAssignments +
    supportComments +
    notifications +
    sentMessages +
    conversationParticipations;

  return {
    hasHistoricalRecords: historicalRecordCount > 0,
    canDelete: historicalRecordCount === 0,
    historicalRecordCount,
    activeAssignedSupportConversationCount,
  };
}

export async function releaseAdminSupportAssignments(
  tx: Prisma.TransactionClient,
  args: {
    adminUserId: string;
    actorAdminId: string;
    note?: string | null;
  },
) {
  const conversations = await tx.conversation.findMany({
    where: {
      type: {
        in: [ConversationType.BUYER_SUPPORT, ConversationType.SELLER_SUPPORT],
      },
      supportStatus: SupportConversationStatus.ACTIVE,
      assignments: {
        some: { assignedAdminId: args.adminUserId },
      },
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
  });

  let releasedCount = 0;

  for (const conversation of conversations) {
    const detailed = await getSupportConversationWithHistory(tx, conversation.id);
    if (!detailed) continue;

    const latest = detailed.assignments[0];
    const isCurrentlyAssignedToAdmin =
      latest &&
      latest.assignedAdminId === args.adminUserId &&
      (latest.eventType === "AUTO_ASSIGN" ||
        latest.eventType === "MANUAL_ASSIGN" ||
        latest.eventType === "CLAIM" ||
        latest.eventType === "REASSIGN");

    if (!isCurrentlyAssignedToAdmin) continue;

    await unassignSupportConversation(tx, {
      conversationId: conversation.id,
      assignedByUserId: args.actorAdminId,
      note:
        args.note ??
        "Conversation returned to queue because the assigned admin was disabled.",
    });
    releasedCount += 1;
  }

  return releasedCount;
}
