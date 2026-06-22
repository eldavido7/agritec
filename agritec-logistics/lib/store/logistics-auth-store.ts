"use client";

import { create } from "zustand";
import { logisticsApiRequest } from "@/lib/logistics-api";
import type {
  LogisticsAuthUser,
  LogisticsSignupPayload,
} from "@/lib/types";

const STORAGE_KEY = "agritecLogisticsAuth";

type StoredSession = {
  token: string | null;
  user: LogisticsAuthUser | null;
};

type LogisticsAuthState = {
  token: string | null;
  user: LogisticsAuthUser | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: LogisticsSignupPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
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

export const useLogisticsAuthStore = create<LogisticsAuthState>((set, get) => ({
  token: null,
  user: null,
  isReady: false,
  isLoading: false,
  error: null,

  bootstrap: async () => {
    const state = get();
    if (state.isReady || state.isLoading) return;

    const stored = readStoredSession();
    if (!stored.token) {
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
      const response = await logisticsApiRequest<{
        success: true;
        user: LogisticsAuthUser;
      }>("/api/auth/me", {
        method: "GET",
        token: stored.token,
      });

      if (response.user.role !== "LOGISTICS") {
        throw new Error("Unauthorized");
      }

      writeStoredSession({ token: stored.token, user: response.user });
      set({
        token: stored.token,
        user: response.user,
        isReady: true,
        isLoading: false,
        error: null,
      });
    } catch {
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
    set({ isLoading: true, error: null });

    try {
      const response = await logisticsApiRequest<{
        success: true;
        token: string;
        user: LogisticsAuthUser;
      }>("/api/auth/logistics/signin", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
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

  signUp: async (payload) => {
    set({ isLoading: true, error: null });

    try {
      const response = await logisticsApiRequest<{
        success: true;
        user: LogisticsAuthUser;
      }>("/api/auth/logistics/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      set({
        token: null,
        user: response.user,
        isReady: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      clearStoredSession();
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to create account",
      });
      throw error;
    }
  },

  requestPasswordReset: async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({ isLoading: true, error: null });

    try {
      const response = await logisticsApiRequest<{
        success: true;
        message: string;
      }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, role: "LOGISTICS" }),
      });

      set({ isLoading: false, error: null });
      return response.message;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to request password reset",
      });
      throw error;
    }
  },

  signOut: () => {
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
