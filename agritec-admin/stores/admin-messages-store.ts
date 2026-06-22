"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

export type AdminConversationParticipantRecord = {
  id: string;
  userId: string;
  role: string;
  fullName: string;
  email: string;
  phone: string | null;
  lastReadAt: string | null;
  isCurrentUser: boolean;
};

export type AdminSupportSummaryRecord = {
  lifecycleStatus: "ACTIVE" | "RESOLVED";
  queueState: "ASSIGNED" | "UNASSIGNED";
  currentAssignedAdmin: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    lastActiveAt: string | null;
  } | null;
  responseDueAt: string | null;
  latestEventType: string | null;
} | null;

export type AdminConversationRecord = {
  id: string;
  type: string;
  uniqueKey: string;
  subject: string | null;
  relatedParentOrderId: string | null;
  relatedSellerGroupId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  participants: AdminConversationParticipantRecord[];
  latestMessage: {
    id: string;
    type: string;
    body: string | null;
    senderId: string;
    senderName: string;
    senderRole: string;
    relatedParentOrderId: string | null;
    createdAt: string;
  } | null;
  support: AdminSupportSummaryRecord;
};

export type AdminMessageAttachmentInput = {
  secureUrl: string;
  publicId: string;
  mimeType?: string | null;
};

export type AdminConversationMessageRecord = {
  id: string;
  type: string;
  body: string | null;
  relatedParentOrderId: string | null;
  sender: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  attachments: Array<{
    id: string;
    secureUrl: string;
    publicId: string;
    mimeType: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  optimistic?: boolean;
  failed?: boolean;
};

export type AdminSupportAssignmentEventRecord = {
  id: string;
  eventType: string;
  note: string | null;
  responseDueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  assignedAdmin: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    lastActiveAt: string | null;
  } | null;
  assignedByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export type AdminSupportInternalCommentRecord = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type AdminSupportConversationDetailRecord = {
  conversation: AdminConversationRecord;
  assignments: AdminSupportAssignmentEventRecord[];
  internalComments: AdminSupportInternalCommentRecord[];
};

type AdminMessagesState = {
  conversations: AdminConversationRecord[];
  messagesByConversationId: Record<string, AdminConversationMessageRecord[]>;
  detailsByConversationId: Record<string, AdminSupportConversationDetailRecord>;
  isLoading: boolean;
  isMessagesLoading: boolean;
  isSending: boolean;
  isCreating: boolean;
  isUpdatingSupport: boolean;
  error: string | null;
  loaded: boolean;
  fetchConversations: (options?: { force?: boolean }) => Promise<void>;
  fetchMessages: (
    conversationId: string,
    options?: { force?: boolean },
  ) => Promise<AdminConversationMessageRecord[]>;
  fetchConversationDetail: (
    conversationId: string,
    options?: { force?: boolean },
  ) => Promise<AdminSupportConversationDetailRecord>;
  sendMessage: (
    conversationId: string,
    body: string,
    attachments?: AdminMessageAttachmentInput[],
  ) => Promise<void>;
  createConversation: (payload: {
    participantType: "buyer" | "seller";
    participantId: string;
    subject?: string | null;
    initialMessage?: string | null;
    relatedParentOrderId?: string | null;
  }) => Promise<AdminConversationRecord>;
  addInternalComment: (
    conversationId: string,
    body: string,
  ) => Promise<AdminSupportInternalCommentRecord>;
  updateSupportConversation: (
    conversationId: string,
    payload: {
      action: "claim" | "assign" | "reassign" | "unassign" | "resolve" | "reopen";
      assignedAdminId?: string | null;
      note?: string | null;
    },
  ) => Promise<void>;
  resetMessages: () => void;
  clearError: () => void;
};

function normalizeParticipant(participant: any): AdminConversationParticipantRecord {
  return {
    id: String(participant.id),
    userId: String(participant.userId),
    role: String(participant.role || ""),
    fullName: String(participant.fullName || ""),
    email: String(participant.email || ""),
    phone: participant.phone ? String(participant.phone) : null,
    lastReadAt: participant.lastReadAt ? String(participant.lastReadAt) : null,
    isCurrentUser: Boolean(participant.isCurrentUser),
  };
}

function normalizeSupportSummary(
  support: any,
): AdminSupportSummaryRecord {
  if (!support) return null;
  return {
    lifecycleStatus:
      String(support.lifecycleStatus || "ACTIVE").toUpperCase() === "RESOLVED"
        ? "RESOLVED"
        : "ACTIVE",
    queueState:
      String(support.queueState || "UNASSIGNED").toUpperCase() === "ASSIGNED"
        ? "ASSIGNED"
        : "UNASSIGNED",
    currentAssignedAdmin: support.currentAssignedAdmin
      ? {
          id: String(support.currentAssignedAdmin.id || ""),
          fullName: String(support.currentAssignedAdmin.fullName || ""),
          email: String(support.currentAssignedAdmin.email || ""),
          isActive: Boolean(support.currentAssignedAdmin.isActive),
          lastActiveAt: support.currentAssignedAdmin.lastActiveAt
            ? String(support.currentAssignedAdmin.lastActiveAt)
            : null,
        }
      : null,
    responseDueAt: support.responseDueAt ? String(support.responseDueAt) : null,
    latestEventType: support.latestEventType
      ? String(support.latestEventType)
      : null,
  };
}

function normalizeConversation(conversation: any): AdminConversationRecord {
  return {
    id: String(conversation.id),
    type: String(conversation.type || ""),
    uniqueKey: String(conversation.uniqueKey || ""),
    subject: conversation.subject ? String(conversation.subject) : null,
    relatedParentOrderId: conversation.relatedParentOrderId
      ? String(conversation.relatedParentOrderId)
      : null,
    relatedSellerGroupId: conversation.relatedSellerGroupId
      ? String(conversation.relatedSellerGroupId)
      : null,
    lastMessageAt: conversation.lastMessageAt ? String(conversation.lastMessageAt) : null,
    createdAt: String(conversation.createdAt || ""),
    updatedAt: String(conversation.updatedAt || ""),
    unreadCount: Number(conversation.unreadCount || 0),
    participants: Array.isArray(conversation.participants)
      ? conversation.participants.map(normalizeParticipant)
      : [],
    latestMessage: conversation.latestMessage
      ? {
          id: String(conversation.latestMessage.id),
          type: String(conversation.latestMessage.type || ""),
          body: conversation.latestMessage.body
            ? String(conversation.latestMessage.body)
            : null,
          senderId: String(conversation.latestMessage.senderId || ""),
          senderName: String(conversation.latestMessage.senderName || ""),
          senderRole: String(conversation.latestMessage.senderRole || ""),
          relatedParentOrderId: conversation.latestMessage.relatedParentOrderId
            ? String(conversation.latestMessage.relatedParentOrderId)
            : null,
          createdAt: String(conversation.latestMessage.createdAt || ""),
        }
      : null,
    support: normalizeSupportSummary(conversation.support),
  };
}

function normalizeMessage(message: any): AdminConversationMessageRecord {
  return {
    id: String(message.id),
    type: String(message.type || "TEXT"),
    body: message.body ? String(message.body) : null,
    relatedParentOrderId: message.relatedParentOrderId
      ? String(message.relatedParentOrderId)
      : null,
    sender: {
      id: String(message.sender?.id || ""),
      fullName: String(message.sender?.fullName || ""),
      email: String(message.sender?.email || ""),
      role: String(message.sender?.role || ""),
    },
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map((attachment: any) => ({
          id: String(attachment.id),
          secureUrl: String(attachment.secureUrl || ""),
          publicId: String(attachment.publicId || ""),
          mimeType: attachment.mimeType ? String(attachment.mimeType) : null,
          createdAt: String(attachment.createdAt || ""),
        }))
      : [],
    createdAt: String(message.createdAt || ""),
    updatedAt: String(message.updatedAt || ""),
  };
}

function normalizeAssignment(
  assignment: any,
): AdminSupportAssignmentEventRecord {
  return {
    id: String(assignment.id),
    eventType: String(assignment.eventType || ""),
    note: assignment.note ? String(assignment.note) : null,
    responseDueAt: assignment.responseDueAt
      ? String(assignment.responseDueAt)
      : null,
    resolvedAt: assignment.resolvedAt ? String(assignment.resolvedAt) : null,
    createdAt: String(assignment.createdAt || ""),
    assignedAdmin: assignment.assignedAdmin
      ? {
          id: String(assignment.assignedAdmin.id || ""),
          fullName: String(assignment.assignedAdmin.fullName || ""),
          email: String(assignment.assignedAdmin.email || ""),
          isActive: Boolean(assignment.assignedAdmin.isActive),
          lastActiveAt: assignment.assignedAdmin.lastActiveAt
            ? String(assignment.assignedAdmin.lastActiveAt)
            : null,
        }
      : null,
    assignedByUser: assignment.assignedByUser
      ? {
          id: String(assignment.assignedByUser.id || ""),
          fullName: String(assignment.assignedByUser.fullName || ""),
          email: String(assignment.assignedByUser.email || ""),
        }
      : null,
  };
}

function normalizeInternalComment(
  comment: any,
): AdminSupportInternalCommentRecord {
  return {
    id: String(comment.id),
    body: String(comment.body || ""),
    createdAt: String(comment.createdAt || ""),
    updatedAt: String(comment.updatedAt || ""),
    author: {
      id: String(comment.author?.id || ""),
      fullName: String(comment.author?.fullName || ""),
      email: String(comment.author?.email || ""),
      role: String(comment.author?.role || ""),
    },
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminMessagesStore = create<AdminMessagesState>((set, get) => ({
  conversations: [],
  messagesByConversationId: {},
  detailsByConversationId: {},
  isLoading: false,
  isMessagesLoading: false,
  isSending: false,
  isCreating: false,
  isUpdatingSupport: false,
  error: null,
  loaded: false,

  fetchConversations: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({
        conversations: [],
        messagesByConversationId: {},
        detailsByConversationId: {},
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
      });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded) {
      console.log("[Admin Messages] Fetch skipped: using cached store state", {
        count: state.conversations.length,
      });
      return;
    }

    const shouldShowLoading =
      !force || !state.loaded || state.conversations.length === 0;

    console.log("[Admin Messages] Fetch start", { force, shouldShowLoading });
    set({ isLoading: shouldShowLoading, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        conversations: any[];
      }>("/api/admin/conversations", {
        method: "GET",
        token,
      });

      const conversations = response.conversations.map(normalizeConversation);

      set({
        conversations,
        isLoading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error("[Admin Messages] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unable to load conversations",
      });
    }
  },

  fetchMessages: async (conversationId, options) => {
    const detail = await get().fetchConversationDetail(conversationId, options);
    return get().messagesByConversationId[detail.conversation.id] ?? [];
  },

  fetchConversationDetail: async (conversationId, options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const existing = get().detailsByConversationId[conversationId];

    if (!token) {
      throw new Error("Admin session not found");
    }

    if (!force && existing) {
      return existing;
    }

    const shouldShowLoading =
      !force ||
      !existing ||
      !(get().messagesByConversationId[conversationId]?.length > 0);

    set({ isMessagesLoading: shouldShowLoading, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        conversation: any;
        messages: any[];
        assignments: any[];
        internalComments: any[];
      }>(`/api/admin/conversations/${conversationId}`, {
        method: "GET",
        token,
      });

      const detail: AdminSupportConversationDetailRecord = {
        conversation: normalizeConversation(response.conversation),
        assignments: (response.assignments ?? []).map(normalizeAssignment),
        internalComments: (response.internalComments ?? []).map(
          normalizeInternalComment,
        ),
      };
      const messages = (response.messages ?? []).map(normalizeMessage);

      set((state) => ({
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId ? detail.conversation : conversation,
        ),
        detailsByConversationId: {
          ...state.detailsByConversationId,
          [conversationId]: detail,
        },
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: messages,
        },
        isMessagesLoading: false,
        error: null,
      }));

      return detail;
    } catch (error) {
      console.error("[Admin Messages] Detail fetch failed", {
        conversationId,
        error: describeError(error),
      });
      set({
        isMessagesLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load conversation detail",
      });
      throw error;
    }
  },

  sendMessage: async (conversationId, body, attachments = []) => {
    const token = useAdminAuthStore.getState().token;
    const currentUser = useAdminAuthStore.getState().user;
    if (!token || !currentUser) {
      throw new Error("Admin session not found");
    }

    const trimmedBody = body.trim();
    if (!trimmedBody && attachments.length === 0) {
      throw new Error("Message cannot be empty");
    }

    const optimisticMessage: AdminConversationMessageRecord = {
      id: `optimistic-${Date.now()}`,
      type: attachments.length > 0 && !trimmedBody ? "IMAGE" : "TEXT",
      body: trimmedBody || null,
      relatedParentOrderId: null,
      sender: {
        id: String(currentUser.id),
        fullName: String(currentUser.fullName),
        email: String(currentUser.email),
        role: String(currentUser.role),
      },
      attachments: attachments.map((attachment, index) => ({
        id: `temp-attachment-${conversationId}-${index}`,
        secureUrl: attachment.secureUrl,
        publicId: attachment.publicId,
        mimeType: attachment.mimeType ?? null,
        createdAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      optimistic: true,
      failed: false,
    };

    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: [
          ...(state.messagesByConversationId[conversationId] || []),
          optimisticMessage,
        ],
      },
      isSending: true,
      error: null,
    }));

    try {
      const response = await adminApiRequest<{
        success: true;
        message: any;
      }>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({
          body: trimmedBody || null,
          type: optimisticMessage.type,
          attachments,
        }),
      });

      const saved = normalizeMessage(response.message);
      set((state) => ({
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: (state.messagesByConversationId[conversationId] || []).map(
            (message) => (message.id === optimisticMessage.id ? saved : message),
          ),
        },
        isSending: false,
        error: null,
      }));

      await get().fetchConversationDetail(conversationId, { force: true });
      await get().fetchConversations({ force: true });
    } catch (error) {
      set((state) => ({
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: (state.messagesByConversationId[conversationId] || []).map(
            (message) =>
              message.id === optimisticMessage.id
                ? { ...message, optimistic: false, failed: true }
                : message,
          ),
        },
        isSending: false,
        error: error instanceof Error ? error.message : "Unable to send message",
      }));
      throw error;
    }
  },

  createConversation: async (payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    set({ isCreating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        conversation: any;
      }>("/api/admin/conversations", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      const conversation = normalizeConversation(response.conversation);
      await get().fetchConversations({ force: true });
      set({ isCreating: false, error: null });
      return conversation;
    } catch (error) {
      set({
        isCreating: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create conversation",
      });
      throw error;
    }
  },

  addInternalComment: async (conversationId, body) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    set({ isUpdatingSupport: true, error: null });
    try {
      const response = await adminApiRequest<{
        success: true;
        comment: any;
      }>(`/api/admin/conversations/${conversationId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ body }),
      });

      const comment = normalizeInternalComment(response.comment);
      set((state) => ({
        detailsByConversationId: {
          ...state.detailsByConversationId,
          [conversationId]: state.detailsByConversationId[conversationId]
            ? {
                ...state.detailsByConversationId[conversationId],
                internalComments: [
                  comment,
                  ...state.detailsByConversationId[conversationId].internalComments,
                ],
              }
            : state.detailsByConversationId[conversationId],
        },
        isUpdatingSupport: false,
        error: null,
      }));
      return comment;
    } catch (error) {
      set({
        isUpdatingSupport: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to add internal comment",
      });
      throw error;
    }
  },

  updateSupportConversation: async (conversationId, payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    set({ isUpdatingSupport: true, error: null });
    try {
      await adminApiRequest<{ success: true }>(
        `/api/admin/conversations/${conversationId}/assignment`,
        {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        },
      );

      await get().fetchConversationDetail(conversationId, { force: true });
      await get().fetchConversations({ force: true });
      set({ isUpdatingSupport: false, error: null });
    } catch (error) {
      set({
        isUpdatingSupport: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update support conversation",
      });
      throw error;
    }
  },

  resetMessages: () => {
    set({
      conversations: [],
      messagesByConversationId: {},
      detailsByConversationId: {},
      isLoading: false,
      isMessagesLoading: false,
      isSending: false,
      isCreating: false,
      isUpdatingSupport: false,
      error: null,
      loaded: false,
    });
  },

  clearError: () => set({ error: null }),
}));
