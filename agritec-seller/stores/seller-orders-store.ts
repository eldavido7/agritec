"use client";

import { create } from "zustand";
import { sellerApiRequest } from "@/lib/seller-api";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export type SellerOrderGroupItemRecord = {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  productTitleSnapshot: string;
  variantTitleSnapshot?: string | null;
  productImageSnapshot?: string | null;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
  discountAmountSnapshot?: number | null;
  salesUnitSnapshot?: string | null;
};

export type SellerParentOrderSnapshot = {
  id: string;
  buyerId?: string | null;
  buyerNameSnapshot?: string | null;
  buyerEmailSnapshot?: string | null;
  buyerPhoneSnapshot?: string | null;
  status?: string;
  paymentReference?: string | null;
  productSubtotal: number;
  totalShippingFee: number;
  discountTotal: number;
  grandTotal: number;
  createdAt?: Date;
  updatedAt?: Date;
  addressSnapshot?: {
    id?: string;
    addressLine?: string | null;
    city?: string | null;
    state?: string | null;
    landmark?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isManualAddress?: boolean | null;
    isAdminAssisted?: boolean | null;
  } | null;
  payment?: {
    id?: string;
    status?: string;
    reference?: string | null;
    amount?: number;
    provider?: string | null;
    paidAt?: Date | null;
  } | null;
};

export type SellerOrderGroupRecord = {
  id: string;
  sellerId: string;
  sellerName?: string | null;
  farmNameSnapshot?: string | null;
  parentOrderId: string;
  status: string;
  productSubtotal: number;
  shippingFee: number;
  discountTotal: number;
  groupTotal: number;
  deliveryRegion?: string | null;
  weightUnitSizeKg?: number | null;
  shippingUnits?: number | null;
  minimumFee?: number | null;
  additionalUnitFee?: number | null;
  totalChargeableWeightKg?: number | null;
  commissionRateBpsSnapshot?: number | null;
  platformCommissionAmount?: number | null;
  sellerEarningsAmount?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  items: SellerOrderGroupItemRecord[];
  parentOrder: SellerParentOrderSnapshot;
};

type SellerOrdersState = {
  orderGroups: SellerOrderGroupRecord[];
  selectedOrderGroup: SellerOrderGroupRecord | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  loadedForSellerId: string | null;
  fetchOrderGroups: (options?: { force?: boolean }) => Promise<void>;
  fetchOrderGroupById: (orderGroupId: string) => Promise<SellerOrderGroupRecord>;
  clearSelectedOrderGroup: () => void;
  resetOrders: () => void;
  clearError: () => void;
};

