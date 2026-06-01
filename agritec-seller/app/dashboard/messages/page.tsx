"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getSellerMockData } from "@/lib/mock-data";
import { Send, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/formatting";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const CHATS_PER_PAGE = 10;

type ChatType = "customers" | "admin";

interface Message {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: Date;
}

export default function MessagesPage() {
  const seller = getSellerMockData();
  const sellerChatMessages: Record<ChatType, Record<string, Message[]>> = {
    customers: Object.fromEntries(
      seller.messages.map((message) => [
        message.from,
        [
          {
            id: String(message.id),
            sender: "them" as const,
            text: message.message,
            timestamp: message.timestamp,
          },
        ],
      ]),
    ),
    admin: {
      "AgriTec Support": [
        {
          id: `support-${seller.id}`,
          sender: "them",
          text: `${seller.name}, your ${seller.farmName} seller account is active and ready for orders.`,
          timestamp: new Date("2024-05-20T09:00:00"),
        },
      ],
    },
  };
  const [activeTab, setActiveTab] = useState<ChatType>("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [chats, setChats] = useState(sellerChatMessages);
  const [currentPage, setCurrentPage] = useState(1);

  const currentChats = Object.keys(chats[activeTab]).sort((a, b) => {
    const aLastMsg =
      chats[activeTab][a]?.[chats[activeTab][a].length - 1]?.timestamp ||
      new Date(0);
    const bLastMsg =
      chats[activeTab][b]?.[chats[activeTab][b].length - 1]?.timestamp ||
      new Date(0);
    return new Date(bLastMsg).getTime() - new Date(aLastMsg).getTime();
  });

  const filteredChats = currentChats.filter((chat) =>
    chat.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredChats.length / CHATS_PER_PAGE);
  const paginatedChats = filteredChats.slice(
    (currentPage - 1) * CHATS_PER_PAGE,
    currentPage * CHATS_PER_PAGE,
  );

  const selectedChatMessages = selectedChat
    ? chats[activeTab][selectedChat]
    : null;

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "me",
      text: replyText,
      timestamp: new Date(),
    };

    setChats((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [selectedChat]: [...(prev[activeTab][selectedChat] || []), newMessage],
      },
    }));
    setReplyText("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="text-muted-foreground mt-2">
            Communicate with customers and admin for {seller.farmName}
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="flex gap-2"
      >
        {[
          { id: "customers", label: "Customers" },
          { id: "admin", label: "Admin" },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => {
              setActiveTab(tab.id as ChatType);
              setSelectedChat(null);
              setReplyText("");
              setCurrentPage(1);
            }}
            className={
              activeTab === tab.id
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
            }
          >
            {tab.label}
          </Button>
        ))}
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]"
      >
        {/* Chat List */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Chats */}
            <div className="flex-1 overflow-y-auto">
              {paginatedChats.length > 0 ? (
                paginatedChats.map((chat) => (
                  <button
                    key={chat}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full text-left p-4 border-b border-border hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors ${
                      selectedChat === chat ? "bg-muted" : ""
                    }`}
                  >
                    <p className="font-medium text-foreground text-sm">
                      {chat}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {chats[activeTab][chat]?.[
                        chats[activeTab][chat].length - 1
                      ]?.text || "No messages"}
                    </p>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    No conversations found
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border space-y-3">
                <p className="text-xs text-muted-foreground text-center">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Chat Detail */}
        <div className="lg:col-span-2">
          {selectedChat && selectedChatMessages ? (
            <Card className="h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  {selectedChat}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedChatMessages.length} messages
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender === "me"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender === "me"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDateTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Section */}
              <div className="p-6 border-t border-border">
                <div className="space-y-3">
                  <textarea
                    placeholder="Write your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground text-lg">
                  {filteredChats.length === 0
                    ? "No conversations in this tab"
                    : "Select a conversation to view messages"}
                </p>
              </div>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}
