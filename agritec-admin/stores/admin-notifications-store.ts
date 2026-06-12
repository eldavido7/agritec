"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import type { AdminPagination } from "@/stores/admin-sellers-store";

export type AdminNotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AdminNotificationsState = {
  notifications: AdminNotificationRecord[];
  unreadCount: number;
  pagination: AdminPagination;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchNotifications: (options?: { force?: boolean; unreadOnly?: boolean }) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  resetNotifications: () => void;
  clearError: () => void;
};

const defaultPagination: AdminPagination = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
};

function normalizeNotification(notification: any): AdminNotificationRecord {
  return {
    id: String(notification.id),
    type: String(notification.type || "SYSTEM"),
    title: String(notification.title || ""),
    body: String(notification.body || ""),
    isRead: Boolean(notification.isRead),
    targetType: notification.targetType ? String(notification.targetType) : null,
    targetId: notification.targetId ? String(notification.targetId) : null,
    metadata: notification.metadata && typeof notification.metadata === "object"
      ? (notification.metadata as Record<string, unknown>)
      : null,
    createdAt: String(notification.createdAt || ""),
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminNotificationsStore = create<AdminNotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pagination: defaultPagination,
  isLoading: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchNotifications: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const unreadOnly = options?.unreadOnly === true;
    const state = get();

    if (!token) {
      set({
        notifications: [],
        unreadCount: 0,
        pagination: defaultPagination,
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
      });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded && !unreadOnly) {
      console.log("[Admin Notifications] Fetch skipped: using cached store state", {
        count: state.notifications.length,
        unreadCount: state.unreadCount,
      });
      return;
    }

    console.log("[Admin Notifications] Fetch start", { force, unreadOnly });
    set({ isLoading: true, error: null });

    try {
      const query = unreadOnly ? "?page=1&pageSize=50&unreadOnly=true" : "?page=1&pageSize=50";
      const response = await adminApiRequest<{
        success: true;
        notifications: any[];
        unreadCount: number;
        pagination: AdminPagination;
      }>(`/api/notifications${query}`, {
        method: "GET",
        token,
      });

      const notifications = response.notifications.map(normalizeNotification);
      console.log("[Admin Notifications] Fetch success", {
        count: notifications.length,
        unreadCount: response.unreadCount,
      });

      set({
        notifications,
        unreadCount: Number(response.unreadCount || 0),
        pagination: response.pagination ?? { ...defaultPagination, total: notifications.length },
        isLoading: false,
        error: null,
        loaded: !unreadOnly,
      });
    } catch (error) {
      console.error("[Admin Notifications] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load notifications",
      });
    }
  },

  markAllAsRead: async () => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Notifications] Mark-all-read start");
    set({ isUpdating: true, error: null });

    try {
      await adminApiRequest<{ success: true; message: string }>("/api/notifications/read-all", {
        method: "PATCH",
        token,
      });

      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
        unreadCount: 0,
        isUpdating: false,
        error: null,
        loaded: true,
      }));
      console.log("[Admin Notifications] Mark-all-read success");
    } catch (error) {
      console.error("[Admin Notifications] Mark-all-read failed", describeError(error));
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to mark notifications as read",
      });
      throw error;
    }
  },

  resetNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      pagination: defaultPagination,
      isLoading: false,
      isUpdating: false,
      error: null,
      loaded: false,
    });
  },

  clearError: () => set({ error: null }),
}));
