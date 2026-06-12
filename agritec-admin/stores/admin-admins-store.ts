"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

export type AdminUserRecord = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateAdminPayload = {
  email: string;
  password: string;
  fullName?: string;
  phone?: string | null;
};

type AdminAdminsState = {
  admins: AdminUserRecord[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchAdmins: (options?: { force?: boolean }) => Promise<void>;
  createAdmin: (payload: CreateAdminPayload) => Promise<AdminUserRecord>;
  deactivateAdmin: (adminId: string) => Promise<void>;
  updateAdmin: (
    adminId: string,
    payload: Partial<{
      email: string;
      fullName: string;
      phone: string | null;
      isActive: boolean;
      password: string;
    }>,
  ) => Promise<AdminUserRecord>;
  resetAdmins: () => void;
  clearError: () => void;
};

function normalizeAdmin(admin: any): AdminUserRecord {
  return {
    id: String(admin.id),
    email: String(admin.email || ""),
    fullName: String(admin.fullName || ""),
    phone: admin.phone ? String(admin.phone) : null,
    isActive: Boolean(admin.isActive),
    emailVerifiedAt: admin.emailVerifiedAt ? String(admin.emailVerifiedAt) : null,
    lastActiveAt: admin.lastActiveAt ? String(admin.lastActiveAt) : null,
    createdAt: String(admin.createdAt || ""),
    updatedAt: String(admin.updatedAt || ""),
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminAdminsStore = create<AdminAdminsState>((set, get) => ({
  admins: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchAdmins: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({
        admins: [],
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
      });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded) {
      console.log("[Admin Admins] Fetch skipped: using cached store state", {
        count: state.admins.length,
      });
      return;
    }

    console.log("[Admin Admins] Fetch start", { force });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        admins: any[];
      }>("/api/admin/admins", {
        method: "GET",
        token,
      });

      const admins = response.admins.map(normalizeAdmin);
      console.log("[Admin Admins] Fetch success", {
        count: admins.length,
      });
      set({
        admins,
        isLoading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error("[Admin Admins] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load admins",
      });
    }
  },

  createAdmin: async (payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Admins] Create start", {
      email: payload.email,
      fullName: payload.fullName,
    });
    set({ isCreating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        admin: any;
      }>("/api/admin/admins", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      const created = normalizeAdmin(response.admin);
      set((state) => ({
        admins: [...state.admins, created],
        isCreating: false,
        error: null,
        loaded: true,
      }));
      console.log("[Admin Admins] Create success", { adminId: created.id });
      return created;
    } catch (error) {
      console.error("[Admin Admins] Create failed", {
        payload: { ...payload, password: "***" },
        error: describeError(error),
      });
      set({
        isCreating: false,
        error: error instanceof Error ? error.message : "Unable to create admin",
      });
      throw error;
    }
  },

  deactivateAdmin: async (adminId) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Admins] Deactivate start", { adminId });
    set({ isUpdating: true, error: null });

    try {
      await adminApiRequest<{ success: true; message: string }>(
        `/api/admin/admins/${adminId}`,
        {
          method: "DELETE",
          token,
        },
      );

      set((state) => ({
        admins: state.admins.map((admin) =>
          admin.id === adminId ? { ...admin, isActive: false } : admin,
        ),
        isUpdating: false,
        error: null,
        loaded: true,
      }));
      console.log("[Admin Admins] Deactivate success", { adminId });
    } catch (error) {
      console.error("[Admin Admins] Deactivate failed", {
        adminId,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to deactivate admin",
      });
      throw error;
    }
  },

  updateAdmin: async (adminId, payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Admins] Update start", {
      adminId,
      payload: { ...payload, password: payload.password ? "***" : undefined },
    });
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        admin: any;
      }>(`/api/admin/admins/${adminId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      const updated = normalizeAdmin(response.admin);
      set((state) => ({
        admins: state.admins.map((admin) =>
          admin.id === adminId ? updated : admin,
        ),
        isUpdating: false,
        error: null,
        loaded: true,
      }));
      console.log("[Admin Admins] Update success", { adminId });
      return updated;
    } catch (error) {
      console.error("[Admin Admins] Update failed", {
        adminId,
        payload: { ...payload, password: payload.password ? "***" : undefined },
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to update admin",
      });
      throw error;
    }
  },

  resetAdmins: () =>
    set({
      admins: [],
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      error: null,
      loaded: false,
    }),

  clearError: () => set({ error: null }),
}));
