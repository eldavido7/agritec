"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buyers, farmers, messages as initialMessages } from "@/lib/mock-data";
import { MessageCircle, Search, Send, Plus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ParticipantType = "seller" | "buyer";

// isoTimestamp is used purely for sorting; timestamp is the display string
type Message = (typeof initialMessages)[number] & {
  mine?: boolean;
  isoTimestamp?: string;
};

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantType: ParticipantType;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
}

interface Participant {
  id: string;
  name: string;
  type: ParticipantType;
  email: string;
  phone: string;
}

const formatTimestamp = () =>
  new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const getAdminConversationId = (
  participantType: ParticipantType,
  participantId: string,
) => `admin-${participantType}-${participantId}`;

// Returns a reliable sort key: isoTimestamp if present, otherwise falls back
// to the raw timestamp string (mock data uses ISO format so it parses fine)
const getSortKey = (message: Message) =>
  message.isoTimestamp
    ? new Date(message.isoTimestamp).getTime()
    : new Date(message.timestamp).getTime();

export default function MessagesPage() {
  const searchParams = useSearchParams();

  const [readSet, setReadSet] = useState<Set<string>>(
    () => new Set(initialMessages.filter((m) => m.read).map((m) => m.id)),
  );
  const [localMessages, setLocalMessages] =
    useState<Message[]>(initialMessages);

  const [searchTerm, setSearchTerm] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [newChatMode, setNewChatMode] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [conversationPage, setConversationPage] = useState(1);
  const conversationsPerPage = 10;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const participants = useMemo<Participant[]>(
    () => [
      ...farmers.map((farmer) => ({
        id: farmer.id,
        name: farmer.name,
        type: "seller" as ParticipantType,
        email: farmer.email,
        phone: farmer.phone,
      })),
      ...buyers.map((buyer) => ({
        id: buyer.id,
        name: buyer.name,
        type: "buyer" as ParticipantType,
        email: buyer.email,
        phone: buyer.phone,
      })),
    ],
    [],
  );

  const conversations = useMemo<Conversation[]>(() => {
    return participants
      .map((participant) => {
        const participantMessages = localMessages.filter(
          (message) =>
            (message.senderType === participant.type &&
              message.senderId === participant.id) ||
            (message.recipientType === participant.type &&
              message.recipientId === participant.id),
        );

        const latestMessage = [...participantMessages].sort(
          (a, b) => getSortKey(b) - getSortKey(a),
        )[0];

        const unread = participantMessages.filter(
          (message) =>
            !readSet.has(message.id) && message.senderType === participant.type,
        ).length;

        return {
          id: getAdminConversationId(participant.type, participant.id),
          participantId: participant.id,
          participantName: participant.name,
          participantType: participant.type,
          lastMessage:
            latestMessage?.message ||
            `Start a new conversation with ${participant.name}`,
          timestamp: latestMessage?.timestamp || "",
          unread,
          avatar: participant.name.slice(0, 1).toUpperCase(),
        };
      })
      .sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
  }, [localMessages, participants, readSet]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setNewChatMode(false);

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const unreadIds = localMessages
      .filter(
        (message) =>
          !readSet.has(message.id) &&
          message.senderType === conversation.participantType &&
          message.senderId === conversation.participantId,
      )
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      setReadSet((prev) => {
        const next = new Set(prev);
        unreadIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  useEffect(() => {
    const rawParticipantType = searchParams.get("participantType");
    const participantType = (
      rawParticipantType === "farmer" ? "seller" : rawParticipantType
    ) as ParticipantType | null;
    const participantId = searchParams.get("participantId");
    const chatName = searchParams.get("chat");

    if (participantType && participantId) {
      const participant = participants.find(
        (item) => item.type === participantType && item.id === participantId,
      );
      if (participant) {
        handleSelectConversation(
          getAdminConversationId(participantType, participantId),
        );
        return;
      }
    }

    if (chatName && conversations.length > 0) {
      const conversation = conversations.find((item) =>
        item.participantName.toLowerCase().includes(chatName.toLowerCase()),
      );
      if (conversation) {
        handleSelectConversation(conversation.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, participants]);

  const filteredConversations = conversations.filter((conversation) =>
    conversation.participantName
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const filteredParticipants = participants.filter((participant) =>
    `${participant.name} ${participant.email} ${participant.phone}`
      .toLowerCase()
      .includes(participantSearch.toLowerCase()),
  );

  const totalConversationPages = Math.max(
    1,
    Math.ceil(filteredConversations.length / conversationsPerPage),
  );

  const paginatedConversations = filteredConversations.slice(
    (conversationPage - 1) * conversationsPerPage,
    conversationPage * conversationsPerPage,
  );

  const currentConversation = selectedConversation
    ? conversations.find(
        (conversation) => conversation.id === selectedConversation,
      )
    : null;

  // Ascending by sort key: oldest at top, newest at bottom
  const conversationMessages = currentConversation
    ? localMessages
        .filter(
          (message) =>
            (message.senderType === currentConversation.participantType &&
              message.senderId === currentConversation.participantId) ||
            (message.recipientType === currentConversation.participantType &&
              message.recipientId === currentConversation.participantId),
        )
        .sort((a, b) => getSortKey(a) - getSortKey(b))
    : [];

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentConversation) return;

    const newMessage: Message = {
      id: `local-${Date.now()}`,
      orderId: "",
      senderId: "admin",
      senderName: "Admin",
      senderType: "admin",
      recipientId: currentConversation.participantId,
      recipientName: currentConversation.participantName,
      recipientType: currentConversation.participantType,
      message: messageInput.trim(),
      // display string for rendering
      timestamp: formatTimestamp(),
      // ISO string so getSortKey can parse it reliably
      isoTimestamp: new Date().toISOString(),
      read: true,
      mine: true,
    };

    setLocalMessages((current) => [...current, newMessage]);
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(newMessage.id);
      return next;
    });
    setMessageInput("");
    toast.success("Message sent");

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleSelectParticipant = (participant: Participant) => {
    handleSelectConversation(
      getAdminConversationId(participant.type, participant.id),
    );
    setSearchTerm("");
    setParticipantSearch("");
    setConversationPage(1);
  };

  useEffect(() => {
    setConversationPage(1);
  }, [searchTerm, newChatMode]);

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
          {newChatMode ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {newChatMode ? "Searching..." : "New Chat"}
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-3">
        <Card className="flex min-h-0 flex-col border-border/50 lg:col-span-1">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
            {newChatMode && (
              <div className="space-y-3 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search buyers or sellers..."
                    value={participantSearch}
                    onChange={(event) =>
                      setParticipantSearch(event.target.value)
                    }
                    className="pl-10"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 bg-background p-2">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((participant) => (
                      <button
                        key={`${participant.type}-${participant.id}`}
                        type="button"
                        onClick={() => handleSelectParticipant(participant)}
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
            )}

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {paginatedConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`min-h-24 w-full rounded-md p-3 text-left transition-colors ${
                    selectedConversation === conversation.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold">
                      {conversation.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">
                          {conversation.participantName}
                        </p>
                        {conversation.unread > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs opacity-80">
                        {conversation.lastMessage}
                      </p>
                      <p className="mt-2 text-xs opacity-70">
                        {conversation.timestamp || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {filteredConversations.length > conversationsPerPage && (
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {conversationPage} of {totalConversationPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={conversationPage === 1}
                    onClick={() =>
                      setConversationPage((prev) => Math.max(1, prev - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={conversationPage === totalConversationPages}
                    onClick={() =>
                      setConversationPage((prev) =>
                        Math.min(totalConversationPages, prev + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {currentConversation ? (
          <Card className="flex min-h-0 flex-col border-border/50 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold">
                  {currentConversation.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {currentConversation.participantName}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {currentConversation.participantType}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
              {conversationMessages.length > 0 ? (
                conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-md px-4 py-2 ${
                        message.senderType === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`mt-1 text-xs ${message.senderType === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  Start the conversation with{" "}
                  {currentConversation.participantName}.
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
                    if (event.key === "Enter") handleSendMessage();
                  }}
                />
                <Button onClick={handleSendMessage} className="gap-2">
                  <Send className="h-4 w-4" />
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
