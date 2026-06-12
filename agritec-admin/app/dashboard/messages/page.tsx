"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Search, Send, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminBuyersStore } from "@/stores/admin-buyers-store";
import { useAdminMessagesStore } from "@/stores/admin-messages-store";
import { useAdminSellersStore } from "@/stores/admin-sellers-store";

function formatTimestamp(value: string | null) {
  if (!value) return "No messages yet";
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const buyers = useAdminBuyersStore((state) => state.buyers);
  const sellers = useAdminSellersStore((state) => state.sellers);
  const fetchBuyers = useAdminBuyersStore((state) => state.fetchBuyers);
  const fetchSellers = useAdminSellersStore((state) => state.fetchSellers);
  const conversations = useAdminMessagesStore((state) => state.conversations);
  const messagesByConversationId = useAdminMessagesStore((state) => state.messagesByConversationId);
  const isLoading = useAdminMessagesStore((state) => state.isLoading);
  const isMessagesLoading = useAdminMessagesStore((state) => state.isMessagesLoading);
  const isSending = useAdminMessagesStore((state) => state.isSending);
  const isCreating = useAdminMessagesStore((state) => state.isCreating);
  const fetchConversations = useAdminMessagesStore((state) => state.fetchConversations);
  const fetchMessages = useAdminMessagesStore((state) => state.fetchMessages);
  const sendMessage = useAdminMessagesStore((state) => state.sendMessage);
  const createConversation = useAdminMessagesStore((state) => state.createConversation);
  const [searchTerm, setSearchTerm] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [newChatMode, setNewChatMode] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [conversationPage, setConversationPage] = useState(1);
  const conversationsPerPage = 10;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchConversations();
    void fetchBuyers();
    void fetchSellers();
  }, [fetchBuyers, fetchConversations, fetchSellers]);

  useEffect(() => {
    const refreshConversations = () => {
      if (document.visibilityState === "visible") {
        void fetchConversations({ force: true });
      }
    };

    const interval = window.setInterval(refreshConversations, 12000);
    window.addEventListener("focus", refreshConversations);
    document.addEventListener("visibilitychange", refreshConversations);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshConversations);
      document.removeEventListener("visibilitychange", refreshConversations);
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;

    void fetchMessages(selectedConversationId, { force: true });
    const refreshMessages = () => {
      if (document.visibilityState === "visible") {
        void fetchMessages(selectedConversationId, { force: true });
        void fetchConversations({ force: true });
      }
    };

    const interval = window.setInterval(refreshMessages, 4000);
    window.addEventListener("focus", refreshMessages);
    document.addEventListener("visibilitychange", refreshMessages);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshMessages);
      document.removeEventListener("visibilitychange", refreshMessages);
    };
  }, [fetchConversations, fetchMessages, selectedConversationId]);

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

  useEffect(() => {
    const participantType = searchParams.get("participantType");
    const participantId = searchParams.get("participantId");
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      setSelectedConversationId(conversationId);
      setNewChatMode(false);
      return;
    }

    if (participantType && participantId && conversations.length > 0) {
      const matchedParticipant = participants.find(
        (participant) =>
          participant.id === participantId && participant.type === participantType,
      );
      const conversation = conversations.find((entry) =>
        entry.participants.some(
          (participant) =>
            !participant.isCurrentUser &&
            participant.userId ===
              (matchedParticipant?.userId ?? participantId) &&
            participant.role === participantType.toUpperCase(),
        ),
      );
      if (conversation) {
        setSelectedConversationId(conversation.id);
        setNewChatMode(false);
      }
    }
  }, [conversations, participants, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversationId, messagesByConversationId]);

  const filteredParticipants = participants.filter((participant) =>
    `${participant.name} ${participant.email} ${participant.phone}`
      .toLowerCase()
      .includes(participantSearch.toLowerCase()),
  );

  const filteredConversations = conversations.filter((conversation) => {
    const otherParticipant = conversation.participants.find(
      (participant) => !participant.isCurrentUser,
    );
    const searchBase = `${otherParticipant?.fullName || ""} ${conversation.subject || ""} ${conversation.latestMessage?.body || ""}`;
    return searchBase.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalConversationPages = Math.max(
    1,
    Math.ceil(filteredConversations.length / conversationsPerPage),
  );
  const paginatedConversations = filteredConversations.slice(
    (conversationPage - 1) * conversationsPerPage,
    conversationPage * conversationsPerPage,
  );

  useEffect(() => {
    setConversationPage(1);
  }, [searchTerm, newChatMode]);

  const currentConversation = selectedConversationId
    ? conversations.find((conversation) => conversation.id === selectedConversationId) || null
    : null;
  const currentMessages = selectedConversationId
    ? messagesByConversationId[selectedConversationId] || []
    : [];
  const currentParticipant = currentConversation?.participants.find(
    (participant) => !participant.isCurrentUser,
  );

  const handleOpenConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setNewChatMode(false);
    try {
      await fetchMessages(conversationId, { force: true });
      await fetchConversations({ force: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load messages",
      );
    }
  };

  const handleCreateConversation = async (participantId: string, participantType: "buyer" | "seller") => {
    try {
      const conversation = await createConversation({
        participantId,
        participantType,
      });
      setSelectedConversationId(conversation.id);
      setNewChatMode(false);
      setParticipantSearch("");
      await fetchMessages(conversation.id, { force: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create conversation",
      );
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    const body = messageInput.trim();
    setMessageInput("");
    try {
      await sendMessage(selectedConversationId, body);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
      setMessageInput(body);
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground">
            Communicate with sellers and buyers
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setNewChatMode((current) => !current)}
          className="gap-2"
        >
          {isCreating ? (
            <Spinner className="size-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {newChatMode ? "Close" : "New Chat"}
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-3">
        <Card className="flex min-h-0 flex-col border-border/50 lg:col-span-1">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
            {newChatMode ? (
              <div className="space-y-3 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search buyers or sellers..."
                    value={participantSearch}
                    onChange={(event) => setParticipantSearch(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 bg-background p-2">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((participant) => (
                      <button
                        key={`${participant.type}-${participant.id}`}
                        type="button"
                        onClick={() =>
                          void handleCreateConversation(participant.id, participant.type)
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
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No participants found.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {paginatedConversations.length > 0 ? (
                paginatedConversations.map((conversation) => {
                  const participant = conversation.participants.find(
                    (entry) => !entry.isCurrentUser,
                  );
                  const title = participant?.fullName || conversation.subject || "Conversation";
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => void handleOpenConversation(conversation.id)}
                      className={`min-h-24 w-full rounded-md p-3 text-left transition-colors ${
                        selectedConversationId === conversation.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold">
                          {title.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium">{title}</p>
                            {conversation.unreadCount > 0 ? (
                              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                {conversation.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs opacity-80">
                            {conversation.latestMessage?.body || "No messages yet"}
                          </p>
                          <p className="mt-2 text-xs opacity-70">
                            {formatTimestamp(conversation.lastMessageAt || conversation.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Loading conversations...</span>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  No conversations found.
                </div>
              )}
            </div>
            {filteredConversations.length > conversationsPerPage ? (
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {conversationPage} of {totalConversationPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={conversationPage === 1}
                    onClick={() => setConversationPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={conversationPage === totalConversationPages}
                    onClick={() => setConversationPage((prev) => Math.min(totalConversationPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {currentConversation ? (
          <Card className="flex min-h-0 flex-col border-border/50 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold">
                  {(currentParticipant?.fullName || "C").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {currentParticipant?.fullName || currentConversation.subject || "Conversation"}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {currentParticipant?.role?.toLowerCase() || currentConversation.type.toLowerCase()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => selectedConversationId && void fetchMessages(selectedConversationId, { force: true })}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
              {isMessagesLoading && currentMessages.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Loading messages...</span>
                </div>
              ) : currentMessages.length > 0 ? (
                currentMessages.map((message) => {
                  const isMine = message.sender.role === "ADMIN";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-md px-4 py-2 ${
                          isMine
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.body}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p
                            className={`text-xs ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
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
                  Start the conversation with {currentParticipant?.fullName || "this contact"}.
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-border/50 bg-background p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSendMessage();
                    }
                  }}
                />
                <Button onClick={() => void handleSendMessage()} className="gap-2" disabled={isSending}>
                  {isSending ? <Spinner className="size-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center border-border/50 lg:col-span-2">
            <CardContent className="text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Select a conversation or start a new chat
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
