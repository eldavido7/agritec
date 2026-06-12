"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import type { AdminPagination } from "@/stores/admin-sellers-store";

export type AdminBuyerRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  addressCount: number;
  wishlistCount: number;
  orderCount: number;
  cartItemCount: number;
};

export type AdminBuyerAddressRecord = {
  id: string;
  displayName: string | null;
  addressLine: string;
  fullAddress: string;
  city: string;
  state: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  isManualAddress: boolean;
  isAdminAssisted: boolean;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminBuyerDetailRecord = AdminBuyerRecord & {
  addresses: AdminBuyerAddressRecord[];
  recentOrders: Array<{
    id: string;
    status: string;
    paymentStatus: string;
    grandTotal: number;
    createdAt: string;
  }>;
};

type AdminBuyersState = {
  buyers: AdminBuyerRecord[];
  selectedBuyerDetail: AdminBuyerDetailRecord | null;
  pagination: AdminPagination;
  isLoading: boolean;
  isDetailLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchBuyers: (options?: { force?: boolean }) => Promise<void>;
  fetchBuyerDetail: (buyerId: string, options?: { force?: boolean }) => Promise<AdminBuyerDetailRecord>;
  updateBuyer: (
    buyerId: string,
    payload: Partial<Pick<AdminBuyerRecord, "isActive" | "fullName" | "email" | "phone">>,
  ) => Promise<AdminBuyerRecord>;
  clearSelectedBuyerDetail: () => void;
  resetBuyers: () => void;
  clearError: () => void;
};

const defaultPagination: AdminPagination = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
};

function normalizeBuyer(buyer: any): AdminBuyerRecord {
  return {
    id: String(buyer.id),
    userId: String(buyer.userId),
    fullName: String(buyer.fullName || ""),
    email: String(buyer.email || ""),
    phone: buyer.phone ? String(buyer.phone) : null,
    isActive: Boolean(buyer.isActive),
    emailVerifiedAt: buyer.emailVerifiedAt ? String(buyer.emailVerifiedAt) : null,
    lastActiveAt: buyer.lastActiveAt ? String(buyer.lastActiveAt) : null,
    createdAt: String(buyer.createdAt || ""),
    updatedAt: String(buyer.updatedAt || ""),
    addressCount: Number(buyer.addressCount || 0),
    wishlistCount: Number(buyer.wishlistCount || 0),
    orderCount: Number(buyer.orderCount || 0),
    cartItemCount: Number(buyer.cartItemCount || 0),
  };
}

function normalizeBuyerAddress(address: any): AdminBuyerAddressRecord {
  return {
    id: String(address.id),
    displayName: address.displayName ? String(address.displayName) : null,
    addressLine: String(address.addressLine || ""),
    fullAddress: String(address.fullAddress || ""),
    city: String(address.city || ""),
    state: String(address.state || ""),
    landmark: address.landmark ? String(address.landmark) : null,
    latitude: address.latitude == null ? null : Number(address.latitude),
    longitude: address.longitude == null ? null : Number(address.longitude),
    isDefault: Boolean(address.isDefault),
    isManualAddress: Boolean(address.isManualAddress),
    isAdminAssisted: Boolean(address.isAdminAssisted),
    createdByRole: String(address.createdByRole || "BUYER"),
    createdAt: String(address.createdAt || ""),
    updatedAt: String(address.updatedAt || ""),
  };
}

