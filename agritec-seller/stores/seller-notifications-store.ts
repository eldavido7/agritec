"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export type SellerNotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type SellerNotificationsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type SellerNotificationsState = {
  notifications: SellerNotificationRecord[];
  unreadCount: number;
  pagination: SellerNotificationsPagination;
  isLoading: boolean;
  isMarkingAllRead: boolean;
  error: string | null;
  loadedForUserId: string | null;
  fetchNotifications: (options?: {
    force?: boolean;
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  }) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  resetNotifications: () => void;
  clearError: () => void;
};

const defaultPagination: SellerNotificationsPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

function normalizeNotification(
  notification: Record<string, unknown>,
): SellerNotificationRecord {
  return {
    id: String(notification.id ?? ""),
    type: String(notification.type ?? ""),
    title: String(notification.title ?? ""),
    body: String(notification.body ?? ""),
    isRead: Boolean(notification.isRead),
    targetType:
      notification.targetType == null ? null : String(notification.targetType),
    targetId: notification.targetId == null ? null : String(notification.targetId),
    metadata:
      notification.metadata &&
      typeof notification.metadata === "object" &&
      !Array.isArray(notification.metadata)
        ? (notification.metadata as Record<string, unknown>)
        : null,
    createdAt: String(notification.createdAt ?? ""),
    updatedAt: String(notification.updatedAt ?? ""),
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

export const useSellerNotificationsStore = create<SellerNotificationsState>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    pagination: defaultPagination,
    isLoading: false,
    isMarkingAllRead: false,
    error: null,
    loadedForUserId: null,

    fetchNotifications: async (options) => {
      const token = useSellerAuthStore.getState().token;
      const userId = useSellerAuthStore.getState().user?.id ?? null;
      const state = get();
      const force = options?.force === true;
      const page = options?.page ?? state.pagination.page ?? 1;
      const pageSize = options?.pageSize ?? state.pagination.pageSize ?? 10;
      const unreadOnly = options?.unreadOnly === true;

      if (!token || !userId) {
        console.warn(
          "[Seller Notifications] Fetch skipped: seller session not found",
        );
        set({
          notifications: [],
          unreadCount: 0,
          pagination: defaultPagination,
          isLoading: false,
          loadedForUserId: null,
          error: "Seller session not found",
        });
        return;
      }

      if (state.isLoading) {
        console.log(
          "[Seller Notifications] Fetch skipped: request already in progress",
          { userId },
        );
        return;
      }

      if (
        !force &&
        state.loadedForUserId === userId &&
        state.notifications.length > 0 &&
        page === state.pagination.page &&
        pageSize === state.pagination.pageSize
      ) {
        console.log(
          "[Seller Notifications] Fetch skipped: using cached store state",
          {
            userId,
            count: state.notifications.length,
            page,
            pageSize,
          },
        );
        return;
      }

      console.log("[Seller Notifications] Fetch start", {
        userId,
        force,
        page,
        pageSize,
        unreadOnly,
      });
      set({ isLoading: true, error: null });

      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(unreadOnly ? { unreadOnly: "true" } : {}),
        });

        const response = await sellerApiRequest<{
          success: true;
          notifications: Record<string, unknown>[];
          unreadCount: number;
          pagination: SellerNotificationsPagination;
        }>(`/api/notifications?${query.toString()}`, {
          method: "GET",
          token,
        });

        const notifications = (response.notifications ?? []).map(
          normalizeNotification,
        );

        console.log("[Seller Notifications] Fetch success", {
          userId,
          count: notifications.length,
          unreadCount: response.unreadCount,
          pagination: response.pagination,
        });

        set({
          notifications,
          unreadCount: Number(response.unreadCount ?? 0),
          pagination: response.pagination ?? {
            page,
            pageSize,
            total: notifications.length,
            totalPages: 1,
          },
          isLoading: false,
          error: null,
          loadedForUserId: userId,
        });
      } catch (error) {
        console.error(
          "[Seller Notifications] Fetch failed",
          describeError(error),
        );
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load notifications",
        });
      }
    },

    markNotificationAsRead: async (notificationId) => {
      const token = useSellerAuthStore.getState().token;
      if (!token) throw new Error("Seller session not found");

      const notification = get().notifications.find(
        (entry) => entry.id === notificationId,
      );
      if (!notification || notification.isRead) {
        return;
      }

      console.log("[Seller Notifications] Mark read start", { notificationId });

      try {
        const response = await sellerApiRequest<{
          success: true;
          notification: Record<string, unknown>;
        }>(`/api/notifications/${notificationId}/read`, {
          method: "PATCH",
          token,
        });

        const updated = normalizeNotification(response.notification);

        console.log("[Seller Notifications] Mark read success", {
          notificationId,
        });

        set((state) => ({
          notifications: state.notifications.map((entry) =>
            entry.id === notificationId ? updated : entry,
          ),
          unreadCount: Math.max(
            0,
            state.unreadCount - (notification.isRead ? 0 : 1),
          ),
          error: null,
        }));
      } catch (error) {
        console.error("[Seller Notifications] Mark read failed", {
          notificationId,
          error: describeError(error),
        });
        set({
          error:
            error instanceof Error
              ? error.message
              : "Unable to update notification",
        });
        throw error;
      }
    },

    markAllAsRead: async () => {
      const token = useSellerAuthStore.getState().token;
      if (!token) throw new Error("Seller session not found");

      if (get().isMarkingAllRead) return;

      console.log("[Seller Notifications] Mark all as read start");
      set({ isMarkingAllRead: true, error: null });

      try {
        await sellerApiRequest<{ success: true; message: string }>(
          "/api/notifications/read-all",
          {
            method: "PATCH",
            token,
          },
        );

        console.log("[Seller Notifications] Mark all as read success");

        set((state) => ({
          notifications: state.notifications.map((entry) => ({
            ...entry,
            isRead: true,
          })),
          unreadCount: 0,
          isMarkingAllRead: false,
          error: null,
        }));
      } catch (error) {
        console.error(
          "[Seller Notifications] Mark all as read failed",
          describeError(error),
        );
        set({
          isMarkingAllRead: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to mark notifications as read",
        });
        throw error;
      }
    },

    resetNotifications: () => {
      console.log("[Seller Notifications] Reset store state");
      set({
        notifications: [],
        unreadCount: 0,
        pagination: defaultPagination,
        isLoading: false,
        isMarkingAllRead: false,
        error: null,
        loadedForUserId: null,
      });
    },

    clearError: () => set({ error: null }),
  }),
);

