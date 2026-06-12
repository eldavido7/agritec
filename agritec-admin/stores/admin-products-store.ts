"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import type { AdminPagination } from "@/stores/admin-sellers-store";

export type AdminProductVariantRecord = {
  id: string;
  title: string;
  price: number;
  inventory: number;
  salesUnit: string;
  packageType: string;
  unitWeightKg: number | null;
  unitLengthCm: number | null;
  unitWidthCm: number | null;
  unitHeightCm: number | null;
};

export type AdminProductRecord = {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  status: string;
  categorySlug: string;
  categoryNote: string | null;
  basePrice: number;
  inventory: number;
  salesUnit: string;
  packageType: string;
  unitWeightKg: number | null;
  unitLengthCm: number | null;
  unitWidthCm: number | null;
  unitHeightCm: number | null;
  images: Array<{
    id?: string;
    url: string;
    altText: string | null;
  }>;
  variants: AdminProductVariantRecord[];
};

type ProductQuery = {
  sellerId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  force?: boolean;
};

type AdminProductsState = {
  products: AdminProductRecord[];
  pagination: AdminPagination;
  activeSellerId: string | null;
  currentSearch: string;
  isLoading: boolean;
  error: string | null;
  loaded: boolean;
  lastQueryKey: string | null;
  fetchProducts: (query: ProductQuery) => Promise<void>;
  clearProducts: () => void;
  clearError: () => void;
};

const defaultPagination: AdminPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

function normalizeVariant(variant: any): AdminProductVariantRecord {
  return {
    id: String(variant.id),
    title: String(variant.title || ""),
    price: Number(variant.price || 0),
    inventory: Number(variant.inventory || 0),
    salesUnit: String(variant.salesUnit || ""),
    packageType: String(variant.packageType || ""),
    unitWeightKg: variant.unitWeightKg == null ? null : Number(variant.unitWeightKg),
    unitLengthCm: variant.unitLengthCm == null ? null : Number(variant.unitLengthCm),
    unitWidthCm: variant.unitWidthCm == null ? null : Number(variant.unitWidthCm),
    unitHeightCm: variant.unitHeightCm == null ? null : Number(variant.unitHeightCm),
  };
}

function normalizeProduct(product: any): AdminProductRecord {
  return {
    id: String(product.id),
    sellerId: String(product.sellerId || product.seller?.id || ""),
    title: String(product.title || ""),
    description: product.description ? String(product.description) : null,
    status: String(product.status || ""),
    categorySlug: String(product.categorySlug || ""),
    categoryNote: product.categoryNote ? String(product.categoryNote) : null,
    basePrice: Number(product.basePrice || 0),
    inventory: Number(product.inventory || 0),
    salesUnit: String(product.salesUnit || ""),
    packageType: String(product.packageType || ""),
    unitWeightKg: product.unitWeightKg == null ? null : Number(product.unitWeightKg),
    unitLengthCm: product.unitLengthCm == null ? null : Number(product.unitLengthCm),
    unitWidthCm: product.unitWidthCm == null ? null : Number(product.unitWidthCm),
    unitHeightCm: product.unitHeightCm == null ? null : Number(product.unitHeightCm),
    images: Array.isArray(product.images)
      ? product.images.map((image: any) => ({
          id: image.id ? String(image.id) : undefined,
          url: String(image.url || ""),
          altText: image.altText ? String(image.altText) : null,
        }))
      : [],
    variants: Array.isArray(product.variants)
      ? product.variants.map(normalizeVariant)
      : [],
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export const useAdminProductsStore = create<AdminProductsState>((set, get) => ({
  products: [],
  pagination: defaultPagination,
  activeSellerId: null,
  currentSearch: "",
  isLoading: false,
  error: null,
  loaded: false,
  lastQueryKey: null,

  fetchProducts: async (query) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      set({
        products: [],
        pagination: defaultPagination,
        activeSellerId: null,
        currentSearch: "",
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
        lastQueryKey: null,
      });
      return;
    }

    const params = new URLSearchParams();
    params.set("sellerId", query.sellerId);
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ?? 10));
    if (query.search?.trim()) params.set("search", query.search.trim());
    const queryKey = params.toString();
    const state = get();

    if (state.isLoading) return;
    if (!query.force && state.loaded && state.lastQueryKey === queryKey) {
      console.log("[Admin Products] Fetch skipped: using cached store state", {
        queryKey,
        count: state.products.length,
      });
      return;
    }

    console.log("[Admin Products] Fetch start", { queryKey });
    set({
      isLoading: true,
      error: null,
      activeSellerId: query.sellerId,
      currentSearch: query.search?.trim() || "",
    });

    try {
      const response = await adminApiRequest<{
        success: true;
        products: any[];
        pagination: AdminPagination;
      }>(`/api/admin/products?${queryKey}`, {
        method: "GET",
        token,
      });

      const products = response.products.map(normalizeProduct);
      console.log("[Admin Products] Fetch success", {
        queryKey,
        count: products.length,
      });

      set({
        products,
        pagination: response.pagination ?? {
          ...defaultPagination,
          total: products.length,
        },
        activeSellerId: query.sellerId,
        currentSearch: query.search?.trim() || "",
        isLoading: false,
        error: null,
        loaded: true,
        lastQueryKey: queryKey,
      });
    } catch (error) {
      console.error("[Admin Products] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load products",
      });
    }
  },

  clearProducts: () =>
    set({
      products: [],
      pagination: defaultPagination,
      activeSellerId: null,
      currentSearch: "",
      isLoading: false,
      error: null,
      loaded: false,
      lastQueryKey: null,
    }),

  clearError: () => set({ error: null }),
}));
