"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notifications } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CreditCard,
  AlertCircle,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const notificationIcons: Record<string, React.ReactNode> = {
  payout: <CreditCard className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
  message: <MessageCircle className="w-4 h-4" />,
  audit: <AlertCircle className="w-4 h-4" />,
};

const notificationColors: Record<string, string> = {
  payout: "bg-green-100 text-green-700 border-green-200",
  payment: "bg-green-100 text-green-700 border-green-200",
  message: "bg-orange-100 text-orange-700 border-orange-200",
  audit: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function NotificationsPage() {
  const [notificationList, setNotificationList] = useState(notifications);
  const [filterType, setFilterType] = useState<
    "all" | "payment" | "payout" | "message" | "audit"
  >("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">(
    "all",
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredNotifications = notificationList.filter((notif) => {
    const typeMatch = filterType === "all" || notif.type === filterType;
    const readMatch =
      filterRead === "all" ||
      (filterRead === "unread" && !notif.read) ||
      (filterRead === "read" && notif.read);
    return typeMatch && readMatch;
  });

  const unreadCount = notificationList.filter((n) => !n.read).length;
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const paginatedNotifications = filteredNotifications.slice((page - 1) * pageSize, page * pageSize);

  const markAsRead = (id: string) => {
    setNotificationList(
      notificationList.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    toast.success("Notification marked as read");
  };

  const markAllAsRead = () => {
    setNotificationList(notificationList.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = (id: string) => {
    setNotificationList(notificationList.filter((n) => n.id !== id));
    toast.success("Notification deleted");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1">
            System alerts and updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="w-full md:w-auto"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">
              {notificationList.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Unread</p>
            <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Read</p>
            <p className="text-3xl font-bold text-green-600">
              {notificationList.filter((n) => n.read).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Types</p>
            <p className="text-3xl font-bold text-blue-600">
              {new Set(notificationList.map((n) => n.type)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Type</p>
              <div className="flex flex-wrap gap-2">
                {["all", "payment", "payout", "message", "audit"].map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    onClick={() => setFilterType(type as any)}
                    size="sm"
                    className="capitalize"
                  >
                    {type === "all" ? "All Types" : type}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-3">
                Status
              </p>
              <div className="flex gap-2">
                {["all", "unread", "read"].map((status) => (
                  <Button
                    key={status}
                    variant={filterRead === status ? "default" : "outline"}
                    onClick={() => setFilterRead(status as any)}
                    size="sm"
                    className="capitalize"
                  >
                    {status === "all" ? "All" : status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          paginatedNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={`border-border/50 transition-all ${
                !notif.read ? "bg-primary/5 border-primary/30" : ""
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg shrink-0 ${notificationColors[notif.type] || notificationColors.audit}`}
                  >
                    {notificationIcons[notif.type] || (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {notif.title}
                        </h3>
                        <p className="text-sm text-foreground mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {notif.timestamp}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.read && (
                          <div className="flex gap-1">
                            <Button
                              onClick={() => markAsRead(notif.id)}
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              Mark as read
                            </Button>
                          </div>
                        )}
                        <Button
                          onClick={() => deleteNotification(notif.id)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/50">
            <CardContent className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications found</p>
            </CardContent>
          </Card>
        )}
      </div>
      {filteredNotifications.length > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
