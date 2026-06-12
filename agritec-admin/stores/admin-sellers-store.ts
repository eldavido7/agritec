"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

export type AdminPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminSellerRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastActiveAt: string | null;
  farmName: string;
  description: string | null;
  locationLabel: string | null;
  fullAddress: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  autoPayoutEnabled: boolean;
  productCount: number;
  discountCount: number;
  orderGroupCount: number;
  withdrawalCount: number;
  bankAccountVerified: boolean;
  wallet: {
    availableBalance: number;
    pendingBalance: number;
    processingBalance: number;
    withdrawnBalance: number;
    totalEarnings: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type AdminSellersState = {
  sellers: AdminSellerRecord[];
  pagination: AdminPagination;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchSellers: (options?: { force?: boolean }) => Promise<void>;
  updateSeller: (
    sellerId: string,
    payload: Partial<Pick<AdminSellerRecord, 'isActive' | 'fullName' | 'email' | 'phone' | 'farmName'>>,
  ) => Promise<AdminSellerRecord>;
  resetSellers: () => void;
  clearError: () => void;
};

const defaultPagination: AdminPagination = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
};

function normalizeSeller(seller: any): AdminSellerRecord {
  return {
    id: String(seller.id),
    userId: String(seller.userId),
    fullName: String(seller.fullName || ''),
    email: String(seller.email || ''),
    phone: seller.phone ? String(seller.phone) : null,
    isActive: Boolean(seller.isActive),
    emailVerifiedAt: seller.emailVerifiedAt ? String(seller.emailVerifiedAt) : null,
    lastActiveAt: seller.lastActiveAt ? String(seller.lastActiveAt) : null,
    farmName: String(seller.farmName || ''),
    description: seller.description ? String(seller.description) : null,
    locationLabel: seller.locationLabel ? String(seller.locationLabel) : null,
    fullAddress: seller.fullAddress ? String(seller.fullAddress) : null,
    city: seller.city ? String(seller.city) : null,
    state: seller.state ? String(seller.state) : null,
    latitude: seller.latitude == null ? null : Number(seller.latitude),
    longitude: seller.longitude == null ? null : Number(seller.longitude),
    autoPayoutEnabled: Boolean(seller.autoPayoutEnabled),
    productCount: Number(seller.productCount || 0),
    discountCount: Number(seller.discountCount || 0),
    orderGroupCount: Number(seller.orderGroupCount || 0),
    withdrawalCount: Number(seller.withdrawalCount || 0),
    bankAccountVerified: Boolean(seller.bankAccountVerified),
    wallet: seller.wallet
      ? {
          availableBalance: Number(seller.wallet.availableBalance || 0),
          pendingBalance: Number(seller.wallet.pendingBalance || 0),
          processingBalance: Number(seller.wallet.processingBalance || 0),
          withdrawnBalance: Number(seller.wallet.withdrawnBalance || 0),
          totalEarnings: Number(seller.wallet.totalEarnings || 0),
        }
      : null,
    createdAt: String(seller.createdAt || ''),
    updatedAt: String(seller.updatedAt || ''),
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminSellersStore = create<AdminSellersState>((set, get) => ({
  sellers: [],
  pagination: defaultPagination,
  isLoading: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchSellers: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({ sellers: [], pagination: defaultPagination, isLoading: false, error: 'Admin session not found', loaded: false });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded) {
      console.log('[Admin Sellers] Fetch skipped: using cached store state', {
        count: state.sellers.length,
      });
      return;
    }

    console.log('[Admin Sellers] Fetch start', { force });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        sellers: any[];
        pagination: AdminPagination;
      }>('/api/admin/sellers?page=1&pageSize=50', {
        method: 'GET',
        token,
      });

      const sellers = response.sellers.map(normalizeSeller);
      console.log('[Admin Sellers] Fetch success', {
        count: sellers.length,
        sellerIds: sellers.map((seller) => seller.id),
      });

      set({
        sellers,
        pagination: response.pagination ?? { ...defaultPagination, total: sellers.length },
        isLoading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error('[Admin Sellers] Fetch failed', describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unable to load sellers',
      });
    }
  },

  updateSeller: async (sellerId, payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error('Admin session not found');
    }

    console.log('[Admin Sellers] Update start', { sellerId, payload });
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        seller: any;
      }>(`/api/admin/sellers/${sellerId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      });

      const updated = normalizeSeller(response.seller);
      console.log('[Admin Sellers] Update success', { sellerId });

      set((state) => ({
        sellers: state.sellers.map((seller) =>
          seller.id === sellerId ? updated : seller,
        ),
        isUpdating: false,
        error: null,
        loaded: true,
      }));

      return updated;
    } catch (error) {
      console.error('[Admin Sellers] Update failed', {
        sellerId,
        payload,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Unable to update seller',
      });
      throw error;
    }
  },

  resetSellers: () => {
    set({
      sellers: [],
      pagination: defaultPagination,
      isLoading: false,
      isUpdating: false,
      error: null,
      loaded: false,
    });
  },

  clearError: () => set({ error: null }),
}));
