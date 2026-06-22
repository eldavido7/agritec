"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronDown,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/formatting";
import { sellerUploadRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  SellerConversationRecord,
  SellerMessageAttachmentInput,
  useSellerMessagesStore,
} from "@/stores/seller-messages-store";
import Image from "next/image";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const CHAT_ATTACHMENT_LIMIT_BYTES = 10 * 1024 * 1024;
const ALLOWED_CHAT_ATTACHMENT_MIME_TYPES = ["application/pdf"] as const;

type PendingAttachment = Partial<SellerMessageAttachmentInput> & {
  id: string;
  file?: File;
  previewUrl?: string;
  isLocalDraft?: boolean;
  originalFilename: string;
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

function isImageMimeType(mimeType: string | null | undefined) {
  return Boolean(mimeType && mimeType.toLowerCase().startsWith("image/"));
}

function isAllowedChatAttachment(file: File) {
  return (
    file.type.startsWith("image/") ||
    ALLOWED_CHAT_ATTACHMENT_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_CHAT_ATTACHMENT_MIME_TYPES)[number],
    )
  );
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MessagesPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerToken = useSellerAuthStore((state) => state.token);
  const sellerUserId = useSellerAuthStore((state) => state.user?.id ?? null);
  const sellerProfile = useSellerAuthStore(
    (state) => state.user?.sellerProfile,
  );

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
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showNewMessageJump, setShowNewMessageJump] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const previousConversationRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);

  function cleanupPendingAttachments(attachments: PendingAttachment[]) {
    for (const attachment of attachments) {
      if (attachment.isLocalDraft && attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = "smooth") {
    const node = messagesScrollRef.current;
    if (!node) return;

    node.scrollTo({
      top: node.scrollHeight,
      behavior,
    });
  }

  function isNearMessagesBottom() {
    const node = messagesScrollRef.current;
    if (!node) return true;

    return node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  }

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

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
      const label = getConversationDisplayName(
        conversation,
        sellerUserId,
      ).toLowerCase();
      const latestMessage =
        conversation.latestMessage?.body.toLowerCase() ?? "";

      return label.includes(query) || latestMessage.includes(query);
    });
  }, [conversations, searchQuery, sellerUserId]);

  const selectedConversation = useMemo(
    () =>
      selectedConversationId
        ? (conversations.find((entry) => entry.id === selectedConversationId) ??
          null)
        : null,
    [conversations, selectedConversationId],
  );

  const selectedMessages = selectedConversationId
    ? (messagesByConversationId[selectedConversationId] ?? [])
    : [];

  useEffect(() => {
    const count = selectedMessages.length;
    const conversationChanged =
      previousConversationRef.current !== selectedConversationId;

    if (conversationChanged) {
      previousConversationRef.current = selectedConversationId;
      previousMessageCountRef.current = count;
      setShowNewMessageJump(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollMessagesToBottom("auto"));
      });
      return;
    }

    if (count > previousMessageCountRef.current && !isNearMessagesBottom()) {
      setShowNewMessageJump(true);
    }

    previousMessageCountRef.current = count;
  }, [selectedConversationId, selectedMessages.length]);

  useEffect(() => {
    if (!selectedConversationId) return;

    void fetchMessages(selectedConversationId).catch(() => undefined);

    setPendingAttachments((current) => {
      cleanupPendingAttachments(current);
      return [];
    });
  }, [selectedConversationId, fetchMessages]);

  useEffect(() => {
    return () => {
      cleanupPendingAttachments(pendingAttachmentsRef.current);
    };
  }, []);

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

  async function handleAttachmentSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const currentCount = pendingAttachments.length;
    if (currentCount >= 10) {
      toast.error("You can attach up to 10 files per message");
      return;
    }

    const nextDrafts: PendingAttachment[] = [];

    for (const file of files.slice(0, 10 - currentCount)) {
      if (!isAllowedChatAttachment(file)) {
        toast.error("Only images and PDF documents are allowed in chat.");
        continue;
      }

      if (file.size > CHAT_ATTACHMENT_LIMIT_BYTES) {
        toast.error(
          `Each chat attachment must be ${formatFileSize(
            CHAT_ATTACHMENT_LIMIT_BYTES,
          )} or less.`,
        );
        continue;
      }

      const previewUrl = URL.createObjectURL(file);

      nextDrafts.push({
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl,
        secureUrl: previewUrl,
        mimeType: file.type,
        originalFilename: file.name,
        isLocalDraft: true,
      });
    }

    if (nextDrafts.length === 0) return;

    setPendingAttachments((current) => [...current, ...nextDrafts]);

    toast.success(
      nextDrafts.length === 1
        ? "Attachment added. It will upload when you send the message."
        : `${nextDrafts.length} attachments added. They will upload when you send the message.`,
    );
  }

  function handleRemovePendingAttachment(attachmentId: string) {
    setPendingAttachments((current) => {
      const attachment = current.find((entry) => entry.id === attachmentId);

      if (attachment?.isLocalDraft && attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }

      return current.filter((entry) => entry.id !== attachmentId);
    });
  }

  async function handleSendMessage() {
    const conversationId = selectedConversationId;
    const body = replyText.trim();

    if (!conversationId || (!body && pendingAttachments.length === 0)) return;

    if (!sellerToken) {
      toast.error("Seller session not found");
      return;
    }

    try {
      setIsUploadingAttachment(true);

      const uploadedAttachments: SellerMessageAttachmentInput[] =
        await Promise.all(
          pendingAttachments.map(async (attachment) => {
            if (attachment.file) {
              const result = await sellerUploadRequest(
                attachment.file,
                "chat",
                sellerToken,
              );

              return {
                secureUrl: result.asset.secureUrl,
                publicId: result.asset.publicId,
                mimeType: result.asset.mimeType ?? attachment.file.type,
              };
            }

            return {
              secureUrl: attachment.secureUrl ?? "",
              publicId: attachment.publicId ?? "",
              mimeType: attachment.mimeType ?? null,
            };
          }),
        );

      await sendMessage(
        conversationId,
        body,
        selectedConversation?.relatedParentOrderId ?? null,
        uploadedAttachments,
      );

      setReplyText("");
      cleanupPendingAttachments(pendingAttachments);
      setPendingAttachments([]);
      window.setTimeout(() => scrollMessagesToBottom("smooth"), 0);
      toast.success("Reply sent");
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to send reply",
      );
    } finally {
      setIsUploadingAttachment(false);
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
    <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col space-y-6 overflow-hidden">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="shrink-0"
      >
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
        className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]"
      >
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border p-4">
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

          <div className="min-h-0 flex-1 overflow-y-auto">
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
                    onClick={() =>
                      void handleSelectConversation(conversation.id)
                    }
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
                            ? formatDateTime(
                                new Date(conversation.lastMessageAt),
                              )
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

        <Card className="flex min-h-0 flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="shrink-0 border-b border-border p-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {getConversationDisplayName(
                    selectedConversation,
                    sellerUserId,
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedConversation.relatedParentOrderId
                    ? `Order reference: ${selectedConversation.relatedParentOrderId}`
                    : "Conversation history"}
                </p>
              </div>

              <div
                ref={messagesScrollRef}
                onScroll={() => {
                  if (isNearMessagesBottom()) setShowNewMessageJump(false);
                }}
                className="relative min-h-0 flex-1 overflow-y-auto overflow-anchor-none p-6"
              >
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

                            {message.body ? (
                              <p className="whitespace-pre-wrap text-sm leading-6">
                                {message.body}
                              </p>
                            ) : null}

                            {message.attachments.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map((attachment) => {
                                  const image = isImageMimeType(
                                    attachment.mimeType,
                                  );

                                  return image ? (
                                    <button
                                      key={attachment.id}
                                      type="button"
                                      onClick={() =>
                                        setPreviewImageUrl(attachment.secureUrl)
                                      }
                                      className="block overflow-hidden rounded-xl border border-white/15"
                                    >
                                      <Image
                                        src={attachment.secureUrl}
                                        alt="Chat attachment"
                                        className="max-h-64 w-full object-cover"
                                        width={400}
                                        height={400}
                                      />
                                    </button>
                                  ) : (
                                    <a
                                      key={attachment.id}
                                      href={attachment.secureUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                        isMine
                                          ? "border-white/15 bg-white/10 text-primary-foreground"
                                          : "border-border bg-background text-foreground"
                                      }`}
                                    >
                                      <FileText className="size-4 shrink-0" />
                                      <span className="truncate">
                                        Document attachment
                                      </span>
                                      <ExternalLink className="ml-auto size-4 shrink-0" />
                                    </a>
                                  );
                                })}
                              </div>
                            ) : null}

                            <div className="mt-2 flex items-center gap-2">
                              <p
                                className={`text-xs ${
                                  isMine
                                    ? "text-primary-foreground/75"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatDateTime(new Date(message.createdAt))}
                              </p>

                              {message.deliveryState === "failed" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    message.clientTempId
                                      ? void handleRetryMessage(
                                          message.clientTempId,
                                        )
                                      : undefined
                                  }
                                  className={`text-xs font-medium underline ${
                                    isMine
                                      ? "text-primary-foreground/85"
                                      : "text-destructive"
                                  }`}
                                >
                                  Retry
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showNewMessageJump ? (
                  <button
                    type="button"
                    onClick={() => {
                      scrollMessagesToBottom("smooth");
                      setShowNewMessageJump(false);
                    }}
                    className="sticky bottom-3 left-1/2 z-10 mx-auto flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg"
                  >
                    New message
                    <ChevronDown className="size-4" />
                  </button>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-border p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,application/pdf"
                  onChange={(event) => void handleAttachmentSelection(event)}
                />

                {pendingAttachments.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pendingAttachments.map((attachment) => {
                      const image = isImageMimeType(attachment.mimeType);

                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/30 px-3 py-2 text-xs"
                        >
                          {image && attachment.previewUrl ? (
                            <Image
                              src={attachment.previewUrl}
                              alt={attachment.originalFilename}
                              className="size-10 rounded-lg object-cover"
                              width={40}
                              height={40}
                            />
                          ) : image ? (
                            <FileImage className="size-3.5" />
                          ) : (
                            <FileText className="size-3.5" />
                          )}

                          <span className="max-w-44 truncate">
                            {attachment.originalFilename}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemovePendingAttachment(attachment.id)
                            }
                            className="rounded-full p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write your reply..."
                    disabled={isSendingMessage || isUploadingAttachment}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-0 transition focus:border-primary"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={
                        isUploadingAttachment ||
                        isSendingMessage ||
                        pendingAttachments.length >= 10
                      }
                    >
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <Paperclip className="mr-2 size-4" />
                          Attach file
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => void handleSendMessage()}
                      disabled={
                        isSendingMessage ||
                        isUploadingAttachment ||
                        (replyText.trim().length === 0 &&
                          pendingAttachments.length === 0)
                      }
                      className="w-full sm:w-auto"
                    >
                      {isSendingMessage || isUploadingAttachment ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {isUploadingAttachment
                            ? "Uploading..."
                            : "Sending..."}
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
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
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

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setPreviewImageUrl(null)}
          >
            <X className="size-5" />
          </button>

          <Image
            src={previewImageUrl}
            alt="Chat attachment preview"
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            width={400}
            height={400}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
