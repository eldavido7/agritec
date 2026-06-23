"use client";

import { create } from "zustand";
import { toast } from "sonner";
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
    logAuth("Read stored session skipped", { reason: "server" });
    return { token: null, user: null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    logAuth("Read stored session skipped", { reason: "missing_local_storage" });
    return { token: null, user: null };
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    logAuth("Read stored session success", {
      hasToken: Boolean(parsed.token),
      userId: parsed.user?.id || null,
    });
    return {
      token: parsed.token || null,
      user: parsed.user || null,
    };
  } catch {
    logAuth("Read stored session failed", { reason: "invalid_json" });
    return { token: null, user: null };
  }
};

const writeStoredSession = (session: StoredSession) => {
  if (typeof window === "undefined") return;
  logAuth("Write stored session", {
    hasToken: Boolean(session.token),
    userId: session.user?.id || null,
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  logAuth("Clear stored session");
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
    if (state.isReady || state.isLoading) {
      logAuth("Bootstrap skipped", {
        reason: state.isReady ? "already_ready" : "already_loading",
      });
      return;
    }

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
      toast.success("Signed in successfully.");
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
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
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
      toast.success("Signup submitted. Your company is pending admin verification.");
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
      toast.error(error instanceof Error ? error.message : "Unable to create account");
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
      toast.success(response.message);
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
      toast.error(
        error instanceof Error ? error.message : "Unable to request password reset",
      );
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
    toast.success("Signed out successfully.");
  },

  clearError: () => set({ error: null }),
}));
