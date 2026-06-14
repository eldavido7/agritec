"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export type SellerConversationParticipantRecord = {
  id: string;
  userId: string;
  role: string;
  fullName: string;
  email: string;
  phone: string | null;
  lastReadAt: string | null;
  isCurrentUser: boolean;
};

export type SellerConversationLatestMessageRecord = {
  id: string;
  type: string;
  body: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  relatedParentOrderId: string | null;
  createdAt: string;
} | null;

export type SellerConversationRecord = {
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
  participants: SellerConversationParticipantRecord[];
  latestMessage: SellerConversationLatestMessageRecord;
};

export type SellerMessageAttachmentInput = {
  secureUrl: string;
  publicId: string;
  mimeType?: string | null;
};
export type SellerConversationMessageRecord = {
  clientTempId?: string;
  deliveryState?: "sending" | "sent" | "failed";
  id: string;
  type: string;
  body: string;
  relatedParentOrderId: string | null;
  sender: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  attachments: {
    id: string;
    secureUrl: string;
    publicId: string;
    mimeType: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

type SellerMessagesState = {
  conversations: SellerConversationRecord[];
  messagesByConversationId: Record<string, SellerConversationMessageRecord[]>;
  selectedConversationId: string | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  loadedForUserId: string | null;
  fetchConversations: (options?: { force?: boolean }) => Promise<void>;
  fetchMessages: (
    conversationId: string,
    options?: { force?: boolean },
  ) => Promise<SellerConversationMessageRecord[]>;
  selectConversation: (conversationId: string | null) => void;
  sendMessage: (
    conversationId: string,
    body: string,
    relatedParentOrderId?: string | null,
    attachments?: SellerMessageAttachmentInput[],
  ) => Promise<SellerConversationMessageRecord>;
  retryMessage: (
    conversationId: string,
    clientTempId: string,
  ) => Promise<SellerConversationMessageRecord>;
  resetMessages: () => void;
  clearError: () => void;
};

function normalizeConversationParticipant(
  participant: Record<string, unknown>,
): SellerConversationParticipantRecord {
  return {
    id: String(participant.id ?? ""),
    userId: String(participant.userId ?? ""),
    role: String(participant.role ?? ""),
    fullName: String(participant.fullName ?? ""),
    email: String(participant.email ?? ""),
    phone: participant.phone == null ? null : String(participant.phone),
    lastReadAt:
      participant.lastReadAt == null ? null : String(participant.lastReadAt),
    isCurrentUser: Boolean(participant.isCurrentUser),
  };
}

function normalizeLatestMessage(
  message: Record<string, unknown> | null | undefined,
): SellerConversationLatestMessageRecord {
  if (!message) return null;

  return {
    id: String(message.id ?? ""),
    type: String(message.type ?? ""),
    body: String(message.body ?? ""),
    senderId: String(message.senderId ?? ""),
    senderName: String(message.senderName ?? ""),
    senderRole: String(message.senderRole ?? ""),
    relatedParentOrderId:
      message.relatedParentOrderId == null
        ? null
        : String(message.relatedParentOrderId),
    createdAt: String(message.createdAt ?? ""),
  };
}

function normalizeConversation(
  conversation: Record<string, unknown>,
): SellerConversationRecord {
  return {
    id: String(conversation.id ?? ""),
    type: String(conversation.type ?? ""),
    uniqueKey: String(conversation.uniqueKey ?? ""),
    subject: conversation.subject == null ? null : String(conversation.subject),
    relatedParentOrderId:
      conversation.relatedParentOrderId == null
        ? null
        : String(conversation.relatedParentOrderId),
    relatedSellerGroupId:
      conversation.relatedSellerGroupId == null
        ? null
        : String(conversation.relatedSellerGroupId),
    lastMessageAt:
      conversation.lastMessageAt == null
        ? null
        : String(conversation.lastMessageAt),
    createdAt: String(conversation.createdAt ?? ""),
    updatedAt: String(conversation.updatedAt ?? ""),
    unreadCount: Number(conversation.unreadCount ?? 0),
    participants: Array.isArray(conversation.participants)
      ? conversation.participants.map((participant) =>
          normalizeConversationParticipant(
            participant as Record<string, unknown>,
          ),
        )
      : [],
    latestMessage: normalizeLatestMessage(
      (conversation.latestMessage as Record<string, unknown> | null) ?? null,
    ),
  };
}

function normalizeMessage(
  message: Record<string, unknown>,
): SellerConversationMessageRecord {
  const sender =
    message.sender && typeof message.sender === "object"
      ? (message.sender as Record<string, unknown>)
      : {};

  return {
    id: String(message.id ?? ""),
    type: String(message.type ?? ""),
    body: String(message.body ?? ""),
    relatedParentOrderId:
      message.relatedParentOrderId == null
        ? null
        : String(message.relatedParentOrderId),
    sender: {
      id: String(sender.id ?? ""),
      fullName: String(sender.fullName ?? ""),
      email: String(sender.email ?? ""),
      role: String(sender.role ?? ""),
    },
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map((attachment) => {
          const entry = attachment as Record<string, unknown>;
          return {
            id: String(entry.id ?? ""),
            secureUrl: String(entry.secureUrl ?? ""),
            publicId: String(entry.publicId ?? ""),
            mimeType: String(entry.mimeType ?? ""),
            createdAt: String(entry.createdAt ?? ""),
          };
        })
      : [],
    createdAt: String(message.createdAt ?? ""),
    updatedAt: String(message.updatedAt ?? ""),
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function sortConversations(
  conversations: SellerConversationRecord[],
): SellerConversationRecord[] {
  return [...conversations].sort((a, b) => {
    const aDate = a.lastMessageAt || a.updatedAt || a.createdAt;
    const bDate = b.lastMessageAt || b.updatedAt || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

export const useSellerMessagesStore = create<SellerMessagesState>(
  (set, get) => ({
    conversations: [],
    messagesByConversationId: {},
    selectedConversationId: null,
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    error: null,
    loadedForUserId: null,

    fetchConversations: async (options) => {
      const token = useSellerAuthStore.getState().token;
      const userId = useSellerAuthStore.getState().user?.id ?? null;
      const state = get();
      const force = options?.force === true;

      if (!token || !userId) {
        console.warn("[Seller Messages] Fetch skipped: seller session not found");
        set({
          conversations: [],
          messagesByConversationId: {},
          selectedConversationId: null,
          isLoadingConversations: false,
          loadedForUserId: null,
          error: "Seller session not found",
        });
        return;
      }

      if (state.isLoadingConversations) {
        console.log(
          "[Seller Messages] Conversation fetch skipped: request already in progress",
          { userId },
        );
        return;
      }

      if (!force && state.loadedForUserId === userId) {
        console.log(
          "[Seller Messages] Conversation fetch skipped: using cached store state",
          { userId, count: state.conversations.length },
        );
        return;
      }

      console.log("[Seller Messages] Conversation fetch start", {
        userId,
        force,
      });
      set({ isLoadingConversations: true, error: null });

      try {
        const response = await sellerApiRequest<{
          success: true;
          conversations: Record<string, unknown>[];
        }>("/api/conversations", {
          method: "GET",
          token,
        });

        const conversations = sortConversations(
          (response.conversations ?? []).map(normalizeConversation),
        );

        console.log("[Seller Messages] Conversation fetch success", {
          userId,
          count: conversations.length,
        });

        set((state) => ({
          conversations,
          isLoadingConversations: false,
          loadedForUserId: userId,
          error: null,
          selectedConversationId:
            state.selectedConversationId &&
            conversations.some(
              (conversation) => conversation.id === state.selectedConversationId,
            )
              ? state.selectedConversationId
              : null,
        }));
      } catch (error) {
        console.error(
          "[Seller Messages] Conversation fetch failed",
          describeError(error),
        );
        set({
          isLoadingConversations: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load conversations",
        });
      }
    },

    fetchMessages: async (conversationId, options) => {
      const token = useSellerAuthStore.getState().token;
      if (!token) throw new Error("Seller session not found");

      const force = options?.force === true;
      const cached = get().messagesByConversationId[conversationId];
      if (!force && cached) {
        console.log("[Seller Messages] Messages fetch skipped: using cache", {
          conversationId,
          count: cached.length,
        });
        return cached;
      }

      console.log("[Seller Messages] Messages fetch start", { conversationId });
      set({ isLoadingMessages: true, error: null, selectedConversationId: conversationId });

      try {
        const response = await sellerApiRequest<{
          success: true;
          messages: Record<string, unknown>[];
        }>(`/api/conversations/${conversationId}/messages`, {
          method: "GET",
          token,
        });

        const messages = (response.messages ?? []).map(normalizeMessage);

        console.log("[Seller Messages] Messages fetch success", {
          conversationId,
          count: messages.length,
        });

        set((state) => {
          const localFailedMessages = (state.messagesByConversationId[conversationId] ?? []).filter(
            (entry) => entry.deliveryState === "failed",
          );

          return {
            messagesByConversationId: {
              ...state.messagesByConversationId,
              [conversationId]: [...messages, ...localFailedMessages],
            },
            conversations: state.conversations.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
            isLoadingMessages: false,
            error: null,
          };
        });

        return messages;
      } catch (error) {
        console.error("[Seller Messages] Messages fetch failed", {
          conversationId,
          error: describeError(error),
        });
        set({
          isLoadingMessages: false,
          error:
            error instanceof Error ? error.message : "Unable to load messages",
        });
        throw error;
      }
    },

    selectConversation: (conversationId) =>
      set({ selectedConversationId: conversationId }),

    sendMessage: async (conversationId, body, relatedParentOrderId, attachments = []) => {
      const token = useSellerAuthStore.getState().token;
      const currentUser = useSellerAuthStore.getState().user;
      if (!token || !currentUser) throw new Error("Seller session not found");

      const trimmedBody = body.trim();
      if (!trimmedBody && attachments.length === 0) {
        throw new Error("Message cannot be empty");
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticTimestamp = new Date().toISOString();
      const optimisticMessage: SellerConversationMessageRecord = {
        clientTempId: tempId,
        deliveryState: "sending",
        id: tempId,
        type: attachments.length > 0 && !trimmedBody ? "IMAGE" : "TEXT",
        body: trimmedBody,
        relatedParentOrderId: relatedParentOrderId ?? null,
        sender: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        },
        attachments: attachments.map((attachment, index) => ({
          id: `temp-attachment-${tempId}-${index}`,
          secureUrl: attachment.secureUrl,
          publicId: attachment.publicId,
          mimeType: attachment.mimeType ?? "",
          createdAt: optimisticTimestamp,
        })),
        createdAt: optimisticTimestamp,
        updatedAt: optimisticTimestamp,
      };

      console.log("[Seller Messages] Send message start", {
        conversationId,
        relatedParentOrderId: relatedParentOrderId ?? null,
        clientTempId: tempId,
        attachmentCount: attachments.length,
      });

      set((state) => {
        const existingMessages = state.messagesByConversationId[conversationId] ?? [];
        const conversations = state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessageAt: optimisticTimestamp,
                latestMessage: {
                  id: tempId,
                  type: optimisticMessage.type,
                  body: trimmedBody || "Sent an attachment",
                  senderId: currentUser.id,
                  senderName: currentUser.fullName,
                  senderRole: currentUser.role,
                  relatedParentOrderId: relatedParentOrderId ?? null,
                  createdAt: optimisticTimestamp,
                },
              }
            : conversation,
        );

        return {
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: [...existingMessages, optimisticMessage],
          },
          conversations: sortConversations(conversations),
          isSendingMessage: true,
          error: null,
        };
      });

      try {
        const response = await sellerApiRequest<{
          success: true;
          message: Record<string, unknown>;
        }>(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          token,
          body: JSON.stringify({
            body: trimmedBody || null,
            type: optimisticMessage.type,
            relatedParentOrderId: relatedParentOrderId ?? null,
            attachments,
          }),
        });

        const message = normalizeMessage(response.message);

        console.log("[Seller Messages] Send message success", {
          conversationId,
          messageId: message.id,
          clientTempId: tempId,
        });

        set((state) => {
          const existingMessages = state.messagesByConversationId[conversationId] ?? [];
          const conversations = state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessageAt: message.createdAt,
                  latestMessage: {
                    id: message.id,
                    type: message.type,
                    body: message.body || "Sent an attachment",
                    senderId: message.sender.id,
                    senderName: message.sender.fullName,
                    senderRole: message.sender.role,
                    relatedParentOrderId: message.relatedParentOrderId,
                    createdAt: message.createdAt,
                  },
                }
              : conversation,
          );

          return {
            messagesByConversationId: {
              ...state.messagesByConversationId,
              [conversationId]: existingMessages.map((entry) =>
                entry.clientTempId === tempId ? { ...message, deliveryState: "sent" } : entry,
              ),
            },
            conversations: sortConversations(conversations),
            isSendingMessage: false,
            error: null,
          };
        });

        return { ...message, deliveryState: "sent" };
      } catch (error) {
        console.error("[Seller Messages] Send message failed", {
          conversationId,
          error: describeError(error),
          clientTempId: tempId,
        });
        set((state) => ({
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: (state.messagesByConversationId[conversationId] ?? []).map((entry) =>
              entry.clientTempId === tempId
                ? { ...entry, deliveryState: "failed" }
                : entry,
            ),
          },
          isSendingMessage: false,
          error:
            error instanceof Error ? error.message : "Unable to send message",
        }));
        throw error;
      }
    },

    retryMessage: async (conversationId, clientTempId) => {
      const message = (get().messagesByConversationId[conversationId] ?? []).find(
        (entry) => entry.clientTempId === clientTempId,
      );
      if (!message) {
        throw new Error("Message not found for retry");
      }

      set((state) => ({
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: (state.messagesByConversationId[conversationId] ?? []).filter(
            (entry) => entry.clientTempId !== clientTempId,
          ),
        },
      }));

      return get().sendMessage(
        conversationId,
        message.body,
        message.relatedParentOrderId ?? null,
        message.attachments.map((attachment) => ({
          secureUrl: attachment.secureUrl,
          publicId: attachment.publicId,
          mimeType: attachment.mimeType,
        })),
      );
    },

    resetMessages: () => {
      console.log("[Seller Messages] Reset store state");
      set({
        conversations: [],
        messagesByConversationId: {},
        selectedConversationId: null,
        isLoadingConversations: false,
        isLoadingMessages: false,
        isSendingMessage: false,
        error: null,
        loadedForUserId: null,
      });
    },

    clearError: () => set({ error: null }),
  }),
);








