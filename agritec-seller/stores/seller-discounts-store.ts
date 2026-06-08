"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export type SellerDiscountTargetProductRecord = {
  id: string;
  title: string;
  sellerId?: string;
  isDeleted?: boolean;
  status?: string;
};

export type SellerDiscountTargetVariantRecord = {
  id: string;
  name: string;
  productId: string;
};

export type SellerDiscountRecord = {
  id: string;
  sellerId?: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  usageLimit: number | null;
  usageCount: number;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
  currentlyActive: boolean;
  productIds: string[];
  variantIds: string[];
  products: SellerDiscountTargetProductRecord[];
  variants: SellerDiscountTargetVariantRecord[];
  createdAt?: Date;
  updatedAt?: Date;
};

type SellerDiscountPayload = {
  code: string;
  description?: string | null;
  type: "percentage" | "fixed";
  value: number;
  usageLimit?: number | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  isActive?: boolean;
  productIds?: string[];
  variantIds?: string[];
};

type SellerDiscountsState = {
  discounts: SellerDiscountRecord[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadedForSellerId: string | null;
  fetchDiscounts: (options?: { force?: boolean; includeInactive?: boolean }) => Promise<void>;
  createDiscount: (payload: SellerDiscountPayload) => Promise<SellerDiscountRecord>;
  updateDiscount: (discountId: string, payload: SellerDiscountPayload) => Promise<SellerDiscountRecord>;
  deleteDiscount: (discountId: string) => Promise<void>;
  resetDiscounts: () => void;
  clearError: () => void;
};

const mapApiDiscount = (discount: any): SellerDiscountRecord => ({
  id: String(discount.id),
  sellerId: discount.sellerId ? String(discount.sellerId) : undefined,
  code: String(discount.code || "").toUpperCase(),
  description: discount.description || "",
  type: discount.type === "FIXED_AMOUNT" ? "fixed" : "percentage",
  value: Number(discount.value || 0),
  usageLimit: discount.usageLimit == null ? null : Number(discount.usageLimit),
  usageCount: Number(discount.usageCount || 0),
  startsAt: new Date(discount.startsAt),
  endsAt: discount.endsAt ? new Date(discount.endsAt) : null,
  isActive: Boolean(discount.isActive),
  currentlyActive: Boolean(discount.currentlyActive),
  productIds: Array.isArray(discount.productIds) ? discount.productIds.map(String) : [],
  variantIds: Array.isArray(discount.variantIds) ? discount.variantIds.map(String) : [],
  products: Array.isArray(discount.products)
    ? discount.products.map((product: any) => ({
        id: String(product.id),
        title: String(product.title || ""),
        sellerId: product.sellerId ? String(product.sellerId) : undefined,
        isDeleted: product.isDeleted == null ? undefined : Boolean(product.isDeleted),
        status: product.status ? String(product.status) : undefined,
      }))
    : [],
  variants: Array.isArray(discount.variants)
    ? discount.variants.map((variant: any) => ({
        id: String(variant.id),
        name: String(variant.name || ""),
        productId: String(variant.productId || ""),
      }))
    : [],
  createdAt: discount.createdAt ? new Date(discount.createdAt) : undefined,
  updatedAt: discount.updatedAt ? new Date(discount.updatedAt) : undefined,
});

const buildDiscountPayload = (payload: SellerDiscountPayload) => ({
  code: payload.code.trim().toUpperCase(),
  description: payload.description?.trim() || null,
  type: payload.type === "fixed" ? "FIXED_AMOUNT" : "PERCENTAGE",
  value: Math.max(0, Math.round(Number(payload.value || 0))),
  usageLimit: payload.usageLimit == null || payload.usageLimit === 0 ? null : Math.max(1, Math.round(Number(payload.usageLimit))),
  startsAt: new Date(payload.startsAt).toISOString(),
  endsAt: payload.endsAt ? new Date(payload.endsAt).toISOString() : null,
  isActive: payload.isActive ?? true,
  productIds: Array.from(new Set((payload.productIds || []).map(String))),
  variantIds: Array.from(new Set((payload.variantIds || []).map(String))),
});

const describeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

export const useSellerDiscountsStore = create<SellerDiscountsState>((set, get) => ({
  discounts: [],
  isLoading: false,
  isSaving: false,
  error: null,
  loadedForSellerId: null,

  fetchDiscounts: async (options) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    const state = get();
    const force = options?.force === true;
    const includeInactive = options?.includeInactive !== false;

    if (!token || !sellerId) {
      console.warn("[Seller Discounts] Fetch skipped: seller session not found");
      set({ discounts: [], error: "Seller session not found", isLoading: false, loadedForSellerId: null });
      return;
    }

    if (state.isLoading) {
      console.log("[Seller Discounts] Fetch skipped: request already in progress", { sellerId });
      return;
    }

    if (!force && state.loadedForSellerId === sellerId) {
      console.log("[Seller Discounts] Fetch skipped: using cached store state", { sellerId, count: state.discounts.length });
      return;
    }

    console.log("[Seller Discounts] Fetch start", { sellerId, force, includeInactive });
    set({ isLoading: true, error: null });

    try {
      const query = includeInactive ? "?includeInactive=true" : "";
      const response = await sellerApiRequest<{ success: true; discounts: any[] }>(`/api/seller/discounts${query}`, { method: "GET", token });
      const discounts = response.discounts.map(mapApiDiscount);
      console.log("[Seller Discounts] Fetch success", { sellerId, count: discounts.length, discountIds: discounts.map((discount) => discount.id) });
      set({ discounts, isLoading: false, error: null, loadedForSellerId: sellerId });
    } catch (error) {
      console.error("[Seller Discounts] Fetch failed", describeError(error));
      set({ isLoading: false, error: error instanceof Error ? error.message : "Unable to load discounts" });
    }
  },

  createDiscount: async (payload) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    if (!token) throw new Error("Seller session not found");

    const body = buildDiscountPayload(payload);
    console.log("[Seller Discounts] Create start", { sellerId, body });
    set({ isSaving: true, error: null });

    try {
      const response = await sellerApiRequest<{ success: true; discount: any }>("/api/seller/discounts", { method: "POST", token, body: JSON.stringify(body) });
      const created = mapApiDiscount(response.discount);
      console.log("[Seller Discounts] Create success", { id: created.id, code: created.code });
      set((state) => ({ discounts: [created, ...state.discounts], isSaving: false, error: null, loadedForSellerId: sellerId }));
      return created;
    } catch (error) {
      console.error("[Seller Discounts] Create failed", { sellerId, payload: body, error: describeError(error) });
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to create discount" });
      throw error;
    }
  },

  updateDiscount: async (discountId, payload) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    if (!token) throw new Error("Seller session not found");

    const body = buildDiscountPayload(payload);
    console.log("[Seller Discounts] Update start", { sellerId, discountId, body });
    set({ isSaving: true, error: null });

    try {
      const response = await sellerApiRequest<{ success: true; discount: any }>(`/api/seller/discounts/${discountId}`, { method: "PATCH", token, body: JSON.stringify(body) });
      const updated = mapApiDiscount(response.discount);
      console.log("[Seller Discounts] Update success", { id: updated.id, code: updated.code });
      set((state) => ({ discounts: state.discounts.map((discount) => discount.id === discountId ? updated : discount), isSaving: false, error: null, loadedForSellerId: sellerId }));
      return updated;
    } catch (error) {
      console.error("[Seller Discounts] Update failed", { sellerId, discountId, payload: body, error: describeError(error) });
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to update discount" });
      throw error;
    }
  },

  deleteDiscount: async (discountId) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    if (!token) throw new Error("Seller session not found");

    console.log("[Seller Discounts] Delete start", { sellerId, discountId });
    set({ isSaving: true, error: null });

    try {
      await sellerApiRequest<{ success: true }>(`/api/seller/discounts/${discountId}`, { method: "DELETE", token });
      console.log("[Seller Discounts] Delete success", { discountId });
      set((state) => ({ discounts: state.discounts.filter((discount) => discount.id !== discountId), isSaving: false, error: null, loadedForSellerId: sellerId }));
    } catch (error) {
      console.error("[Seller Discounts] Delete failed", { sellerId, discountId, error: describeError(error) });
      set({ isSaving: false, error: error instanceof Error ? error.message : "Unable to delete discount" });
      throw error;
    }
  },

  resetDiscounts: () => {
    console.log("[Seller Discounts] Reset store state");
    set({ discounts: [], isLoading: false, isSaving: false, error: null, loadedForSellerId: null });
  },

  clearError: () => set({ error: null }),
}));
