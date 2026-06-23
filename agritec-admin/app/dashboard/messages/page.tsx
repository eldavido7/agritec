"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { adminUploadRequest } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAdminsStore } from "@/stores/admin-admins-store";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { useAdminBuyersStore } from "@/stores/admin-buyers-store";
import {
  AdminConversationRecord,
  AdminMessageAttachmentInput,
  useAdminMessagesStore,
} from "@/stores/admin-messages-store";
import { useAdminSellersStore } from "@/stores/admin-sellers-store";

const CHAT_ATTACHMENT_LIMIT_BYTES = 10 * 1024 * 1024;
const ALLOWED_CHAT_ATTACHMENT_MIME_TYPES = ["application/pdf"] as const;

type QueueTab = "all" | "assigned" | "unassigned" | "resolved";

type PendingAttachment = Partial<AdminMessageAttachmentInput> & {
  id: string;
  file?: File;
  previewUrl?: string;
  isLocalDraft?: boolean;
  originalFilename: string;
};

function formatTimestamp(value: string | null) {
  if (!value) return "No activity yet";
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function getConversationCounterparty(conversation: AdminConversationRecord) {
  const nonAdmins = conversation.participants.filter(
    (participant) => participant.role.toUpperCase() !== "ADMIN",
  );
  return nonAdmins[0] ?? conversation.participants[0] ?? null;
}

function getConversationTitle(conversation: AdminConversationRecord) {
  const participant = getConversationCounterparty(conversation);
  return participant?.fullName || conversation.subject || "Support conversation";
}

function getQueueLabel(conversation: AdminConversationRecord, currentAdminId: string | null) {
  if (!conversation.support) return "support";
  if (conversation.support.lifecycleStatus === "RESOLVED") return "resolved";
  if (
    conversation.support.queueState === "ASSIGNED" &&
    conversation.support.currentAssignedAdmin?.id === currentAdminId
  ) {
    return "assigned to you";
  }
  if (conversation.support.queueState === "ASSIGNED") return "assigned";
  return "unassigned";
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const adminToken = useAdminAuthStore((state) => state.token);
  const currentAdmin = useAdminAuthStore((state) => state.user);
  const buyers = useAdminBuyersStore((state) => state.buyers);
  const sellers = useAdminSellersStore((state) => state.sellers);
  const admins = useAdminAdminsStore((state) => state.admins);
  const fetchBuyers = useAdminBuyersStore((state) => state.fetchBuyers);
  const fetchSellers = useAdminSellersStore((state) => state.fetchSellers);
  const fetchAdmins = useAdminAdminsStore((state) => state.fetchAdmins);
  const conversations = useAdminMessagesStore((state) => state.conversations);
  const detailsByConversationId = useAdminMessagesStore(
    (state) => state.detailsByConversationId,
  );
  const messagesByConversationId = useAdminMessagesStore(
    (state) => state.messagesByConversationId,
  );
  const isLoading = useAdminMessagesStore((state) => state.isLoading);
  const isMessagesLoading = useAdminMessagesStore(
    (state) => state.isMessagesLoading,
  );
  const isSending = useAdminMessagesStore((state) => state.isSending);
  const isCreating = useAdminMessagesStore((state) => state.isCreating);
  const isUpdatingSupport = useAdminMessagesStore(
    (state) => state.isUpdatingSupport,
  );
  const fetchConversations = useAdminMessagesStore(
    (state) => state.fetchConversations,
  );
  const fetchConversationDetail = useAdminMessagesStore(
    (state) => state.fetchConversationDetail,
  );
  const sendMessage = useAdminMessagesStore((state) => state.sendMessage);
  const createConversation = useAdminMessagesStore(
    (state) => state.createConversation,
  );
  const addInternalComment = useAdminMessagesStore(
    (state) => state.addInternalComment,
  );
  const updateSupportConversation = useAdminMessagesStore(
    (state) => state.updateSupportConversation,
  );

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>("assigned");
  const [searchTerm, setSearchTerm] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [newChatMode, setNewChatMode] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [internalCommentInput, setInternalCommentInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [assignmentTargetAdminId, setAssignmentTargetAdminId] = useState<string>("");

  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);

  const currentAdminId = currentAdmin?.id ?? null;

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
    node.scrollTo({ top: node.scrollHeight, behavior });
  }

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      cleanupPendingAttachments(pendingAttachmentsRef.current);
    };
  }, []);

  useEffect(() => {
    void fetchConversations();
    void fetchBuyers();
    void fetchSellers();
    void fetchAdmins();
  }, [fetchAdmins, fetchBuyers, fetchConversations, fetchSellers]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void fetchConversations({ force: true });
        if (selectedConversationId) {
          void fetchConversationDetail(selectedConversationId, { force: true });
        }
      }
    };

    const interval = window.setInterval(refresh, 12000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchConversationDetail, fetchConversations, selectedConversationId]);

  useEffect(() => {
    const conversationId = searchParams.get("conversationId");
    if (conversationId) {
      setSelectedConversationId(conversationId);
      void fetchConversationDetail(conversationId, { force: true });
    }
  }, [fetchConversationDetail, searchParams]);

  useEffect(() => {
    if (!selectedConversationId || !detailsByConversationId[selectedConversationId]) {
      return;
    }
    const assignedAdminId =
      detailsByConversationId[selectedConversationId].conversation.support
        ?.currentAssignedAdmin?.id ?? "";
    setAssignmentTargetAdminId(assignedAdminId);
  }, [detailsByConversationId, selectedConversationId]);

  const participants = useMemo(
    () => [
      ...sellers.map((seller) => ({
        id: seller.id,
        userId: seller.userId,
        name: seller.fullName,
        type: "seller" as const,
        email: seller.email,
        phone: seller.phone || "",
      })),
      ...buyers.map((buyer) => ({
        id: buyer.id,
        userId: buyer.userId,
        name: buyer.fullName,
        type: "buyer" as const,
        email: buyer.email,
        phone: buyer.phone || "",
      })),
    ],
    [buyers, sellers],
  );

  const filteredParticipants = participants.filter((participant) =>
    `${participant.name} ${participant.email} ${participant.phone}`
      .toLowerCase()
      .includes(participantSearch.toLowerCase()),
  );

  const filteredConversations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return conversations
      .filter((conversation) => {
        const support = conversation.support;
        if (!support) return false;

        if (queueTab === "assigned") {
          return (
            support.lifecycleStatus === "ACTIVE" &&
            support.queueState === "ASSIGNED" &&
            support.currentAssignedAdmin?.id === currentAdminId
          );
        }
        if (queueTab === "unassigned") {
          return (
            support.lifecycleStatus === "ACTIVE" &&
            support.queueState === "UNASSIGNED"
          );
        }
        if (queueTab === "resolved") {
          return support.lifecycleStatus === "RESOLVED";
        }
        return true;
      })
      .filter((conversation) => {
        if (!query) return true;
        const searchBase = `${getConversationTitle(conversation)} ${
          conversation.subject || ""
        } ${conversation.latestMessage?.body || ""}`;
        return searchBase.toLowerCase().includes(query);
      });
  }, [conversations, currentAdminId, queueTab, searchTerm]);

  const currentDetail = selectedConversationId
    ? detailsByConversationId[selectedConversationId] ?? null
    : null;
  const currentConversation = currentDetail?.conversation ?? null;
  const currentMessages = selectedConversationId
    ? messagesByConversationId[selectedConversationId] ?? []
    : [];
  const currentCounterparty = currentConversation
    ? getConversationCounterparty(currentConversation)
    : null;

  const canReplyPublicly = Boolean(
    currentConversation &&
      currentConversation.support &&
      (currentConversation.support.lifecycleStatus === "RESOLVED" ||
        currentConversation.support.queueState === "UNASSIGNED" ||
        currentConversation.support.currentAssignedAdmin?.id === currentAdminId),
  );

  async function handleOpenConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setNewChatMode(false);
    cleanupPendingAttachments(pendingAttachments);
    setPendingAttachments([]);
    try {
      await fetchConversationDetail(conversationId, { force: true });
      window.setTimeout(() => scrollMessagesToBottom("auto"), 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load conversation",
      );
    }
  }

  async function handleCreateConversation(
    participantId: string,
    participantType: "buyer" | "seller",
  ) {
    try {
      const conversation = await createConversation({
        participantId,
        participantType,
      });
      setSelectedConversationId(conversation.id);
      setNewChatMode(false);
      setParticipantSearch("");
      await fetchConversationDetail(conversation.id, { force: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create support conversation",
      );
    }
  }

  async function handleSupportAction(
    action: "claim" | "assign" | "reassign" | "unassign" | "resolve" | "reopen",
  ) {
    if (!selectedConversationId) return;
    try {
      await updateSupportConversation(selectedConversationId, {
        action,
        assignedAdminId:
          action === "assign" || action === "reassign"
            ? assignmentTargetAdminId || null
            : null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update support queue",
      );
    }
  }

  async function handleAddInternalComment() {
    if (!selectedConversationId || !internalCommentInput.trim()) return;
    try {
      await addInternalComment(selectedConversationId, internalCommentInput);
      setInternalCommentInput("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add internal note",
      );
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
    if (!selectedConversationId) return;
    const body = messageInput.trim();
    if (!body && pendingAttachments.length === 0) return;
    if (!adminToken) {
      toast.error("Admin session not found");
      return;
    }

    try {
      setIsUploadingAttachment(true);
      const uploadedAttachments: AdminMessageAttachmentInput[] =
        await Promise.all(
          pendingAttachments.map(async (attachment) => {
            if (attachment.file) {
              const result = await adminUploadRequest(
                attachment.file,
                "chat",
                adminToken,
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

      await sendMessage(selectedConversationId, body, uploadedAttachments);
      setMessageInput("");
      cleanupPendingAttachments(pendingAttachments);
      setPendingAttachments([]);
      window.setTimeout(() => scrollMessagesToBottom("smooth"), 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col overflow-hidden gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground">
            Support queue for buyer and seller conversations handled by admins.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setNewChatMode((current) => !current)}
        >
          <Plus className="h-4 w-4" />
          {newChatMode ? "Close" : "New Support Thread"}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base">Support Queue</CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {(["assigned", "unassigned", "resolved", "all"] as QueueTab[]).map(
                (tab) => (
                  <Button
                    key={tab}
                    type="button"
                    size="sm"
                    variant={queueTab === tab ? "default" : "outline"}
                    onClick={() => setQueueTab(tab)}
                  >
                    {tab}
                  </Button>
                ),
              )}
            </div>

            {newChatMode ? (
              <div className="space-y-3 pb-4">
                <Input
                  placeholder="Search buyers or sellers..."
                  value={participantSearch}
                  onChange={(event) => setParticipantSearch(event.target.value)}
                />
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 bg-background p-2">
                  {filteredParticipants.map((participant) => (
                    <button
                      key={`${participant.type}-${participant.id}`}
                      type="button"
                      onClick={() =>
                        void handleCreateConversation(
                          participant.id,
                          participant.type,
                        )
                      }
                      className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {participant.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {participant.type}
                          </p>
                        </div>
                        <span className="rounded-full bg-secondary/10 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-secondary-foreground">
                          {participant.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search support conversations..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void handleOpenConversation(conversation.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selectedConversationId === conversation.id
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {getConversationTitle(conversation)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {conversation.latestMessage?.body || "No messages yet"}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{getQueueLabel(conversation, currentAdminId)}</span>
                          <span>•</span>
                          <span>
                            {formatTimestamp(
                              conversation.lastMessageAt || conversation.updatedAt,
                            )}
                          </span>
                        </div>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Loading support queue...</span>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  No conversations found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {currentConversation ? (
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {getConversationTitle(currentConversation)}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentCounterparty?.role?.toLowerCase() || "support"} •{" "}
                    {getQueueLabel(currentConversation, currentAdminId)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      selectedConversationId &&
                      void fetchConversationDetail(selectedConversationId, {
                        force: true,
                      })
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  {currentConversation.support?.queueState === "UNASSIGNED" &&
                  currentConversation.support.lifecycleStatus === "ACTIVE" ? (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => void handleSupportAction("claim")}
                      disabled={isUpdatingSupport}
                    >
                      <UserCheck className="h-4 w-4" />
                      Claim
                    </Button>
                  ) : null}
                  {currentConversation.support?.lifecycleStatus === "ACTIVE" &&
                  currentConversation.support.currentAssignedAdmin?.id ===
                    currentAdminId ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSupportAction("unassign")}
                        disabled={isUpdatingSupport}
                      >
                        Return to Queue
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleSupportAction("resolve")}
                        disabled={isUpdatingSupport}
                      >
                        Resolve
                      </Button>
                    </>
                  ) : null}
                  {currentConversation.support?.lifecycleStatus === "RESOLVED" ? (
                    <Button
                      size="sm"
                      onClick={() => void handleSupportAction("reopen")}
                      disabled={isUpdatingSupport}
                    >
                      Reopen
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={assignmentTargetAdminId}
                  onChange={(event) =>
                    setAssignmentTargetAdminId(event.target.value)
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select admin</option>
                  {admins
                    .filter((admin) => admin.isActive)
                    .map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.fullName}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!assignmentTargetAdminId || isUpdatingSupport}
                  onClick={() =>
                    void handleSupportAction(
                      currentConversation.support?.queueState === "ASSIGNED"
                        ? "reassign"
                        : "assign",
                    )
                  }
                >
                  <UserPlus className="h-4 w-4" />
                  {currentConversation.support?.queueState === "ASSIGNED"
                    ? "Reassign"
                    : "Assign"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/50">
                <div
                  ref={messagesScrollRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4"
                >
                  {isMessagesLoading && currentMessages.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                      <Spinner className="size-4" />
                      <span>Loading messages...</span>
                    </div>
                  ) : currentMessages.length > 0 ? (
                    currentMessages.map((message) => {
                      const isMine = message.sender.id === currentAdminId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-md px-4 py-2 ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground"
                            }`}
                          >
                            {message.body ? (
                              <p className="whitespace-pre-wrap text-sm">
                                {message.body}
                              </p>
                            ) : null}
                            {message.attachments.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map((attachment) =>
                                  isImageMimeType(attachment.mimeType) ? (
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
                                        width={400}
                                        height={400}
                                        className="max-h-72 w-full object-cover"
                                      />
                                    </button>
                                  ) : (
                                    <a
                                      key={attachment.id}
                                      href={attachment.secureUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                                    >
                                      <FileText className="h-4 w-4 shrink-0" />
                                      <span className="truncate">
                                        Document attachment
                                      </span>
                                      <ExternalLink className="ml-auto h-4 w-4 shrink-0" />
                                    </a>
                                  ),
                                )}
                              </div>
                            ) : null}
                            <div className="mt-2 flex items-center gap-2">
                              <p className="text-xs opacity-75">
                                {formatTimestamp(message.createdAt)}
                              </p>
                              {message.failed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-red-200">
                                  <AlertCircle className="h-3 w-3" />
                                  Failed
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                      No messages yet.
                    </div>
                  )}
                </div>

                <div className="border-t border-border/50 bg-background p-4">
                  {!canReplyPublicly ? (
                    <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                      This thread is assigned to another admin. Add an internal note
                      or reassign it before sending a public reply.
                    </div>
                  ) : null}

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
                      {pendingAttachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/20 px-3 py-2 text-xs"
                        >
                          {isImageMimeType(attachment.mimeType) &&
                          attachment.previewUrl ? (
                            <Image
                              src={attachment.previewUrl}
                              alt={attachment.originalFilename}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : isImageMimeType(attachment.mimeType) ? (
                            <FileImage className="h-3.5 w-3.5" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
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
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      placeholder="Type your public reply..."
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      disabled={
                        isSending || isUploadingAttachment || !canReplyPublicly
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={
                        isUploadingAttachment ||
                        isSending ||
                        !canReplyPublicly ||
                        pendingAttachments.length >= 10
                      }
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => void handleSendMessage()}
                      disabled={
                        isSending ||
                        isUploadingAttachment ||
                        !canReplyPublicly ||
                        (!messageInput.trim() && pendingAttachments.length === 0)
                      }
                    >
                      {isSending || isUploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/50">
                <div className="border-b border-border/50 p-4">
                  <h3 className="font-medium">Internal Notes</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Visible to admins only.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
                  {currentDetail?.assignments.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Assignment History
                      </p>
                      {currentDetail.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-md border border-border/50 p-3 text-sm"
                        >
                          <p className="font-medium">{assignment.eventType}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {assignment.assignedAdmin?.fullName || "Queue"} •{" "}
                            {formatTimestamp(assignment.createdAt)}
                          </p>
                          {assignment.note ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {assignment.note}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Comments
                    </p>
                    {currentDetail?.internalComments.length ? (
                      currentDetail.internalComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-md border border-border/50 p-3 text-sm"
                        >
                          <p className="whitespace-pre-wrap">{comment.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {comment.author.fullName} •{" "}
                            {formatTimestamp(comment.createdAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No internal notes yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/50 p-4">
                  <textarea
                    rows={3}
                    value={internalCommentInput}
                    onChange={(event) => setInternalCommentInput(event.target.value)}
                    placeholder="Add internal note..."
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    onClick={() => void handleAddInternalComment()}
                    disabled={isUpdatingSupport || !internalCommentInput.trim()}
                  >
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex min-h-0 items-center justify-center overflow-hidden">
            <CardContent className="text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Select a support conversation to open the queue workspace.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

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
            <X className="h-5 w-5" />
          </button>
          <Image
            src={previewImageUrl}
            alt="Chat attachment preview"
            width={400}
            height={400}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
