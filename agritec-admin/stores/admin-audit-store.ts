"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import type { AdminPagination } from "@/stores/admin-sellers-store";

export type AdminAuditLogRecord = {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

type FetchAuditOptions = {
  force?: boolean;
  search?: string;
  action?: string;
  targetType?: string;
  adminId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

type AdminAuditState = {
  logs: AdminAuditLogRecord[];
  pagination: AdminPagination;
  isLoading: boolean;
  error: string | null;
  loaded: boolean;
  lastQueryKey: string | null;
  fetchLogs: (options?: FetchAuditOptions) => Promise<void>;
  resetAudit: () => void;
  clearError: () => void;
};

const defaultPagination: AdminPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

function normalizeLog(log: any): AdminAuditLogRecord {
  return {
    id: String(log.id),
    adminId: String(log.adminId || ""),
    action: String(log.action || ""),
    targetType: String(log.targetType || ""),
    targetId: log.targetId ? String(log.targetId) : null,
    metadata:
      log.metadata && typeof log.metadata === "object"
        ? (log.metadata as Record<string, unknown>)
        : null,
    createdAt: String(log.createdAt || ""),
    admin: log.admin
      ? {
          id: String(log.admin.id),
          fullName: String(log.admin.fullName || ""),
          email: String(log.admin.email || ""),
        }
      : null,
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminAuditStore = create<AdminAuditState>((set, get) => ({
  logs: [],
  pagination: defaultPagination,
  isLoading: false,
  error: null,
  loaded: false,
  lastQueryKey: null,

  fetchLogs: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;

    if (!token) {
      set({
        logs: [],
        pagination: defaultPagination,
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
        lastQueryKey: null,
      });
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(options?.page ?? 1));
    params.set("pageSize", String(options?.pageSize ?? 10));
    if (options?.search) params.set("search", options.search);
    if (options?.action) params.set("action", options.action);
    if (options?.targetType) params.set("targetType", options.targetType);
    if (options?.adminId) params.set("adminId", options.adminId);
    if (options?.from) params.set("from", options.from);
    if (options?.to) params.set("to", options.to);
    const queryKey = params.toString();

    const state = get();
    if (state.isLoading) return;
    if (!force && state.loaded && state.lastQueryKey === queryKey) {
      console.log("[Admin Audit] Fetch skipped: using cached store state", {
        queryKey,
        count: state.logs.length,
      });
      return;
    }

    console.log("[Admin Audit] Fetch start", { queryKey });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        logs: any[];
        pagination: AdminPagination;
      }>(`/api/admin/audit?${queryKey}`, {
        method: "GET",
        token,
      });

      const logs = response.logs.map(normalizeLog);
      console.log("[Admin Audit] Fetch success", {
        queryKey,
        count: logs.length,
      });
      set({
        logs,
        pagination: response.pagination ?? {
          ...defaultPagination,
          total: logs.length,
        },
        isLoading: false,
        error: null,
        loaded: true,
        lastQueryKey: queryKey,
      });
    } catch (error) {
      console.error("[Admin Audit] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load audit logs",
      });
    }
  },

  resetAudit: () =>
    set({
      logs: [],
      pagination: defaultPagination,
      isLoading: false,
      error: null,
      loaded: false,
      lastQueryKey: null,
    }),

  clearError: () => set({ error: null }),
}));
