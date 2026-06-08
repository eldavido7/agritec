"use client";

import { create } from "zustand";
import { categorySlugFromLabel, type ProductLogistics } from "@/lib/mock-data";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

type ProductStatus = "Active" | "Inactive" | "Archived";

export type SellerProductVariantRecord = {
  id?: string;
  name: string;
  price: number;
  inventory: number;
  sku?: string;
  logistics?: ProductLogistics;
};

export type SellerProductRecord = ProductLogistics & {
  id: string;
  sellerId?: string;
  name: string;
  description: string;
  category: string;
  categorySlug: string;
  categoryNote?: string | null;
  price: number;
  inventory: number;
  status: ProductStatus;
  images: string[];
  variants?: SellerProductVariantRecord[];
  dateAdded?: Date;
};

type SellerProductsState = {
  products: SellerProductRecord[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (product: Partial<SellerProductRecord>) => Promise<SellerProductRecord>;
  updateProduct: (
    productId: string,
    product: Partial<SellerProductRecord>,
  ) => Promise<SellerProductRecord>;
  archiveProduct: (productId: string) => Promise<void>;
  clearError: () => void;
};

const statusFromApi = (status?: string): ProductStatus => {
  switch ((status || "").toUpperCase()) {
    case "INACTIVE":
      return "Inactive";
    case "ARCHIVED":
      return "Archived";
    default:
      return "Active";
  }
};

const statusToApi = (status?: string) => {
  switch ((status || "").toUpperCase()) {
    case "INACTIVE":
      return "INACTIVE";
    case "ARCHIVED":
      return "ARCHIVED";
    default:
      return "ACTIVE";
  }
};

const labelFromSlug = (slug?: string) => {
  if (!slug) return "Other";
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" & ")
    .replace("Cereals", "Cereals")
    .replace("Seafood", "Seafood");
};

const imageUrlFromValue = (image: unknown): string | null => {
  if (typeof image === "string" && image.trim()) return image.trim();
  if (image && typeof image === "object") {
    const candidate =
      "url" in image && typeof image.url === "string"
        ? image.url
        : "src" in image && typeof image.src === "string"
          ? image.src
          : null;
    return candidate?.trim() || null;
  }
  return null;
};

const normalizeLogistics = (source: {
  salesUnit?: string | null;
  unitWeightKg?: number | null;
  unitLengthCm?: number | null;
  unitWidthCm?: number | null;
  unitHeightCm?: number | null;
  packageType?: string | null;
}): ProductLogistics => ({
  salesUnit: (source.salesUnit || "PIECE") as ProductLogistics["salesUnit"],
  unitWeightKg: Number(source.unitWeightKg || 0),
  unitLengthCm:
    typeof source.unitLengthCm === "number" ? source.unitLengthCm : undefined,
  unitWidthCm:
    typeof source.unitWidthCm === "number" ? source.unitWidthCm : undefined,
  unitHeightCm:
    typeof source.unitHeightCm === "number" ? source.unitHeightCm : undefined,
  packageType: (source.packageType || "PIECE") as ProductLogistics["packageType"],
});

const mapApiProduct = (product: any): SellerProductRecord => ({
  id: String(product.id),
  sellerId: product.sellerId ? String(product.sellerId) : undefined,
  name: product.title,
  description: product.description,
  category:
    product.category?.label ||
    product.categoryLabel ||
    labelFromSlug(product.categorySlug),
  categorySlug: product.categorySlug,
  categoryNote: product.categoryNote ?? null,
  price: Number(product.basePrice || 0),
  inventory: Number(product.inventory || 0),
  status: statusFromApi(product.status),
  images: Array.isArray(product.images)
    ? product.images
        .map(imageUrlFromValue)
        .filter((value): value is string => Boolean(value))
    : [],
  variants: Array.isArray(product.variants)
    ? product.variants.map((variant: any) => ({
        id: variant.id ? String(variant.id) : undefined,
        name: variant.name,
        price: Number(variant.price || 0),
        inventory: Number(variant.inventory || 0),
        sku: variant.sku ?? undefined,
        logistics:
          variant.unitWeightKg != null
            ? normalizeLogistics(variant)
            : undefined,
      }))
    : undefined,
  dateAdded: product.createdAt ? new Date(product.createdAt) : undefined,
  ...normalizeLogistics(product),
});

