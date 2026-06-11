"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Bell, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  SellerNotificationRecord,
  useSellerNotificationsStore,
} from "@/stores/seller-notifications-store";
import { formatDateTime } from "@/lib/formatting";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function notificationTargetLabel(notification: SellerNotificationRecord) {
  if (!notification.targetType || !notification.targetId) {
    return "General update";
  }

  return `${notification.targetType}: ${notification.targetId}`;
}

export default function NotificationsPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
  const {
    notifications,
    unreadCount,
    pagination,
    isLoading,
    isMarkingAllRead,
    error,
    fetchNotifications,
    markNotificationAsRead,
    markAllAsRead,
    clearError,
  } = useSellerNotificationsStore((state) => state);

  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!authReady || !sellerProfile) return;
    void fetchNotifications();
  }, [authReady, sellerProfile, fetchNotifications]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    clearError();
  }, [error, clearError]);

  const selectedNotification = useMemo(
    () =>
      selectedNotificationId
        ? notifications.find((entry) => entry.id === selectedNotificationId) ??
          null
        : null,
    [notifications, selectedNotificationId],
  );

  async function handleSelect(notification: SellerNotificationRecord) {
    setSelectedNotificationId(notification.id);

    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (actionError) {
        toast.error(
          actionError instanceof Error
            ? actionError.message
            : "Failed to update notification",
        );
      }
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to mark notifications as read",
      );
    }
  }

  async function goToPage(page: number) {
    try {
      await fetchNotifications({
        force: true,
        page,
        pageSize: pagination.pageSize,
      });
    } catch {
      // store error toast handles fetch failures
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mt-2 text-muted-foreground">
              Order updates, payout alerts, and marketplace notifications for{" "}
              {sellerProfile?.farmName ?? "your farm"}.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead || unreadCount === 0}
            className="h-11"
          >
            {isMarkingAllRead ? (
              <>
                <Spinner className="mr-2 size-4" />
                Updating...
              </>
            ) : (
              "Mark all as read"
            )}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]"
      >
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-70 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-70 flex-col items-center justify-center text-center">
              <Bell className="mb-3 size-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                New payout, order, and message activity will show here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleSelect(notification)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-secondary/40 ${
                    selectedNotificationId === notification.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div
                        className={`size-2 rounded-full ${
                          notification.isRead ? "bg-muted" : "bg-primary"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-foreground">
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(new Date(notification.createdAt))}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {notification.type.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} notifications)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => void goToPage(pagination.page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    pagination.page >= pagination.totalPages || isLoading
                  }
                  onClick={() => void goToPage(pagination.page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          {selectedNotification ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  {selectedNotification.type.replaceAll("_", " ")}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {selectedNotification.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDateTime(new Date(selectedNotification.createdAt))}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {selectedNotification.body}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground">
                    {selectedNotification.isRead ? "Read" : "Unread"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                  <span className="text-muted-foreground">Target</span>
                  <span className="text-right font-medium text-foreground">
                    {notificationTargetLabel(selectedNotification)}
                  </span>
                </div>
                {selectedNotification.metadata ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ExternalLink className="size-4" />
                      <span>Metadata</span>
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                      {JSON.stringify(selectedNotification.metadata, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-90 flex-col items-center justify-center text-center">
              <Bell className="mb-3 size-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">
                Select a notification
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Notification details and related metadata will appear here.
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
