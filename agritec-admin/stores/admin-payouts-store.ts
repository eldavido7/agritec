"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

export type AdminPayoutStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export type AdminPayoutRecord = {
  id: string;
  sellerId: string;
  sellerUserId: string;
  sellerName: string;
  farmName: string;
  amount: number;
  status: AdminPayoutStatus;
  requestedAt: string;
  approvedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
  paystackTransferCode: string | null;
  paystackTransferReference: string | null;
  paystackTransferStatus: string | null;
  failureReason: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  approvedByAdminName: string | null;
  walletId: string;
};

type AdminPayoutsState = {
  payouts: AdminPayoutRecord[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchPayouts: (options?: { force?: boolean }) => Promise<void>;
  approvePayout: (payoutId: string) => Promise<AdminPayoutRecord>;
  rejectPayout: (payoutId: string) => Promise<AdminPayoutRecord>;
  resetPayouts: () => void;
  clearError: () => void;
};

function normalizePayoutStatus(status: unknown): AdminPayoutStatus {
  const value = String(status || "PENDING").toUpperCase();
  switch (value) {
    case "APPROVED":
    case "PROCESSING":
    case "COMPLETED":
    case "FAILED":
    case "REJECTED":
      return value;
    default:
      return "PENDING";
  }
}

function normalizePayout(payout: any): AdminPayoutRecord {
  return {
    id: String(payout.id),
    sellerId: String(payout.sellerId),
    sellerUserId: String(payout.seller?.userId || ""),
    sellerName: String(payout.seller?.user?.fullName || ""),
    farmName: String(payout.seller?.farmName || ""),
    amount: Number(payout.amount || 0),
    status: normalizePayoutStatus(payout.status),
    requestedAt: String(payout.requestedAt || payout.createdAt || ""),
    approvedAt: payout.approvedAt ? String(payout.approvedAt) : null,
    processedAt: payout.processedAt ? String(payout.processedAt) : null,
    completedAt: payout.completedAt ? String(payout.completedAt) : null,
    paystackTransferCode: payout.paystackTransferCode
      ? String(payout.paystackTransferCode)
      : null,
    paystackTransferReference: payout.paystackTransferReference
      ? String(payout.paystackTransferReference)
      : null,
    paystackTransferStatus: payout.paystackTransferStatus
      ? String(payout.paystackTransferStatus)
      : null,
    failureReason: payout.failureReason ? String(payout.failureReason) : null,
    bankName: String(payout.bankAccount?.bankName || ""),
    accountNumber: String(payout.bankAccount?.accountNumber || ""),
    accountName: String(payout.bankAccount?.accountName || ""),
    approvedByAdminName: payout.approvedByAdmin?.fullName
      ? String(payout.approvedByAdmin.fullName)
      : null,
    walletId: String(payout.walletId || payout.wallet?.id || ""),
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminPayoutsStore = create<AdminPayoutsState>((set, get) => ({
  payouts: [],
  isLoading: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchPayouts: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({
        payouts: [],
        isLoading: false,
        isUpdating: false,
        error: "Admin session not found",
        loaded: false,
      });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded) {
      console.log("[Admin Payouts] Fetch skipped: using cached store state", {
        count: state.payouts.length,
      });
      return;
    }

    console.log("[Admin Payouts] Fetch start", { force });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        payouts: any[];
      }>("/api/admin/payouts", {
        method: "GET",
        token,
      });

      const payouts = response.payouts.map(normalizePayout);
      console.log("[Admin Payouts] Fetch success", {
        count: payouts.length,
        payoutIds: payouts.map((payout) => payout.id),
      });

      set({
        payouts,
        isLoading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error("[Admin Payouts] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load payouts",
      });
    }
  },

  approvePayout: async (payoutId) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Payouts] Approve start", { payoutId });
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        payout: any;
      }>(`/api/admin/payouts/${payoutId}/approve`, {
        method: "POST",
        token,
      });

      const updated = normalizePayout(response.payout);
      console.log("[Admin Payouts] Approve success", {
        payoutId,
        status: updated.status,
      });

      set((state) => ({
        payouts: state.payouts.map((payout) =>
          payout.id === payoutId ? updated : payout,
        ),
        isUpdating: false,
        error: null,
        loaded: true,
      }));

      return updated;
    } catch (error) {
      console.error("[Admin Payouts] Approve failed", {
        payoutId,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to approve payout",
      });
      throw error;
    }
  },

  rejectPayout: async (payoutId) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Payouts] Reject start", { payoutId });
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        payout: any;
      }>(`/api/admin/payouts/${payoutId}/reject`, {
        method: "POST",
        token,
      });

      const updated = normalizePayout(response.payout);
      console.log("[Admin Payouts] Reject success", {
        payoutId,
        status: updated.status,
      });

      set((state) => ({
        payouts: state.payouts.map((payout) =>
          payout.id === payoutId ? updated : payout,
        ),
        isUpdating: false,
        error: null,
        loaded: true,
      }));

      return updated;
    } catch (error) {
      console.error("[Admin Payouts] Reject failed", {
        payoutId,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to reject payout",
      });
      throw error;
    }
  },

  resetPayouts: () => {
    set({
      payouts: [],
      isLoading: false,
      isUpdating: false,
      error: null,
      loaded: false,
    });
  },

  clearError: () => set({ error: null }),
}));