const toNumber = (value: unknown) => {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapOrderGroup = (group: any): SellerOrderGroupRecord => ({
  id: String(group.id),
  sellerId: String(group.sellerId),
  sellerName: group.seller?.farmName || group.seller?.user?.fullName || null,
  farmNameSnapshot: group.farmNameSnapshot ? String(group.farmNameSnapshot) : null,
  parentOrderId: String(group.parentOrderId),
  status: String(group.status || "PENDING"),
  productSubtotal: toNumber(group.productSubtotal),
  shippingFee: toNumber(group.shippingFee),
  discountTotal: toNumber(group.discountTotal),
  groupTotal: toNumber(group.groupTotal),
  deliveryRegion: group.deliveryRegion ? String(group.deliveryRegion) : null,
  weightUnitSizeKg:
    group.weightUnitSizeKg == null ? null : toNumber(group.weightUnitSizeKg),
  shippingUnits: group.shippingUnits == null ? null : toNumber(group.shippingUnits),
  minimumFee: group.minimumFee == null ? null : toNumber(group.minimumFee),
  additionalUnitFee:
    group.additionalUnitFee == null ? null : toNumber(group.additionalUnitFee),
  totalChargeableWeightKg:
    group.totalChargeableWeightKg == null
      ? null
      : Number(group.totalChargeableWeightKg),
  commissionRateBpsSnapshot:
    group.commissionRateBpsSnapshot == null
      ? null
      : toNumber(group.commissionRateBpsSnapshot),
  platformCommissionAmount:
    group.platformCommissionAmount == null
      ? null
      : toNumber(group.platformCommissionAmount),
  sellerEarningsAmount:
    group.sellerEarningsAmount == null
      ? null
      : toNumber(group.sellerEarningsAmount),
  createdAt: group.createdAt ? new Date(group.createdAt) : undefined,
  updatedAt: group.updatedAt ? new Date(group.updatedAt) : undefined,
  items: Array.isArray(group.items)
    ? group.items.map((item: any) => ({
        id: String(item.id),
        productId: item.productId ? String(item.productId) : null,
        variantId: item.variantId ? String(item.variantId) : null,
        productTitleSnapshot: String(item.productTitleSnapshot || item.productNameSnapshot || ""),
        variantTitleSnapshot: item.variantTitleSnapshot ? String(item.variantTitleSnapshot) : null,
        productImageSnapshot: item.productImageSnapshot ? String(item.productImageSnapshot) : null,
        unitPriceSnapshot: toNumber(item.unitPriceSnapshot),
        quantity: toNumber(item.quantity),
        lineTotal: toNumber(item.lineTotal),
        discountAmountSnapshot:
          item.discountAmountSnapshot == null
            ? null
            : toNumber(item.discountAmountSnapshot),
        salesUnitSnapshot: item.salesUnitSnapshot ? String(item.salesUnitSnapshot) : null,
      }))
    : [],
  parentOrder: {
    id: String(group.parentOrder?.id || group.parentOrderId),
    buyerId: group.parentOrder?.buyerId ? String(group.parentOrder.buyerId) : null,
    buyerNameSnapshot: group.parentOrder?.buyerNameSnapshot
      ? String(group.parentOrder.buyerNameSnapshot)
      : null,
    buyerEmailSnapshot: group.parentOrder?.buyerEmailSnapshot
      ? String(group.parentOrder.buyerEmailSnapshot)
      : null,
    buyerPhoneSnapshot: group.parentOrder?.buyerPhoneSnapshot
      ? String(group.parentOrder.buyerPhoneSnapshot)
      : null,
    status: group.parentOrder?.status ? String(group.parentOrder.status) : undefined,
    paymentReference: group.parentOrder?.paymentReference ? String(group.parentOrder.paymentReference) : null,
    productSubtotal: toNumber(group.parentOrder?.productSubtotal),
    totalShippingFee: toNumber(group.parentOrder?.totalShippingFee),
    discountTotal: toNumber(group.parentOrder?.discountTotal),
    grandTotal: toNumber(group.parentOrder?.grandTotal),
    createdAt: group.parentOrder?.createdAt ? new Date(group.parentOrder.createdAt) : undefined,
    updatedAt: group.parentOrder?.updatedAt ? new Date(group.parentOrder.updatedAt) : undefined,
    addressSnapshot: group.parentOrder?.addressSnapshot
      ? {
          id: group.parentOrder.addressSnapshot.id ? String(group.parentOrder.addressSnapshot.id) : undefined,
          addressLine: group.parentOrder.addressSnapshot.addressLine ?? null,
          city: group.parentOrder.addressSnapshot.city ?? null,
          state: group.parentOrder.addressSnapshot.state ?? null,
          landmark: group.parentOrder.addressSnapshot.landmark ?? null,
          latitude:
            group.parentOrder.addressSnapshot.latitude == null
              ? null
              : Number(group.parentOrder.addressSnapshot.latitude),
          longitude:
            group.parentOrder.addressSnapshot.longitude == null
              ? null
              : Number(group.parentOrder.addressSnapshot.longitude),
          isManualAddress: group.parentOrder.addressSnapshot.isManualAddress ?? null,
          isAdminAssisted: group.parentOrder.addressSnapshot.isAdminAssisted ?? null,
        }
      : null,
    payment: group.parentOrder?.payment
      ? {
          id: group.parentOrder.payment.id ? String(group.parentOrder.payment.id) : undefined,
          status: group.parentOrder.payment.status ? String(group.parentOrder.payment.status) : undefined,
          reference: group.parentOrder.payment.reference ? String(group.parentOrder.payment.reference) : null,
          amount: toNumber(group.parentOrder.payment.amount),
          provider: group.parentOrder.payment.provider ? String(group.parentOrder.payment.provider) : null,
          paidAt: group.parentOrder.payment.paidAt ? new Date(group.parentOrder.payment.paidAt) : null,
        }
      : null,
  },
});

const describeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
};

