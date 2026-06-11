"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MessageSquare, RotateCw, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/formatting";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  SellerConversationRecord,
  useSellerMessagesStore,
} from "@/stores/seller-messages-store";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function getConversationDisplayName(
  conversation: SellerConversationRecord,
  sellerUserId: string | null,
) {
  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== sellerUserId,
  );

  if (otherParticipant?.role === "ADMIN") {
    return "AgriTec Support";
  }

  return (
    otherParticipant?.fullName ||
    conversation.subject ||
    `Conversation #${conversation.id}`
  );
}

export default function MessagesPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerUserId = useSellerAuthStore((state) => state.user?.id ?? null);
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
  const {
    conversations,
    messagesByConversationId,
    selectedConversationId,
    isLoadingConversations,
    isLoadingMessages,
    isSendingMessage,
    error,
    fetchConversations,
    fetchMessages,
    selectConversation,
    sendMessage,
    retryMessage,
    clearError,
  } = useSellerMessagesStore((state) => state);

  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isWindowActive, setIsWindowActive] = useState(true);

  useEffect(() => {
    if (!authReady || !sellerProfile) return;
    void fetchConversations();
  }, [authReady, sellerProfile, fetchConversations]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    clearError();
  }, [error, clearError]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const label = getConversationDisplayName(conversation, sellerUserId)
        .toLowerCase();
      const latestMessage = conversation.latestMessage?.body.toLowerCase() ?? "";
      return label.includes(query) || latestMessage.includes(query);
    });
  }, [conversations, searchQuery, sellerUserId]);

  const selectedConversation = useMemo(
    () =>
      selectedConversationId
        ? conversations.find((entry) => entry.id === selectedConversationId) ??
          null
        : null,
    [conversations, selectedConversationId],
  );

  const selectedMessages = selectedConversationId
    ? messagesByConversationId[selectedConversationId] ?? []
    : [];

  useEffect(() => {
    if (!selectedConversationId) return;
    void fetchMessages(selectedConversationId).catch(() => undefined);
  }, [selectedConversationId, fetchMessages]);

  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      selectConversation(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId, selectConversation]);
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowActive(true);
      void fetchConversations({ force: true });
      if (selectedConversationId) {
        void fetchMessages(selectedConversationId, { force: true });
      }
    };

    const handleBlur = () => setIsWindowActive(false);
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsWindowActive(visible);
      if (visible) {
        void fetchConversations({ force: true });
        if (selectedConversationId) {
          void fetchMessages(selectedConversationId, { force: true });
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchConversations, fetchMessages, selectedConversationId]);

  useEffect(() => {
    if (!authReady || !sellerProfile || !isWindowActive) return;

    const conversationInterval = window.setInterval(() => {
      void fetchConversations({ force: true });
    }, 12000);

    return () => window.clearInterval(conversationInterval);
  }, [authReady, sellerProfile, isWindowActive, fetchConversations]);

  useEffect(() => {
    if (!selectedConversationId || !isWindowActive) return;

    const messagesInterval = window.setInterval(() => {
      void fetchMessages(selectedConversationId, { force: true });
    }, 4000);

    return () => window.clearInterval(messagesInterval);
  }, [selectedConversationId, isWindowActive, fetchMessages]);

  async function handleSelectConversation(conversationId: string) {
    selectConversation(conversationId);
    try {
      await fetchMessages(conversationId);
    } catch {
      // store toast handles errors
    }
  }

  async function handleSendMessage() {
    const conversationId = selectedConversationId;
    const body = replyText.trim();
    if (!conversationId || !body) return;

    try {
      await sendMessage(
        conversationId,
        body,
        selectedConversation?.relatedParentOrderId ?? null,
      );
      setReplyText("");
      toast.success("Reply sent");
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to send reply",
      );
    }
  }
  async function handleRetryMessage(clientTempId: string) {
    if (!selectedConversationId) return;

    try {
      await retryMessage(selectedConversationId, clientTempId);
      toast.success("Message resent");
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to resend message",
      );
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="mt-2 text-muted-foreground">
            Buyers initiate chats. Sellers reply here for{" "}
            {sellerProfile?.farmName ?? "your farm"}.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="grid min-h-160 grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"
      >
        <Card className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search conversations..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="flex min-h-70 items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex min-h-70 flex-col items-center justify-center px-6 text-center">
                <MessageSquare className="mb-3 size-10 text-muted-foreground/60" />
                <p className="font-medium text-foreground">
                  No conversations yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Buyer messages will appear here once a conversation starts.
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const label = getConversationDisplayName(
                  conversation,
                  sellerUserId,
                );

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void handleSelectConversation(conversation.id)}
                    className={`w-full border-b border-border px-4 py-4 text-left transition-colors hover:bg-secondary/40 ${
                      selectedConversationId === conversation.id
                        ? "bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {label}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {conversation.latestMessage?.body ||
                            "No messages yet"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {conversation.lastMessageAt
                            ? formatDateTime(new Date(conversation.lastMessageAt))
                            : "No activity yet"}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="flex h-full flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="border-b border-border p-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {getConversationDisplayName(selectedConversation, sellerUserId)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedConversation.relatedParentOrderId
                    ? `Order reference: ${selectedConversation.relatedParentOrderId}`
                    : "Conversation history"}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingMessages && selectedMessages.length === 0 ? (
                  <div className="flex min-h-70 items-center justify-center">
                    <Spinner className="size-6" />
                  </div>
                ) : selectedMessages.length === 0 ? (
                  <div className="flex min-h-70 items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">
                      No messages yet in this conversation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedMessages.map((message) => {
                      const isMine = message.sender.id === sellerUserId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                              isMine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-muted text-foreground"
                            }`}
                          >
                            {!isMine ? (
                              <p className="mb-1 text-xs font-semibold opacity-80">
                                {message.sender.fullName}
                              </p>
                            ) : null}
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {message.body}
                            </p>
                            <p
                              className={`mt-2 text-xs ${
                                isMine
                                  ? "text-primary-foreground/75"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatDateTime(new Date(message.createdAt))}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border p-6">
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write your reply..."
                    disabled={isSendingMessage}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-0 transition focus:border-primary"
                  />
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={isSendingMessage || replyText.trim().length === 0}
                    className="w-full"
                  >
                    {isSendingMessage ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 size-4" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-90 flex-col items-center justify-center text-center">
              <MessageSquare className="mb-3 size-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Conversation history and replies will appear here.
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}




