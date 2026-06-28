"use client";

import { create } from "zustand";
import { categorySlugFromLabel, type ProductLogistics } from "@/lib/mock-data";
import { sellerApiRequest, sellerUploadRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

type ProductStatus = "Active" | "Inactive" | "Archived";

export type SellerProductImageRecord = {
  secureUrl: string;
  publicId?: string | null;
  altText?: string | null;
  displayOrder?: number;
};

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
  description: string | null;
  category: string;
  categorySlug: string;
  categoryNote?: string | null;
  price: number;
  inventory: number;
  status: ProductStatus;
  images: SellerProductImageRecord[];
  variants?: SellerProductVariantRecord[];
  dateAdded?: Date;
};

type SellerProductsState = {
  products: SellerProductRecord[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadedForSellerId: string | null;
  fetchProducts: (options?: { force?: boolean }) => Promise<void>;
  createProduct: (
    product: Partial<SellerProductRecord>,
  ) => Promise<SellerProductRecord>;
  updateProduct: (
    productId: string,
    product: Partial<SellerProductRecord>,
  ) => Promise<SellerProductRecord>;
  archiveProduct: (productId: string) => Promise<void>;
  uploadProductImage: (file: File, displayOrder?: number) => Promise<SellerProductImageRecord>;
  resetProducts: () => void;
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

const imageRecordFromValue = (image: unknown, index = 0): SellerProductImageRecord | null => {
  if (typeof image === "string" && image.trim()) {
    return {
      secureUrl: image.trim(),
      publicId: null,
      altText: null,
      displayOrder: index,
    };
  }

  if (image && typeof image === "object") {
    const secureUrl =
      "secureUrl" in image && typeof image.secureUrl === "string"
        ? image.secureUrl.trim()
        : "url" in image && typeof image.url === "string"
          ? image.url.trim()
          : "src" in image && typeof image.src === "string"
            ? image.src.trim()
            : "";

    if (!secureUrl) return null;

    return {
      secureUrl,
      publicId:
        "publicId" in image && typeof image.publicId === "string" && image.publicId.trim()
          ? image.publicId.trim()
          : null,
      altText:
        "altText" in image && typeof image.altText === "string" && image.altText.trim()
          ? image.altText.trim()
          : null,
      displayOrder:
        "displayOrder" in image && typeof image.displayOrder === "number"
          ? image.displayOrder
          : index,
    };
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
  description:
    typeof product.description === "string" && product.description.trim()
      ? product.description.trim()
      : null,
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
        .map((image: unknown, index: number) => imageRecordFromValue(image, index))
        .filter((value: SellerProductImageRecord | null): value is SellerProductImageRecord => Boolean(value))
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
    ? Math.min(
        ...variants.map((variant) => Math.round(Number(variant.price || 0))),
      )
    : Math.round(Number(product.price || 0));
  const inventory = hasVariants
    ? variants.reduce(
        (sum, variant) =>
          sum + Math.max(0, Math.round(Number(variant.inventory || 0))),
        0,
      )
    : Math.max(0, Math.round(Number(product.inventory || 0)));

  return {
    title: product.name?.trim() || "",
    description: product.description?.trim() || null,
    status: statusToApi(product.status),
    categorySlug: category,
    categoryNote:
      category === "other" ? product.categoryNote?.trim() || null : null,
    basePrice,
    inventory,
    images: (product.images || [])
      .map((image, index) => imageRecordFromValue(image, index))
      .filter((image): image is SellerProductImageRecord => Boolean(image))
      .map((image, index) => ({
        secureUrl: image.secureUrl,
        publicId: image.publicId ?? null,
        altText: image.altText ?? `${product.name || "Product"} image ${index + 1}`,
        displayOrder: image.displayOrder ?? index,
      })),
    salesUnit: product.salesUnit || "PIECE",
    packageType: product.packageType || "PIECE",
    unitWeightKg: Number(product.unitWeightKg || 0),
    unitLengthCm: product.unitLengthCm ?? null,
    unitWidthCm: product.unitWidthCm ?? null,
    unitHeightCm: product.unitHeightCm ?? null,
    variants: variants.map((variant) => buildVariantPayload(product, variant)),
  };
};

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

export const useSellerProductsStore = create<SellerProductsState>((set, get) => ({
  products: [],
  isLoading: false,
  isSaving: false,
  error: null,
  loadedForSellerId: null,

  fetchProducts: async (options) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    const state = get();
    const force = options?.force === true;

    if (!token || !sellerId) {
      console.warn("[Seller Products] Fetch skipped: seller session not found");
      set({
        products: [],
        error: "Seller session not found",
        isLoading: false,
        loadedForSellerId: null,
      });
      return;
    }

    if (state.isLoading) {
      console.log("[Seller Products] Fetch skipped: request already in progress", {
        sellerId,
      });
      return;
    }

    if (!force && state.loadedForSellerId === sellerId) {
      console.log("[Seller Products] Fetch skipped: using cached store state", {
        sellerId,
        count: state.products.length,
      });
      return;
    }

    console.log("[Seller Products] Fetch start", {
      sellerId,
      force,
    });
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{
        success: true;
        products: any[];
      }>("/api/seller/products", {
        method: "GET",
        token,
      });

      const products = response.products.map(mapApiProduct);
      console.log("[Seller Products] Fetch success", {
        sellerId,
        count: products.length,
        productIds: products.map((product) => product.id),
      });

      set({
        products,
        isLoading: false,
        error: null,
        loadedForSellerId: sellerId,
      });
    } catch (error) {
      console.error("[Seller Products] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unable to load products",
      });
    }
  },

  createProduct: async (product) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    if (!token) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Products] Create start", {
      sellerId,
      name: product.name,
      categorySlug: product.categorySlug,
      hasVariants: Boolean(product.variants?.length),
    });
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
      console.log("[Seller Products] Create success", {
        id: created.id,
        name: created.name,
      });

      set((state) => ({
        products: [created, ...state.products],
        isSaving: false,
        error: null,
        loadedForSellerId: sellerId,
      }));
      return created;
    } catch (error) {
      console.error("[Seller Products] Create failed", {
        sellerId,
        payload: buildProductPayload(product),
        error: describeError(error),
      });
      set({
        isSaving: false,
        error:
          error instanceof Error ? error.message : "Unable to create product",
      });
      throw error;
    }
  },

  updateProduct: async (productId, product) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    if (!token) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Products] Update start", {
      sellerId,
      productId,
      name: product.name,
    });
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
      console.log("[Seller Products] Update success", {
        id: updated.id,
        name: updated.name,
      });

      set((state) => ({
        products: state.products.map((item) =>
          item.id === productId ? updated : item,
        ),
        isSaving: false,
        error: null,
        loadedForSellerId: sellerId,
      }));
      return updated;
    } catch (error) {
      console.error("[Seller Products] Update failed", {
        sellerId,
        productId,
        payload: buildProductPayload(product),
        error: describeError(error),
      });
      set({
        isSaving: false,
        error:
          error instanceof Error ? error.message : "Unable to update product",
      });
      throw error;
    }
  },

  uploadProductImage: async (file, displayOrder = 0) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) {
      throw new Error("Seller session not found");
    }

    const response = await sellerUploadRequest(file, "product", token);
    console.log("[Seller Products] Upload image success", {
      secureUrl: response.asset.secureUrl,
      publicId: response.asset.publicId,
      displayOrder,
    });

    return {
      secureUrl: response.asset.secureUrl,
      publicId: response.asset.publicId,
      altText: file.name,
      displayOrder,
    };
  },

  archiveProduct: async (productId) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    if (!token) {
      throw new Error("Seller session not found");
    }

    console.log("[Seller Products] Archive start", { sellerId, productId });
    set({ isSaving: true, error: null });

    try {
      await sellerApiRequest<{ success: true; product: any }>(
        `/api/seller/products/${productId}`,
        {
          method: "DELETE",
          token,
        },
      );

      console.log("[Seller Products] Archive success", { productId });
      set((state) => ({
        products: state.products.filter((item) => item.id !== productId),
        isSaving: false,
        error: null,
        loadedForSellerId: sellerId,
      }));
    } catch (error) {
      console.error("[Seller Products] Archive failed", {
        sellerId,
        productId,
        error: describeError(error),
      });
      set({
        isSaving: false,
        error:
          error instanceof Error ? error.message : "Unable to delete product",
      });
      throw error;
    }
  },

  resetProducts: () => {
    console.log("[Seller Products] Reset store state");
    set({
      products: [],
      isLoading: false,
      isSaving: false,
      error: null,
      loadedForSellerId: null,
    });
  },

  clearError: () => set({ error: null }),
}));
