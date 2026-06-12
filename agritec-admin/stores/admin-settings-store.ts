"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

export type AdminPlatformSettingsRecord = {
  platform: {
    id: string;
    marketplaceName: string;
    currencyCode: string;
    countryCode: string;
    supportEmail: string | null;
    createdAt: string;
    updatedAt: string;
  };
  shipping: {
    id: string;
    abujaMinimumFee: number;
    abujaAdditionalUnitFee: number;
    outsideMinimumFee: number;
    outsideAdditionalUnitFee: number;
    weightUnitSizeKg: number;
    volumetricDivisor: number;
    createdAt: string;
    updatedAt: string;
  };
  commission: {
    id: string;
    commissionRateBps: number;
    commissionRatePercent: number;
    createdAt: string;
    updatedAt: string;
  };
  payout: {
    id: string;
    autoPayoutThreshold: number;
    weeklyPayoutDay: number | null;
    createdAt: string;
    updatedAt: string;
  };
};

type UpdateSettingsPayload = {
  platform?: {
    marketplaceName?: string;
    currencyCode?: string;
    countryCode?: string;
    supportEmail?: string | null;
  };
  shipping?: {
    abujaMinimumFee?: number;
    abujaAdditionalUnitFee?: number;
    outsideMinimumFee?: number;
    outsideAdditionalUnitFee?: number;
    weightUnitSizeKg?: number;
    volumetricDivisor?: number;
  };
  commission?: {
    commissionRatePercent?: number;
  };
  payout?: {
    autoPayoutThreshold?: number;
    weeklyPayoutDay?: number | null;
  };
};

type AdminSettingsState = {
  settings: AdminPlatformSettingsRecord | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchSettings: (options?: { force?: boolean }) => Promise<AdminPlatformSettingsRecord | null>;
  updateSettings: (payload: UpdateSettingsPayload) => Promise<AdminPlatformSettingsRecord>;
  resetSettings: () => void;
  clearError: () => void;
};

function normalizeSettings(settings: any): AdminPlatformSettingsRecord {
  return {
    platform: {
      id: String(settings.platform?.id || "platform"),
      marketplaceName: String(settings.platform?.marketplaceName || ""),
      currencyCode: String(settings.platform?.currencyCode || "NGN"),
      countryCode: String(settings.platform?.countryCode || "NG"),
      supportEmail: settings.platform?.supportEmail
        ? String(settings.platform.supportEmail)
        : null,
      createdAt: String(settings.platform?.createdAt || ""),
      updatedAt: String(settings.platform?.updatedAt || ""),
    },
    shipping: {
      id: String(settings.shipping?.id || "shipping"),
      abujaMinimumFee: Number(settings.shipping?.abujaMinimumFee || 0),
      abujaAdditionalUnitFee: Number(
        settings.shipping?.abujaAdditionalUnitFee || 0,
      ),
      outsideMinimumFee: Number(settings.shipping?.outsideMinimumFee || 0),
      outsideAdditionalUnitFee: Number(
        settings.shipping?.outsideAdditionalUnitFee || 0,
      ),
      weightUnitSizeKg: Number(settings.shipping?.weightUnitSizeKg || 0),
      volumetricDivisor: Number(settings.shipping?.volumetricDivisor || 0),
      createdAt: String(settings.shipping?.createdAt || ""),
      updatedAt: String(settings.shipping?.updatedAt || ""),
    },
    commission: {
      id: String(settings.commission?.id || "commission"),
      commissionRateBps: Number(settings.commission?.commissionRateBps || 0),
      commissionRatePercent: Number(
        settings.commission?.commissionRatePercent || 0,
      ),
      createdAt: String(settings.commission?.createdAt || ""),
      updatedAt: String(settings.commission?.updatedAt || ""),
    },
    payout: {
      id: String(settings.payout?.id || "payout"),
      autoPayoutThreshold: Number(settings.payout?.autoPayoutThreshold || 0),
      weeklyPayoutDay:
        settings.payout?.weeklyPayoutDay == null
          ? null
          : Number(settings.payout.weeklyPayoutDay),
      createdAt: String(settings.payout?.createdAt || ""),
      updatedAt: String(settings.payout?.updatedAt || ""),
    },
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminSettingsStore = create<AdminSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchSettings: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({
        settings: null,
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
      });
      return null;
    }

    if (state.isLoading) return state.settings;
    if (!force && state.loaded && state.settings) {
      console.log("[Admin Settings] Fetch skipped: using cached store state");
      return state.settings;
    }

    console.log("[Admin Settings] Fetch start", { force });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        settings: any;
      }>("/api/admin/settings", {
        method: "GET",
        token,
      });

      const settings = normalizeSettings(response.settings);
      console.log("[Admin Settings] Fetch success", settings);
      set({
        settings,
        isLoading: false,
        error: null,
        loaded: true,
      });
      return settings;
    } catch (error) {
      console.error("[Admin Settings] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load settings",
      });
      return null;
    }
  },

  updateSettings: async (payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Settings] Update start", payload);
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        settings: any;
      }>("/api/admin/settings", {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      const settings = normalizeSettings(response.settings);
      console.log("[Admin Settings] Update success", settings);
      set({
        settings,
        isUpdating: false,
        error: null,
        loaded: true,
      });
      return settings;
    } catch (error) {
      console.error("[Admin Settings] Update failed", {
        payload,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to update settings",
      });
      throw error;
    }
  },

  resetSettings: () =>
    set({
      settings: null,
      isLoading: false,
      isUpdating: false,
      error: null,
      loaded: false,
    }),

  clearError: () => set({ error: null }),
}));
