"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";

const STORAGE_KEY = "agritecSellerAuth";

export type SellerAuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string | null;
  sellerProfile: {
    id: string;
    farmName: string;
    description?: string | null;
    locationLabel?: string | null;
    fullAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    autoPayoutEnabled?: boolean;
  } | null;
};

type SellerAuthState = {
  token: string | null;
  user: SellerAuthUser | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
};

type StoredSession = Pick<SellerAuthState, "token" | "user">;

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

export const useSellerAuthStore = create<SellerAuthState>((set, get) => ({
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
      set({ token: null, user: null, isReady: true, isLoading: false });
      return;
    }

    set({
      token: stored.token,
      user: stored.user,
      isLoading: true,
      error: null,
    });

    try {
      const response = await sellerApiRequest<{
        success: true;
        user: SellerAuthUser;
      }>("/api/auth/me", {
        method: "GET",
        token: stored.token,
      });

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
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        token: string;
        user: SellerAuthUser;
      }>("/api/auth/seller/signin", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
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
