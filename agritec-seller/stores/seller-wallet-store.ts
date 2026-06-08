"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export type SellerWalletRecord = {
  id: string;
  sellerId: string;
  pendingBalance: number;
  availableBalance: number;
  processingBalance: number;
  withdrawnBalance: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
};

export type SellerBankAccountRecord = {
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

export type SellerWalletTransactionRecord = {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  pendingBalanceAfter: number;
  availableBalanceAfter: number;
  processingBalanceAfter: number;
  withdrawnBalanceAfter: number;
  totalEarningsAfter: number;
  description: string;
  orderGroupId: string | null;
  withdrawalRequestId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
};

export type SellerPayoutRecord = {
  id: string;
  sellerId: string;
  walletId: string;
  bankAccountId: string;
  amount: number;
  status: string;
  approvedByAdminId: string | null;
  paystackTransferCode: string | null;
  paystackTransferReference: string | null;
  paystackTransferStatus: string | null;
  failureReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  processedAt: string | null;
  bankAccount?: SellerBankAccountRecord | null;
};

type SellerWalletState = {
  wallet: SellerWalletRecord | null;
  bankAccount: SellerBankAccountRecord | null;
  autoPayoutEnabled: boolean;
  activeWithdrawal: SellerPayoutRecord | null;
  canRequestPayout: boolean;
  transactions: SellerWalletTransactionRecord[];
  payouts: SellerPayoutRecord[];
  loadedForSellerId: string | null;
  isLoading: boolean;
  isRequestingPayout: boolean;
  error: string | null;
  fetchWalletData: (options?: { force?: boolean }) => Promise<void>;
  requestPayout: () => Promise<SellerPayoutRecord>;
  resetWallet: () => void;
  clearError: () => void;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function normalizeWallet(
  wallet: Record<string, unknown> | null | undefined,
): SellerWalletRecord | null {
  if (!wallet) {
    return null;
  }

  return {
    id: String(wallet.id ?? ""),
    sellerId: String(wallet.sellerId ?? ""),
    pendingBalance: toNumber(wallet.pendingBalance),
    availableBalance: toNumber(wallet.availableBalance),
    processingBalance: toNumber(wallet.processingBalance),
    withdrawnBalance: toNumber(wallet.withdrawnBalance),
    totalEarnings: toNumber(wallet.totalEarnings),
    createdAt: String(wallet.createdAt ?? ""),
    updatedAt: String(wallet.updatedAt ?? ""),
  };
}

function normalizeBankAccount(
  bankAccount: Record<string, unknown> | null | undefined,
): SellerBankAccountRecord | null {
  if (!bankAccount) {
    return null;
  }

  return {
    id: String(bankAccount.id ?? ""),
    bankName: String(bankAccount.bankName ?? ""),
    bankCode: String(bankAccount.bankCode ?? ""),
    accountNumber: String(bankAccount.accountNumber ?? ""),
    accountName: String(bankAccount.accountName ?? ""),
    isVerified: Boolean(bankAccount.isVerified),
    paystackRecipientCode:
      bankAccount.paystackRecipientCode == null
        ? null
        : String(bankAccount.paystackRecipientCode),
    createdAt: String(bankAccount.createdAt ?? ""),
    updatedAt: String(bankAccount.updatedAt ?? ""),
  };
}

function normalizeTransaction(
  transaction: Record<string, unknown>,
): SellerWalletTransactionRecord {
  return {
    id: String(transaction.id ?? ""),
    walletId: String(transaction.walletId ?? ""),
    type: String(transaction.type ?? ""),
    amount: toNumber(transaction.amount),
    pendingBalanceAfter: toNumber(transaction.pendingBalanceAfter),
    availableBalanceAfter: toNumber(transaction.availableBalanceAfter),
    processingBalanceAfter: toNumber(transaction.processingBalanceAfter),
    withdrawnBalanceAfter: toNumber(transaction.withdrawnBalanceAfter),
    totalEarningsAfter: toNumber(transaction.totalEarningsAfter),
    description: String(transaction.description ?? ""),
    orderGroupId:
      transaction.orderGroupId == null
        ? null
        : String(transaction.orderGroupId),
    withdrawalRequestId:
      transaction.withdrawalRequestId == null
        ? null
        : String(transaction.withdrawalRequestId),
    idempotencyKey:
      transaction.idempotencyKey == null
        ? null
        : String(transaction.idempotencyKey),
    createdAt: String(transaction.createdAt ?? ""),
  };
}

function normalizePayout(payout: Record<string, unknown>): SellerPayoutRecord {
  return {
    id: String(payout.id ?? ""),
    sellerId: String(payout.sellerId ?? ""),
    walletId: String(payout.walletId ?? ""),
    bankAccountId: String(payout.bankAccountId ?? ""),
    amount: toNumber(payout.amount),
    status: String(payout.status ?? ""),
    approvedByAdminId:
      payout.approvedByAdminId == null
        ? null
        : String(payout.approvedByAdminId),
    paystackTransferCode:
      payout.paystackTransferCode == null
        ? null
        : String(payout.paystackTransferCode),
    paystackTransferReference:
      payout.paystackTransferReference == null
        ? null
        : String(payout.paystackTransferReference),
    paystackTransferStatus:
      payout.paystackTransferStatus == null
        ? null
        : String(payout.paystackTransferStatus),
    failureReason:
      payout.failureReason == null ? null : String(payout.failureReason),
    requestedAt: String(payout.requestedAt ?? ""),
    approvedAt: payout.approvedAt == null ? null : String(payout.approvedAt),
    processedAt: payout.processedAt == null ? null : String(payout.processedAt),
    bankAccount: normalizeBankAccount(
      (payout.bankAccount as Record<string, unknown> | null | undefined) ??
        null,
    ),
  };
}

export const useSellerWalletStore = create<SellerWalletState>((set, get) => ({
  wallet: null,
  bankAccount: null,
  autoPayoutEnabled: false,
  activeWithdrawal: null,
  canRequestPayout: false,
  transactions: [],
  payouts: [],
  loadedForSellerId: null,
  isLoading: false,
  isRequestingPayout: false,
  error: null,

  fetchWalletData: async (options) => {
    const token = useSellerAuthStore.getState().token;
    const force = options?.force ?? false;
    const state = get();
    const sellerId =
      useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;

    if (!token || !sellerId) {
      console.log("[Seller Wallet] Fetch skipped: seller session missing");
      set({
        wallet: null,
        bankAccount: null,
        activeWithdrawal: null,
        canRequestPayout: false,
        transactions: [],
        payouts: [],
        loadedForSellerId: null,
        isLoading: false,
      });
      return;
    }

    if (state.isLoading) {
      console.log(
        "[Seller Wallet] Fetch skipped: request already in progress",
        {
          sellerId,
        },
      );
      return;
    }

    if (!force && state.loadedForSellerId === sellerId) {
      console.log("[Seller Wallet] Fetch skipped: using cached store state", {
        sellerId,
      });
      return;
    }

    console.log("[Seller Wallet] Fetch start", { sellerId, force });
    set({ isLoading: true, error: null });

    try {
      const [walletResponse, transactionsResponse, payoutsResponse] =
        await Promise.all([
          sellerApiRequest<{
            wallet: Record<string, unknown> | null;
            bankAccount: Record<string, unknown> | null;
            autoPayoutEnabled: boolean;
            activeWithdrawal: Record<string, unknown> | null;
            canRequestPayout: boolean;
          }>("/api/seller/wallet", { method: "GET", token }),

          sellerApiRequest<{ transactions: Record<string, unknown>[] }>(
            "/api/seller/wallet/transactions",
            { method: "GET", token },
          ),

          sellerApiRequest<{ payouts: Record<string, unknown>[] }>(
            "/api/seller/payouts",
            { method: "GET", token },
          ),
        ]);

      const wallet = normalizeWallet(walletResponse.wallet);
      const bankAccount = normalizeBankAccount(walletResponse.bankAccount);
      const activeWithdrawal = walletResponse.activeWithdrawal
        ? normalizePayout(walletResponse.activeWithdrawal)
        : null;
      const transactions = (transactionsResponse.transactions ?? []).map(
        normalizeTransaction,
      );
      const payouts = (payoutsResponse.payouts ?? []).map(normalizePayout);

      console.log("[Seller Wallet] Fetch success", {
        sellerId,
        transactionCount: transactions.length,
        payoutCount: payouts.length,
        canRequestPayout: walletResponse.canRequestPayout,
      });

      set({
        wallet,
        bankAccount,
        autoPayoutEnabled: Boolean(walletResponse.autoPayoutEnabled),
        activeWithdrawal,
        canRequestPayout: Boolean(walletResponse.canRequestPayout),
        transactions,
        payouts,
        loadedForSellerId: sellerId,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("[Seller Wallet] Fetch failed", {
        sellerId,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });

      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch wallet data",
      });
    }
  },

  requestPayout: async () => {
    const token = useSellerAuthStore.getState().token;
    const sellerId =
      useSellerAuthStore.getState().user?.sellerProfile?.id ?? null;

    if (!token || !sellerId) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Wallet] Payout request start", { sellerId });
    set({ isRequestingPayout: true, error: null });

    try {
      const response = await sellerApiRequest<{
        payout: Record<string, unknown>;
      }>("/api/seller/payouts", {
        method: "POST",
        token,
      });

      const payout = normalizePayout(response.payout);

      console.log("[Seller Wallet] Payout request success", {
        sellerId,
        payoutId: payout.id,
        amount: payout.amount,
      });

      await get().fetchWalletData({ force: true });
      set({ isRequestingPayout: false });

      return payout;
    } catch (error) {
      console.error("[Seller Wallet] Payout request failed", {
        sellerId,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });

      set({
        isRequestingPayout: false,
        error:
          error instanceof Error ? error.message : "Failed to request payout",
      });
      throw error;
    }
  },

  resetWallet: () => {
    console.log("[Seller Wallet] Reset store state");
    set({
      wallet: null,
      bankAccount: null,
      autoPayoutEnabled: false,
      activeWithdrawal: null,
      canRequestPayout: false,
      transactions: [],
      payouts: [],
      loadedForSellerId: null,
      isLoading: false,
      isRequestingPayout: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

