"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";

const STORAGE_KEY = "agritecAdminAuth";

export type AdminAuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string | null;
  isActive?: boolean;
  emailVerifiedAt?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type StoredSession = {
  token: string | null;
  user: AdminAuthUser | null;
};

type AdminAuthState = {
  token: string | null;
  user: AdminAuthUser | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
};

const readStoredSession = (): StoredSession => {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { token: null, user: null };
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return {
      token: parsed.token || null,
      user: parsed.user || null,
    };
  } catch {
    return { token: null, user: null };
  }
};

const writeStoredSession = (session: StoredSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  token: null,
  user: null,
  isReady: false,
  isLoading: false,
  error: null,

  bootstrap: async () => {
    const state = get();
    if (state.isReady || state.isLoading) return;

    const stored = readStoredSession();
    console.log("[Admin Auth] Bootstrap start", {
      hasStoredToken: Boolean(stored.token),
      storedUserId: stored.user?.id || null,
    });

    if (!stored.token) {
      console.log("[Admin Auth] No stored admin session found");
      set({ token: null, user: null, isReady: true, isLoading: false, error: null });
      return;
    }

    set({
      token: stored.token,
      user: stored.user,
      isLoading: true,
      error: null,
    });

    try {
      const response = await adminApiRequest<{
        success: true;
        user: AdminAuthUser;
      }>("/api/auth/me", {
        method: "GET",
        token: stored.token,
      });

      if (response.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }

      console.log("[Admin Auth] Bootstrap success", {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
      });

      writeStoredSession({ token: stored.token, user: response.user });
      set({
        token: stored.token,
        user: response.user,
        isReady: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("[Admin Auth] Bootstrap failed", error);
      clearStoredSession();
      set({
        token: null,
        user: null,
        isReady: true,
        isLoading: false,
        error: null,
      });
    }
  },

  signIn: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[Admin Auth] Sign-in start", { email: normalizedEmail });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        token: string;
        user: AdminAuthUser;
      }>("/api/auth/admin/signin", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      console.log("[Admin Auth] Sign-in success", {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
      });

      writeStoredSession({ token: response.token, user: response.user });
      set({
        token: response.token,
        user: response.user,
        isReady: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("[Admin Auth] Sign-in failed", {
        email: normalizedEmail,
        error,
      });
      clearStoredSession();
      set({
        token: null,
        user: null,
        isReady: true,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to sign in",
      });
      throw error;
    }
  },

  signOut: () => {
    console.log("[Admin Auth] Sign-out", {
      userId: get().user?.id || null,
      email: get().user?.email || null,
    });
    clearStoredSession();
    set({
      token: null,
      user: null,
      isReady: true,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
