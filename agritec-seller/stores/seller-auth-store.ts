"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerProductsStore } from "@/stores/seller-products-store";
import { useSellerWalletStore } from "@/stores/seller-wallet-store";
import { useSellerSettingsStore } from "@/stores/seller-settings-store";

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
    city?: string | null;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    autoPayoutEnabled?: boolean;
  } | null;
};

export type SellerSignupPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  farmName: string;
};

type SellerAuthState = {
  token: string | null;
  user: SellerAuthUser | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SellerSignupPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
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
    console.log("[Seller Auth] Bootstrap start", {
      hasStoredToken: Boolean(stored.token),
      storedUserId: stored.user?.id || null,
    });

    if (!stored.token) {
      console.log("[Seller Auth] No stored seller session found");
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

      console.log("[Seller Auth] Bootstrap success", {
        userId: response.user.id,
        email: response.user.email,
        farmName: response.user.sellerProfile?.farmName || null,
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
      console.error("[Seller Auth] Bootstrap failed", error);
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
    console.log("[Seller Auth] Sign-in start", { email: normalizedEmail });
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        token: string;
        user: SellerAuthUser;
      }>("/api/auth/seller/signin", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      console.log("[Seller Auth] Sign-in success", {
        userId: response.user.id,
        email: response.user.email,
        farmName: response.user.sellerProfile?.farmName || null,
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
      console.error("[Seller Auth] Sign-in failed", {
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

  signUp: async (payload) => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    console.log("[Seller Auth] Sign-up start", {
      email: normalizedEmail,
      farmName: payload.farmName,
    });
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        token: string;
        user: SellerAuthUser;
      }>("/api/auth/seller/signup", {
        method: "POST",
        body: JSON.stringify({
          fullName: payload.fullName,
          email: normalizedEmail,
          password: payload.password,
          phone: payload.phone?.trim() || null,
          farmName: payload.farmName,
        }),
      });

      console.log("[Seller Auth] Sign-up success", {
        userId: response.user.id,
        email: response.user.email,
        farmName: response.user.sellerProfile?.farmName || null,
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
      console.error("[Seller Auth] Sign-up failed", {
        email: normalizedEmail,
        error,
      });
      clearStoredSession();
      set({
        token: null,
        user: null,
        isReady: true,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to create account",
      });
      throw error;
    }
  },

  requestPasswordReset: async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[Seller Auth] Forgot-password start", { email: normalizedEmail });
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        message: string;
      }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      });

      console.log("[Seller Auth] Forgot-password success", {
        email: normalizedEmail,
      });
      set({ isLoading: false, error: null });
      return response.message;
    } catch (error) {
      console.error("[Seller Auth] Forgot-password failed", {
        email: normalizedEmail,
        error,
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

  resetPassword: async (token, password) => {
    console.log("[Seller Auth] Reset-password start", {
      hasToken: Boolean(token),
    });
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        message: string;
      }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      console.log("[Seller Auth] Reset-password success");
      set({ isLoading: false, error: null });
      return response.message;
    } catch (error) {
      console.error("[Seller Auth] Reset-password failed", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unable to reset password",
      });
      throw error;
    }
  },

  signOut: () => {
    console.log("[Seller Auth] Sign-out", {
      userId: get().user?.id || null,
      email: get().user?.email || null,
    });
    clearStoredSession();
    useSellerProductsStore.getState().resetProducts();
    useSellerWalletStore.getState().resetWallet();
    useSellerSettingsStore.getState().resetSettings();
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





