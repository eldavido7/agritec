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

type AdminMessagesState = {
  conversations: AdminConversationRecord[];
  messagesByConversationId: Record<string, AdminConversationMessageRecord[]>;
  isLoading: boolean;
  isMessagesLoading: boolean;
  isSending: boolean;
  isCreating: boolean;
  error: string | null;
  loaded: boolean;
  fetchConversations: (options?: { force?: boolean }) => Promise<void>;
  fetchMessages: (
    conversationId: string,
    options?: { force?: boolean },
  ) => Promise<AdminConversationMessageRecord[]>;
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

function normalizeConversation(conversation: any): AdminConversationRecord {
  return {
    id: String(conversation.id),
    type: String(conversation.type || ""),
    uniqueKey: String(conversation.uniqueKey || ""),
    subject: conversation.subject ? String(conversation.subject) : null,
    relatedParentOrderId: conversation.relatedParentOrderId ? String(conversation.relatedParentOrderId) : null,
    relatedSellerGroupId: conversation.relatedSellerGroupId ? String(conversation.relatedSellerGroupId) : null,
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
          body: conversation.latestMessage.body ? String(conversation.latestMessage.body) : null,
          senderId: String(conversation.latestMessage.senderId || ""),
          senderName: String(conversation.latestMessage.senderName || ""),
          senderRole: String(conversation.latestMessage.senderRole || ""),
          relatedParentOrderId: conversation.latestMessage.relatedParentOrderId
            ? String(conversation.latestMessage.relatedParentOrderId)
            : null,
          createdAt: String(conversation.latestMessage.createdAt || ""),
        }
      : null,
  };
}

function normalizeMessage(message: any): AdminConversationMessageRecord {
  return {
    id: String(message.id),
    type: String(message.type || "TEXT"),
    body: message.body ? String(message.body) : null,
    relatedParentOrderId: message.relatedParentOrderId ? String(message.relatedParentOrderId) : null,
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

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminMessagesStore = create<AdminMessagesState>((set, get) => ({
  conversations: [],
  messagesByConversationId: {},
  isLoading: false,
  isMessagesLoading: false,
  isSending: false,
  isCreating: false,
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

    const shouldShowLoading = !force || !state.loaded || state.conversations.length === 0;

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

      const currentAdminId = useAdminAuthStore.getState().user?.id ?? null;
      const conversations = response.conversations
        .map(normalizeConversation)
        .filter((conversation) =>
          conversation.participants.some(
            (participant) =>
              participant.isCurrentUser &&
              participant.role.toUpperCase() === "ADMIN" &&
              (!currentAdminId || participant.userId === currentAdminId),
          ),
        )
        .filter(
          (conversation) =>
            !(
              conversation.latestMessage == null &&
              conversation.uniqueKey.startsWith("admin-seller:")
            ),
        );

      console.log("[Admin Messages] Fetch success", {
        count: conversations.length,
        conversationIds: conversations.map((conversation) => conversation.id),
      });

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
        error: error instanceof Error ? error.message : "Unable to load conversations",
      });
    }
  },

  fetchMessages: async (conversationId, options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const existing = get().messagesByConversationId[conversationId];

    if (!token) {
      throw new Error("Admin session not found");
    }

    if (!force && existing?.length) {
      console.log("[Admin Messages] Message fetch skipped: using cached messages", {
        conversationId,
        count: existing.length,
      });
      return existing;
    }

    const shouldShowLoading = !force || !existing || existing.length === 0;

    console.log("[Admin Messages] Message fetch start", {
      conversationId,
      force,
      shouldShowLoading,
    });
    set({ isMessagesLoading: shouldShowLoading, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        messages: any[];
      }>(`/api/conversations/${conversationId}/messages`, {
        method: "GET",
        token,
      });

      const messages = response.messages.map(normalizeMessage);
      console.log("[Admin Messages] Message fetch success", {
        conversationId,
        count: messages.length,
      });

      set((state) => ({
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: messages,
        },
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
        isMessagesLoading: false,
        error: null,
      }));

      return messages;
    } catch (error) {
      console.error("[Admin Messages] Message fetch failed", {
        conversationId,
        error: describeError(error),
      });
      set({
        isMessagesLoading: false,
        error: error instanceof Error ? error.message : "Unable to load messages",
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
          [conversationId]: (state.messagesByConversationId[conversationId] || []).map((message) =>
            message.id === optimisticMessage.id ? saved : message,
          ),
        },
        isSending: false,
        error: null,
      }));

      await get().fetchConversations({ force: true });
      console.log("[Admin Messages] Send success", {
        conversationId,
        messageId: saved.id,
      });
    } catch (error) {
      console.error("[Admin Messages] Send failed", {
        conversationId,
        error: describeError(error),
      });
      set((state) => ({
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: (state.messagesByConversationId[conversationId] || []).map((message) =>
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

    console.log("[Admin Messages] Create conversation start", payload);
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
      console.log("[Admin Messages] Create conversation success", {
        conversationId: conversation.id,
      });

      await get().fetchConversations({ force: true });
      set({ isCreating: false, error: null });
      return conversation;
    } catch (error) {
      console.error("[Admin Messages] Create conversation failed", {
        payload,
        error: describeError(error),
      });
      set({
        isCreating: false,
        error: error instanceof Error ? error.message : "Unable to create conversation",
      });
      throw error;
    }
  },

  resetMessages: () => {
    set({
      conversations: [],
      messagesByConversationId: {},
      isLoading: false,
      isMessagesLoading: false,
      isSending: false,
      isCreating: false,
      error: null,
      loaded: false,
    });
  },

  clearError: () => set({ error: null }),
}));