const buildVariantPayload = (
  product: Partial<SellerProductRecord>,
  variant: SellerProductVariantRecord,
) => ({
  ...(variant.id ? { id: String(variant.id) } : {}),
  name: variant.name,
  price: Math.round(Number(variant.price || 0)),
  inventory: Math.max(0, Math.round(Number(variant.inventory || 0))),
  sku: variant.sku?.trim() || null,
  salesUnit: variant.logistics?.salesUnit || product.salesUnit || null,
  packageType: variant.logistics?.packageType || product.packageType || null,
  unitWeightKg:
    variant.logistics?.unitWeightKg ?? product.unitWeightKg ?? null,
  unitLengthCm:
    variant.logistics?.unitLengthCm ?? product.unitLengthCm ?? null,
  unitWidthCm:
    variant.logistics?.unitWidthCm ?? product.unitWidthCm ?? null,
  unitHeightCm:
    variant.logistics?.unitHeightCm ?? product.unitHeightCm ?? null,
});

const buildProductPayload = (product: Partial<SellerProductRecord>) => {
  const category =
    product.categorySlug ||
    (product.category ? categorySlugFromLabel(product.category) : "other");

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const basePrice = hasVariants
    ? Math.min(...variants.map((variant) => Math.round(Number(variant.price || 0))))
    : Math.round(Number(product.price || 0));
  const inventory = hasVariants
    ? variants.reduce(
        (sum, variant) => sum + Math.max(0, Math.round(Number(variant.inventory || 0))),
        0,
      )
    : Math.max(0, Math.round(Number(product.inventory || 0)));

  return {
    title: product.name?.trim() || "",
    description: product.description?.trim() || product.name?.trim() || "",
    status: statusToApi(product.status),
    categorySlug: category,
    categoryNote: category === "other" ? product.categoryNote?.trim() || null : null,
    basePrice,
    inventory,
    images: (product.images || [])
      .map((url, index) => ({
        url,
        altText: `${product.name || "Product"} image ${index + 1}`,
      }))
      .filter((image) => image.url?.trim()),
    salesUnit: product.salesUnit || "PIECE",
    packageType: product.packageType || "PIECE",
    unitWeightKg: Number(product.unitWeightKg || 0),
    unitLengthCm: product.unitLengthCm ?? null,
    unitWidthCm: product.unitWidthCm ?? null,
    unitHeightCm: product.unitHeightCm ?? null,
    variants: variants.map((variant) => buildVariantPayload(product, variant)),
  };
};

export const useSellerProductsStore = create<SellerProductsState>((set, get) => ({
  products: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchProducts: async () => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      set({ products: [], error: "Seller session not found", isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        products: any[];
      }>("/api/seller/products", {
        method: "GET",
        token,
      });

      set({
        products: response.products.map(mapApiProduct),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load products",
      });
    }
  },

  createProduct: async (product) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      throw new Error("Seller session not found");
    }

    set({ isSaving: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        product: any;
      }>("/api/seller/products", {
        method: "POST",
        token,
        body: JSON.stringify(buildProductPayload(product)),
      });

      const created = mapApiProduct(response.product);
      set((state) => ({
        products: [created, ...state.products],
        isSaving: false,
        error: null,
      }));
      return created;
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "Unable to create product",
      });
      throw error;
    }
  },

  updateProduct: async (productId, product) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      throw new Error("Seller session not found");
    }

    set({ isSaving: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        product: any;
      }>(`/api/seller/products/${productId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(buildProductPayload(product)),
      });

      const updated = mapApiProduct(response.product);
      set((state) => ({
        products: state.products.map((item) =>
          item.id === productId ? updated : item,
        ),
        isSaving: false,
        error: null,
      }));
      return updated;
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "Unable to update product",
      });
      throw error;
    }
  },

  archiveProduct: async (productId) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      throw new Error("Seller session not found");
    }

    set({ isSaving: true, error: null });

    try {
      await sellerApiRequest<{ success: true; product: any }>(
        `/api/seller/products/${productId}`,
        {
          method: "DELETE",
          token,
        },
      );

      set((state) => ({
        products: state.products.filter((item) => item.id !== productId),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "Unable to archive product",
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
