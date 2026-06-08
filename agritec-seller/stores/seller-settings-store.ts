"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import {
  type SellerAuthUser,
  useSellerAuthStore,
} from "@/stores/seller-auth-store";

export type SellerBankOptionRecord = {
  id: string;
  name: string;
  code: string;
};

export type SellerBankAccountVerificationRecord = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
};

export type SellerSavedBankAccountRecord = {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
  paystackRecipientCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type SellerSettingsState = {
  profile: SellerAuthUser | null;
  bankAccount: SellerSavedBankAccountRecord | null;
  autoPayoutEnabled: boolean;
  canReceivePayouts: boolean;
  banks: SellerBankOptionRecord[];
  bankVerification: SellerBankAccountVerificationRecord | null;
  loadedForSellerId: string | null;
  banksLoaded: boolean;
  isLoading: boolean;
  isSavingProfile: boolean;
  isChangingPassword: boolean;
  isLoadingBanks: boolean;
  isVerifyingBank: boolean;
  isSavingBank: boolean;
  error: string | null;
  fetchSettingsData: (options?: { force?: boolean }) => Promise<void>;
  fetchBanks: (options?: { force?: boolean }) => Promise<void>;
  updateProfile: (payload: {
    fullName: string;
    email: string;
    phone?: string | null;
    farmName: string;
    description?: string | null;
    locationLabel?: string | null;
    fullAddress?: string | null;
    city?: string | null;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) => Promise<SellerAuthUser>;
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<string>;
  verifyBankAccount: (payload: {
    bankCode: string;
    accountNumber: string;
  }) => Promise<SellerBankAccountVerificationRecord>;
  saveBankAccount: (payload: {
    bankCode: string;
    accountNumber: string;
    autoPayoutEnabled?: boolean;
  }) => Promise<void>;
  updateAutoPayoutEnabled: (enabled: boolean) => Promise<void>;
  removeBankAccount: () => Promise<void>;
  resetSettings: () => void;
  clearError: () => void;
};

function normalizeBankOption(bank: Record<string, unknown>): SellerBankOptionRecord {
  return {
    id: String(bank.id ?? ""),
    name: String(bank.name ?? ""),
    code: String(bank.code ?? ""),
  };
}

function normalizeSavedBankAccount(
  bank: Record<string, unknown> | null | undefined,
): SellerSavedBankAccountRecord | null {
  if (!bank) return null;

  return {
    id: String(bank.id ?? ""),
    bankName: String(bank.bankName ?? ""),
    bankCode: String(bank.bankCode ?? ""),
    accountNumber: String(bank.accountNumber ?? ""),
    accountName: String(bank.accountName ?? ""),
    isVerified: Boolean(bank.isVerified),
    paystackRecipientCode:
      bank.paystackRecipientCode == null
        ? null
        : String(bank.paystackRecipientCode),
    createdAt: String(bank.createdAt ?? ""),
    updatedAt: String(bank.updatedAt ?? ""),
  };
}

function normalizeBankVerification(
  verification: Record<string, unknown>,
): SellerBankAccountVerificationRecord {
  return {
    bankName: String(verification.bankName ?? ""),
    bankCode: String(verification.bankCode ?? ""),
    accountNumber: String(verification.accountNumber ?? ""),
    accountName: String(verification.accountName ?? ""),
    isVerified: Boolean(verification.isVerified),
  };
}

export const useSellerSettingsStore = create<SellerSettingsState>((set, get) => ({
  profile: null,
  bankAccount: null,
  autoPayoutEnabled: false,
  canReceivePayouts: false,
  banks: [],
  bankVerification: null,
  loadedForSellerId: null,
  banksLoaded: false,
  isLoading: false,
  isSavingProfile: false,
  isChangingPassword: false,
  isLoadingBanks: false,
  isVerifyingBank: false,
  isSavingBank: false,
  error: null,

  fetchSettingsData: async (options) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;
    const force = options?.force ?? false;
    const state = get();

    if (!token || !sellerId) {
      console.log("[Seller Settings] Fetch skipped: seller session missing");
      set({
        profile: null,
        bankAccount: null,
        autoPayoutEnabled: false,
        canReceivePayouts: false,
        bankVerification: null,
        loadedForSellerId: null,
        isLoading: false,
      });
      return;
    }

    if (state.isLoading) {
      console.log("[Seller Settings] Fetch skipped: request already in progress", {
        sellerId,
      });
      return;
    }

    if (!force && state.loadedForSellerId === sellerId) {
      console.log("[Seller Settings] Fetch skipped: using cached store state", {
        sellerId,
      });
      return;
    }

    console.log("[Seller Settings] Fetch start", { sellerId, force });
    set({ isLoading: true, error: null });

    try {
      const [profileResponse, bankResponse] = await Promise.all([
        sellerApiRequest<{ user: SellerAuthUser }>("/api/seller/profile", {
          method: "GET",
          token,
        }),
        sellerApiRequest<{
          bankAccount: Record<string, unknown> | null;
          autoPayoutEnabled: boolean;
          canReceivePayouts: boolean;
        }>("/api/seller/bank-account", {
          method: "GET",
          token,
        }),
      ]);

      console.log("[Seller Settings] Fetch success", {
        sellerId,
        hasBankAccount: Boolean(bankResponse.bankAccount),
      });

      useSellerAuthStore.setState((current) => ({
        user: current.user ? profileResponse.user : current.user,
      }));

      set({
        profile: profileResponse.user,
        bankAccount: normalizeSavedBankAccount(bankResponse.bankAccount),
        autoPayoutEnabled: Boolean(bankResponse.autoPayoutEnabled),
        canReceivePayouts: Boolean(bankResponse.canReceivePayouts),
        loadedForSellerId: sellerId,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("[Seller Settings] Fetch failed", {
        sellerId,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      });

      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch seller settings",
      });
    }
  },

  fetchBanks: async (options) => {
    const token = useSellerAuthStore.getState().token;
    const force = options?.force ?? false;
    const state = get();

    if (!token) {
      throw new Error("Seller session not found");
    }

    if (state.isLoadingBanks) {
      return;
    }

    if (!force && state.banksLoaded) {
      return;
    }

    console.log("[Seller Settings] Fetch banks start");
    set({ isLoadingBanks: true, error: null });

    try {
      const response = await sellerApiRequest<{ banks: Record<string, unknown>[] }>(
        "/api/seller/bank-account/banks",
        {
          method: "GET",
          token,
        },
      );

      const banks = (response.banks ?? []).map(normalizeBankOption);
      console.log("[Seller Settings] Fetch banks success", { count: banks.length });
      set({
        banks,
        banksLoaded: true,
        isLoadingBanks: false,
        error: null,
      });
    } catch (error) {
      console.error("[Seller Settings] Fetch banks failed", error);
      set({
        isLoadingBanks: false,
        error: error instanceof Error ? error.message : "Failed to fetch banks",
      });
      throw error;
    }
  },

  updateProfile: async (payload) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;
    if (!token || !sellerId) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Settings] Update profile start", {
      sellerId,
      payload,
    });
    set({ isSavingProfile: true, error: null });

    try {
      const response = await sellerApiRequest<{
        user: SellerAuthUser;
        message: string;
      }>("/api/seller/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      useSellerAuthStore.setState((current) => ({
        user: current.user ? response.user : current.user,
      }));

      set((state) => ({
        profile: response.user,
        autoPayoutEnabled:
          response.user.sellerProfile?.autoPayoutEnabled ?? state.autoPayoutEnabled,
        isSavingProfile: false,
        error: null,
        loadedForSellerId: sellerId,
      }));

      console.log("[Seller Settings] Update profile success", { sellerId });
      return response.user;
    } catch (error) {
      console.error("[Seller Settings] Update profile failed", {
        sellerId,
        error,
      });
      set({
        isSavingProfile: false,
        error:
          error instanceof Error ? error.message : "Failed to update seller profile",
      });
      throw error;
    }
  },

  changePassword: async (payload) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Settings] Change password start");
    set({ isChangingPassword: true, error: null });

    try {
      const response = await sellerApiRequest<{ message: string }>(
        "/api/auth/change-password",
        {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        },
      );

      set({ isChangingPassword: false, error: null });
      console.log("[Seller Settings] Change password success");
      return response.message;
    } catch (error) {
      console.error("[Seller Settings] Change password failed", error);
      set({
        isChangingPassword: false,
        error:
          error instanceof Error ? error.message : "Failed to update password",
      });
      throw error;
    }
  },

  verifyBankAccount: async (payload) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Settings] Verify bank start", payload);
    set({ isVerifyingBank: true, error: null, bankVerification: null });

    try {
      const response = await sellerApiRequest<{
        verification: Record<string, unknown>;
      }>("/api/seller/bank-account/verify", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      const verification = normalizeBankVerification(response.verification);
      set({
        bankVerification: verification,
        isVerifyingBank: false,
        error: null,
      });
      console.log("[Seller Settings] Verify bank success", verification);
      return verification;
    } catch (error) {
      console.error("[Seller Settings] Verify bank failed", error);
      set({
        isVerifyingBank: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify bank account",
      });
      throw error;
    }
  },

  saveBankAccount: async (payload) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;
    if (!token || !sellerId) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Settings] Save bank start", {
      sellerId,
      payload,
    });
    set({ isSavingBank: true, error: null });

    try {
      const response = await sellerApiRequest<{
        bankAccount: Record<string, unknown> | null;
        autoPayoutEnabled: boolean;
        canReceivePayouts: boolean;
      }>("/api/seller/bank-account", {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      useSellerAuthStore.setState((current) => ({
        user: current.user
          ? {
              ...current.user,
              sellerProfile: current.user.sellerProfile
                ? {
                    ...current.user.sellerProfile,
                    autoPayoutEnabled: Boolean(response.autoPayoutEnabled),
                  }
                : current.user.sellerProfile,
            }
          : current.user,
      }));

      set({
        bankAccount: normalizeSavedBankAccount(response.bankAccount),
        autoPayoutEnabled: Boolean(response.autoPayoutEnabled),
        canReceivePayouts: Boolean(response.canReceivePayouts),
        bankVerification: null,
        isSavingBank: false,
        error: null,
        loadedForSellerId: sellerId,
      });

      console.log("[Seller Settings] Save bank success", { sellerId });
    } catch (error) {
      console.error("[Seller Settings] Save bank failed", {
        sellerId,
        error,
      });
      set({
        isSavingBank: false,
        error:
          error instanceof Error ? error.message : "Failed to save bank account",
      });
      throw error;
    }
  },

  updateAutoPayoutEnabled: async (enabled) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;
    if (!token || !sellerId) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Settings] Update auto payout start", {
      sellerId,
      enabled,
    });
    set({ isSavingBank: true, error: null });

    try {
      const response = await sellerApiRequest<{
        bankAccount: Record<string, unknown> | null;
        autoPayoutEnabled: boolean;
        canReceivePayouts: boolean;
      }>("/api/seller/bank-account", {
        method: "PATCH",
        token,
        body: JSON.stringify({ autoPayoutEnabled: enabled }),
      });

      useSellerAuthStore.setState((current) => ({
        user: current.user
          ? {
              ...current.user,
              sellerProfile: current.user.sellerProfile
                ? {
                    ...current.user.sellerProfile,
                    autoPayoutEnabled: Boolean(response.autoPayoutEnabled),
                  }
                : current.user.sellerProfile,
            }
          : current.user,
      }));

      set({
        bankAccount: normalizeSavedBankAccount(response.bankAccount),
        autoPayoutEnabled: Boolean(response.autoPayoutEnabled),
        canReceivePayouts: Boolean(response.canReceivePayouts),
        isSavingBank: false,
        error: null,
      });
      console.log("[Seller Settings] Update auto payout success", {
        sellerId,
        enabled,
      });
    } catch (error) {
      console.error("[Seller Settings] Update auto payout failed", error);
      set({
        isSavingBank: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update payout preference",
      });
      throw error;
    }
  },

  removeBankAccount: async () => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;
    if (!token || !sellerId) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Settings] Remove bank start", { sellerId });
    set({ isSavingBank: true, error: null });

    try {
      await sellerApiRequest("/api/seller/bank-account", {
        method: "DELETE",
        token,
      });

      useSellerAuthStore.setState((current) => ({
        user: current.user
          ? {
              ...current.user,
              sellerProfile: current.user.sellerProfile
                ? {
                    ...current.user.sellerProfile,
                    autoPayoutEnabled: false,
                  }
                : current.user.sellerProfile,
            }
          : current.user,
      }));

      set({
        bankAccount: null,
        autoPayoutEnabled: false,
        canReceivePayouts: false,
        bankVerification: null,
        isSavingBank: false,
        error: null,
      });

      console.log("[Seller Settings] Remove bank success", { sellerId });
    } catch (error) {
      console.error("[Seller Settings] Remove bank failed", error);
      set({
        isSavingBank: false,
        error:
          error instanceof Error ? error.message : "Failed to remove bank account",
      });
      throw error;
    }
  },

  resetSettings: () => {
    console.log("[Seller Settings] Reset store state");
    set({
      profile: null,
      bankAccount: null,
      autoPayoutEnabled: false,
      canReceivePayouts: false,
      banks: [],
      bankVerification: null,
      loadedForSellerId: null,
      banksLoaded: false,
      isLoading: false,
      isSavingProfile: false,
      isChangingPassword: false,
      isLoadingBanks: false,
      isVerifyingBank: false,
      isSavingBank: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
