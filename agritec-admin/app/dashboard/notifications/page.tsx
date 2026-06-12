"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  AlertCircle,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAdminNotificationsStore } from "@/stores/admin-notifications-store";

const notificationIcons: Record<string, React.ReactNode> = {
  PAYOUT: <CreditCard className="w-4 h-4" />,
  ORDER: <CreditCard className="w-4 h-4" />,
  MESSAGE: <MessageCircle className="w-4 h-4" />,
  SYSTEM: <AlertCircle className="w-4 h-4" />,
};

const notificationColors: Record<string, string> = {
  PAYOUT: "bg-green-100 text-green-700 border-green-200",
  ORDER: "bg-blue-100 text-blue-700 border-blue-200",
  MESSAGE: "bg-orange-100 text-orange-700 border-orange-200",
  SYSTEM: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const notifications = useAdminNotificationsStore((state) => state.notifications);
  const unreadCount = useAdminNotificationsStore((state) => state.unreadCount);
  const isLoading = useAdminNotificationsStore((state) => state.isLoading);
  const isUpdating = useAdminNotificationsStore((state) => state.isUpdating);
  const loaded = useAdminNotificationsStore((state) => state.loaded);
  const fetchNotifications = useAdminNotificationsStore((state) => state.fetchNotifications);
  const markAllAsRead = useAdminNotificationsStore((state) => state.markAllAsRead);
  const [filterType, setFilterType] = useState<"all" | "ORDER" | "PAYOUT" | "MESSAGE" | "SYSTEM">("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void fetchNotifications({ force: true });

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void fetchNotifications({ force: true });
      }
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const typeMatch = filterType === "all" || notification.type === filterType;
        const readMatch =
          filterRead === "all" ||
          (filterRead === "unread" && !notification.isRead) ||
          (filterRead === "read" && notification.isRead);
        return typeMatch && readMatch;
      }),
    [filterRead, filterType, notifications],
  );

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [filterType, filterRead, notifications.length]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update notifications",
      );
    }
  };

  const openNotificationTarget = (notification: (typeof notifications)[number]) => {
    if (notification.targetType === "conversation" && notification.targetId) {
      router.push(`/dashboard/messages?conversationId=${notification.targetId}`);
      return;
    }

    if (notification.targetType === "withdrawalRequest") {
      router.push("/dashboard/payouts");
      return;
    }

    if (
      notification.targetType === "parentOrder" ||
      notification.targetType === "sellerOrderGroup"
    ) {
      router.push("/dashboard/orders");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">System alerts and updates</p>
        </div>
        {unreadCount > 0 ? (
          <Button
            onClick={() => void handleMarkAllAsRead()}
            variant="outline"
            className="w-full md:w-auto"
            disabled={isUpdating}
          >
            {isUpdating ? <Spinner className="mr-2 size-4" /> : null}
            Mark all as read
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-sm text-muted-foreground">Total</p><p className="text-3xl font-bold text-foreground">{notifications.length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-sm text-muted-foreground">Unread</p><p className="text-3xl font-bold text-orange-600">{unreadCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-sm text-muted-foreground">Read</p><p className="text-3xl font-bold text-green-600">{notifications.filter((notification) => notification.isRead).length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-sm text-muted-foreground">Types</p><p className="text-3xl font-bold text-blue-600">{new Set(notifications.map((notification) => notification.type)).size}</p></CardContent></Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Type</p>
              <div className="flex flex-wrap gap-2">
                {(["all", "ORDER", "PAYOUT", "MESSAGE", "SYSTEM"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    onClick={() => setFilterType(type)}
                    size="sm"
                    className="capitalize"
                  >
                    {type === "all" ? "All Types" : type.toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Status</p>
              <div className="flex gap-2">
                {(["all", "unread", "read"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filterRead === status ? "default" : "outline"}
                    onClick={() => setFilterRead(status)}
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

      <div className="space-y-3">
        {paginatedNotifications.length > 0 ? (
          paginatedNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-border/50 transition-all ${
                !notification.isRead ? "bg-primary/5 border-primary/30" : ""
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 rounded-lg border p-2 ${notificationColors[notification.type] || notificationColors.SYSTEM}`}
                  >
                    {notificationIcons[notification.type] || <Bell className="w-4 h-4" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-foreground">
                          {notification.body}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Button
                          onClick={() => openNotificationTarget(notification)}
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-primary hover:bg-primary/10 hover:text-primary"
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : isLoading && !loaded ? (
          <Card className="border-border/50">
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Spinner className="size-4" />
                <span>Loading notifications...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No notifications found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {filteredNotifications.length > pageSize ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