function normalizeBuyerDetail(buyer: any): AdminBuyerDetailRecord {
  return {
    ...normalizeBuyer(buyer),
    addresses: Array.isArray(buyer.addresses)
      ? buyer.addresses.map(normalizeBuyerAddress)
      : [],
    recentOrders: Array.isArray(buyer.recentOrders)
      ? buyer.recentOrders.map((order: any) => ({
          id: String(order.id),
          status: String(order.status || ""),
          paymentStatus: String(order.paymentStatus || ""),
          grandTotal: Number(order.grandTotal || 0),
          createdAt: String(order.createdAt || ""),
        }))
      : [],
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminBuyersStore = create<AdminBuyersState>((set, get) => ({
  buyers: [],
  selectedBuyerDetail: null,
  pagination: defaultPagination,
  isLoading: false,
  isDetailLoading: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchBuyers: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({
        buyers: [],
        selectedBuyerDetail: null,
        pagination: defaultPagination,
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
      });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded) {
      console.log("[Admin Buyers] Fetch skipped: using cached store state", {
        count: state.buyers.length,
      });
      return;
    }

    console.log("[Admin Buyers] Fetch start", { force });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        buyers: any[];
        pagination: AdminPagination;
      }>("/api/admin/buyers?page=1&pageSize=50", {
        method: "GET",
        token,
      });

      const buyers = response.buyers.map(normalizeBuyer);
      console.log("[Admin Buyers] Fetch success", {
        count: buyers.length,
        buyerIds: buyers.map((buyer) => buyer.id),
      });

      set({
        buyers,
        pagination:
          response.pagination ?? {
            ...defaultPagination,
            total: buyers.length,
          },
        isLoading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error("[Admin Buyers] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load buyers",
      });
    }
  },

  fetchBuyerDetail: async (buyerId, options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      throw new Error("Admin session not found");
    }

    if (
      !force &&
      state.selectedBuyerDetail &&
      state.selectedBuyerDetail.id === buyerId
    ) {
      console.log("[Admin Buyers] Detail fetch skipped: using cached detail", {
        buyerId,
      });
      return state.selectedBuyerDetail;
    }

    console.log("[Admin Buyers] Detail fetch start", { buyerId, force });
    set({ isDetailLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        buyer: any;
      }>(`/api/admin/buyers/${buyerId}`, {
        method: "GET",
        token,
      });

      const detail = normalizeBuyerDetail(response.buyer);
      console.log("[Admin Buyers] Detail fetch success", {
        buyerId,
        addressCount: detail.addresses.length,
      });

      set({
        selectedBuyerDetail: detail,
        buyers: get().buyers.map((buyer) =>
          buyer.id === buyerId ? normalizeBuyer(detail) : buyer,
        ),
        isDetailLoading: false,
        error: null,
        loaded: true,
      });

      return detail;
    } catch (error) {
      console.error("[Admin Buyers] Detail fetch failed", {
        buyerId,
        error: describeError(error),
      });
      set({
        isDetailLoading: false,
        error: error instanceof Error ? error.message : "Unable to load buyer details",
      });
      throw error;
    }
  },

  updateBuyer: async (buyerId, payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Buyers] Update start", { buyerId, payload });
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        buyer: any;
      }>(`/api/admin/buyers/${buyerId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      const updated = normalizeBuyerDetail(response.buyer);
      console.log("[Admin Buyers] Update success", { buyerId });

      set((state) => ({
        buyers: state.buyers.map((buyer) =>
          buyer.id === buyerId ? normalizeBuyer(updated) : buyer,
        ),
        selectedBuyerDetail:
          state.selectedBuyerDetail?.id === buyerId
            ? updated
            : state.selectedBuyerDetail,
        isUpdating: false,
        error: null,
        loaded: true,
      }));

      return normalizeBuyer(updated);
    } catch (error) {
      console.error("[Admin Buyers] Update failed", {
        buyerId,
        payload,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to update buyer",
      });
      throw error;
    }
  },

  clearSelectedBuyerDetail: () => set({ selectedBuyerDetail: null, isDetailLoading: false }),

  resetBuyers: () => {
    set({
      buyers: [],
      selectedBuyerDetail: null,
      pagination: defaultPagination,
      isLoading: false,
      isDetailLoading: false,
      isUpdating: false,
      error: null,
      loaded: false,
    });
  },

  clearError: () => set({ error: null }),
}));
