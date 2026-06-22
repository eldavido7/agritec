"use client";

import { create } from "zustand";
import { logisticsApiRequest } from "@/lib/logistics-api";
import { useLogisticsStore } from "@/lib/store/logistics-store";
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

function logAuth(event: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[Logistics Auth] ${event}`, payload || {});
}

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
    logAuth("Bootstrap start", {
      hasStoredToken: Boolean(stored.token),
      storedUserId: stored.user?.id || null,
    });
    if (!stored.token) {
      logAuth("Bootstrap skipped", { reason: "no_stored_token" });
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

      logAuth("Bootstrap success", {
        userId: response.user.id,
        companyName: response.user.logisticsProfile?.companyName || null,
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
      logAuth("Bootstrap failed", {
        error: error instanceof Error ? error.message : String(error),
      });
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
    logAuth("Sign-in start", { email: normalizedEmail });
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

      logAuth("Sign-in success", {
        userId: response.user.id,
        companyName: response.user.logisticsProfile?.companyName || null,
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
      logAuth("Sign-in failed", {
        email: normalizedEmail,
        error: error instanceof Error ? error.message : String(error),
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

  signUp: async (payload) => {
    logAuth("Sign-up start", {
      email: payload.email.trim().toLowerCase(),
      companyName: payload.companyName,
    });
    set({ isLoading: true, error: null });

    try {
      const response = await logisticsApiRequest<{
        success: true;
        user: LogisticsAuthUser;
      }>("/api/auth/logistics/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      logAuth("Sign-up success", {
        userId: response.user.id,
        verificationStatus: response.user.logisticsProfile?.verificationStatus || null,
      });
      set({
        token: null,
        user: response.user,
        isReady: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      logAuth("Sign-up failed", {
        email: payload.email.trim().toLowerCase(),
        error: error instanceof Error ? error.message : String(error),
      });
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
    logAuth("Forgot-password start", { email: normalizedEmail });
    set({ isLoading: true, error: null });

    try {
      const response = await logisticsApiRequest<{
        success: true;
        message: string;
      }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, role: "LOGISTICS" }),
      });

      logAuth("Forgot-password success", { email: normalizedEmail });
      set({ isLoading: false, error: null });
      return response.message;
    } catch (error) {
      logAuth("Forgot-password failed", {
        email: normalizedEmail,
        error: error instanceof Error ? error.message : String(error),
      });
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
    logAuth("Sign-out", {
      userId: get().user?.id || null,
      companyName: get().user?.logisticsProfile?.companyName || null,
    });
    useLogisticsStore.getState().resetStore();
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