export const useSellerOrdersStore = create<SellerOrdersState>((set, get) => ({
  orderGroups: [],
  selectedOrderGroup: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  loadedForSellerId: null,

  fetchOrderGroups: async (options) => {
    const token = useSellerAuthStore.getState().token;
    const sellerId = useSellerAuthStore.getState().user?.sellerProfile?.id || null;
    const state = get();
    const force = options?.force === true;

    if (!token || !sellerId) {
      console.warn("[Seller Orders] Fetch skipped: seller session not found");
      set({ orderGroups: [], error: "Seller session not found", isLoading: false, loadedForSellerId: null });
      return;
    }

    if (state.isLoading) {
      console.log("[Seller Orders] Fetch skipped: request already in progress", { sellerId });
      return;
    }

    if (!force && state.loadedForSellerId === sellerId) {
      console.log("[Seller Orders] Fetch skipped: using cached store state", { sellerId, count: state.orderGroups.length });
      return;
    }

    console.log("[Seller Orders] Fetch start", { sellerId, force });
    set({ isLoading: true, error: null });

    try {
      const response = await sellerApiRequest<{ success: true; sellerOrderGroups: any[] }>("/api/seller/order-groups", { method: "GET", token });
      const orderGroups = response.sellerOrderGroups.map(mapOrderGroup);
      console.log("[Seller Orders] Fetch success", { sellerId, count: orderGroups.length, orderGroupIds: orderGroups.map((group) => group.id) });
      set({ orderGroups, isLoading: false, error: null, loadedForSellerId: sellerId });
    } catch (error) {
      console.error("[Seller Orders] Fetch failed", describeError(error));
      set({ isLoading: false, error: error instanceof Error ? error.message : "Unable to load orders" });
    }
  },

  fetchOrderGroupById: async (orderGroupId) => {
    const token = useSellerAuthStore.getState().token;
    if (!token) throw new Error("Seller session not found");

    console.log("[Seller Orders] Detail fetch start", { orderGroupId });
    set({ isLoadingDetail: true, error: null });

    try {
      const response = await sellerApiRequest<{ success: true; sellerOrderGroup: any }>(`/api/seller/order-groups/${orderGroupId}`, { method: "GET", token });
      const orderGroup = mapOrderGroup(response.sellerOrderGroup);
      console.log("[Seller Orders] Detail fetch success", { orderGroupId });
      set((state) => ({
        selectedOrderGroup: orderGroup,
        orderGroups: state.orderGroups.some((group) => group.id === orderGroup.id)
          ? state.orderGroups.map((group) => (group.id === orderGroup.id ? orderGroup : group))
          : [orderGroup, ...state.orderGroups],
        isLoadingDetail: false,
        error: null,
      }));
      return orderGroup;
    } catch (error) {
      console.error("[Seller Orders] Detail fetch failed", { orderGroupId, error: describeError(error) });
      set({ isLoadingDetail: false, error: error instanceof Error ? error.message : "Unable to load order details" });
      throw error;
    }
  },

  clearSelectedOrderGroup: () => set({ selectedOrderGroup: null }),

  resetOrders: () => {
    console.log("[Seller Orders] Reset store state");
    set({ orderGroups: [], selectedOrderGroup: null, isLoading: false, isLoadingDetail: false, error: null, loadedForSellerId: null });
  },

  clearError: () => set({ error: null }),
}));
