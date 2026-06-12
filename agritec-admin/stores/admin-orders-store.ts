"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import type { AdminPagination } from "@/stores/admin-sellers-store";

export type AdminOrderItemRecord = {
  id: string;
  productId: string | null;
  variantId: string | null;
  sellerId: string;
  sellerNameSnapshot: string;
  farmNameSnapshot: string;
  productTitleSnapshot: string;
  productImageUrlSnapshot: string | null;
  variantTitleSnapshot: string | null;
  salesUnitSnapshot: string;
  packageTypeSnapshot: string;
  unitWeightKgSnapshot: number | null;
  unitLengthCmSnapshot: number | null;
  unitWidthCmSnapshot: number | null;
  unitHeightCmSnapshot: number | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  lineDiscountTotal: number;
  lineTotal: number;
};

export type AdminSellerOrderGroupRecord = {
  id: string;
  parentOrderId: string;
  sellerId: string;
  status: string;
  sellerNameSnapshot: string;
  farmNameSnapshot: string;
  productSubtotal: number;
  shippingFee: number;
  discountTotal: number;
  groupTotal: number;
  platformCommissionAmount: number;
  sellerEarningsAmount: number;
  deliveryRegion: string;
  totalChargeableWeightKg: number | null;
  shippingUnits: number;
  locationRate: number;
  discountCodeSnapshot: string | null;
  discountTypeSnapshot: string | null;
  discountValueSnapshot: number | null;
  discountDescriptionSnapshot: string | null;
  items: AdminOrderItemRecord[];
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderRecord = {
  id: string;
  buyerId: string;
  status: string;
  paymentStatus: string;
  buyerNameSnapshot: string;
  buyerEmailSnapshot: string;
  buyerPhoneSnapshot: string;
  productSubtotal: number;
  totalShippingFee: number;
  discountTotal: number;
  grandTotal: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  addressSnapshot: {
    displayName: string | null;
    addressLine: string;
    fullAddress: string;
    city: string;
    state: string;
    landmark: string | null;
    latitude: number | null;
    longitude: number | null;
    isManualAddress: boolean;
    isAdminAssisted: boolean;
  } | null;
  payment: {
    id: string;
    provider: string;
    reference: string;
    accessCode: string | null;
    authorizationUrl: string | null;
    amount: number;
    currencyCode: string;
    status: string;
    verifiedAt: string | null;
    paidAt: string | null;
  } | null;
  sellerGroups: AdminSellerOrderGroupRecord[];
};

export type AdminOrderDetailRecord = AdminOrderRecord & {
  buyer: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    lastActiveAt: string | null;
  } | null;
};

export type AdminAssistedOrderPaymentRecord = {
  id: string;
  provider: string;
  status: string;
  reference: string;
  accessCode: string | null;
  authorizationUrl: string | null;
  amount: number;
  amountInSubunit: number;
  currencyCode: string;
};

export type AdminAssistedOrderLinePayload = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type AdminAssistedOrderAddressPayload =
  | {
      addressId: string;
      manualAddress?: never;
    }
  | {
      addressId?: never;
      manualAddress: {
        displayName?: string | null;
        addressLine: string;
        fullAddress: string;
        city: string;
        state: string;
        landmark?: string | null;
        saveToBuyerProfile?: boolean;
      };
    };

type AdminOrdersState = {
  orders: AdminOrderRecord[];
  selectedOrderDetail: AdminOrderDetailRecord | null;
  pagination: AdminPagination;
  isLoading: boolean;
  isDetailLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loaded: boolean;
  fetchOrders: (options?: { force?: boolean }) => Promise<void>;
  fetchOrderDetail: (orderId: string, options?: { force?: boolean }) => Promise<AdminOrderDetailRecord>;
  updateSellerGroupStatus: (groupId: string, status: string) => Promise<void>;
  initializeAssistedOrder: (payload: {
    buyerId: string;
    items: AdminAssistedOrderLinePayload[];
    discountCodes?: Record<string, string>;
    callbackUrl?: string;
    channels?: string[];
  } & AdminAssistedOrderAddressPayload) => Promise<{
    order: AdminOrderRecord;
    payment: AdminAssistedOrderPaymentRecord;
  }>;
  clearSelectedOrderDetail: () => void;
  resetOrders: () => void;
  clearError: () => void;
};

const defaultPagination: AdminPagination = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
};

function normalizeOrderItem(item: any): AdminOrderItemRecord {
  return {
    id: String(item.id),
    productId: item.productId ? String(item.productId) : null,
    variantId: item.variantId ? String(item.variantId) : null,
    sellerId: String(item.sellerId || ""),
    sellerNameSnapshot: String(item.sellerNameSnapshot || ""),
    farmNameSnapshot: String(item.farmNameSnapshot || ""),
    productTitleSnapshot: String(item.productTitleSnapshot || ""),
    productImageUrlSnapshot: item.productImageUrlSnapshot ? String(item.productImageUrlSnapshot) : null,
    variantTitleSnapshot: item.variantTitleSnapshot ? String(item.variantTitleSnapshot) : null,
    salesUnitSnapshot: String(item.salesUnitSnapshot || ""),
    packageTypeSnapshot: String(item.packageTypeSnapshot || ""),
    unitWeightKgSnapshot: item.unitWeightKgSnapshot == null ? null : Number(item.unitWeightKgSnapshot),
    unitLengthCmSnapshot: item.unitLengthCmSnapshot == null ? null : Number(item.unitLengthCmSnapshot),
    unitWidthCmSnapshot: item.unitWidthCmSnapshot == null ? null : Number(item.unitWidthCmSnapshot),
    unitHeightCmSnapshot: item.unitHeightCmSnapshot == null ? null : Number(item.unitHeightCmSnapshot),
    unitPrice: Number(item.unitPrice || 0),
    quantity: Number(item.quantity || 0),
    lineSubtotal: Number(item.lineSubtotal || 0),
    lineDiscountTotal: Number(item.lineDiscountTotal || 0),
    lineTotal: Number(item.lineTotal || 0),
  };
}

function normalizeSellerGroup(group: any): AdminSellerOrderGroupRecord {
  return {
    id: String(group.id),
    parentOrderId: String(group.parentOrderId || ""),
    sellerId: String(group.sellerId || ""),
    status: String(group.status || ""),
    sellerNameSnapshot: String(group.sellerNameSnapshot || ""),
    farmNameSnapshot: String(group.farmNameSnapshot || ""),
    productSubtotal: Number(group.productSubtotal || 0),
    shippingFee: Number(group.shippingFee || 0),
    discountTotal: Number(group.discountTotal || 0),
    groupTotal: Number(group.groupTotal || 0),
    platformCommissionAmount: Number(group.platformCommissionAmount || 0),
    sellerEarningsAmount: Number(group.sellerEarningsAmount || 0),
    deliveryRegion: String(group.deliveryRegion || ""),
    totalChargeableWeightKg: group.totalChargeableWeightKg == null ? null : Number(group.totalChargeableWeightKg),
    shippingUnits: Number(group.shippingUnits || 0),
    locationRate: Number(group.locationRate || 0),
    discountCodeSnapshot: group.discountCodeSnapshot ? String(group.discountCodeSnapshot) : null,
    discountTypeSnapshot: group.discountTypeSnapshot ? String(group.discountTypeSnapshot) : null,
    discountValueSnapshot: group.discountValueSnapshot == null ? null : Number(group.discountValueSnapshot),
    discountDescriptionSnapshot: group.discountDescriptionSnapshot ? String(group.discountDescriptionSnapshot) : null,
    items: Array.isArray(group.items) ? group.items.map(normalizeOrderItem) : [],
    createdAt: String(group.createdAt || ""),
    updatedAt: String(group.updatedAt || ""),
  };
}

function normalizeOrder(order: any): AdminOrderRecord {
  return {
    id: String(order.id),
    buyerId: String(order.buyerId || ""),
    status: String(order.status || ""),
    paymentStatus: String(order.paymentStatus || ""),
    buyerNameSnapshot: String(order.buyerNameSnapshot || ""),
    buyerEmailSnapshot: String(order.buyerEmailSnapshot || ""),
    buyerPhoneSnapshot: String(order.buyerPhoneSnapshot || ""),
    productSubtotal: Number(order.productSubtotal || 0),
    totalShippingFee: Number(order.totalShippingFee || 0),
    discountTotal: Number(order.discountTotal || 0),
    grandTotal: Number(order.grandTotal || 0),
    currencyCode: String(order.currencyCode || "NGN"),
    createdAt: String(order.createdAt || ""),
    updatedAt: String(order.updatedAt || ""),
    paidAt: order.paidAt ? String(order.paidAt) : null,
    cancelledAt: order.cancelledAt ? String(order.cancelledAt) : null,
    addressSnapshot: order.addressSnapshot
      ? {
          displayName: order.addressSnapshot.displayName ? String(order.addressSnapshot.displayName) : null,
          addressLine: String(order.addressSnapshot.addressLine || ""),
          fullAddress: String(order.addressSnapshot.fullAddress || ""),
          city: String(order.addressSnapshot.city || ""),
          state: String(order.addressSnapshot.state || ""),
          landmark: order.addressSnapshot.landmark ? String(order.addressSnapshot.landmark) : null,
          latitude: order.addressSnapshot.latitude == null ? null : Number(order.addressSnapshot.latitude),
          longitude: order.addressSnapshot.longitude == null ? null : Number(order.addressSnapshot.longitude),
          isManualAddress: Boolean(order.addressSnapshot.isManualAddress),
          isAdminAssisted: Boolean(order.addressSnapshot.isAdminAssisted),
        }
      : null,
    payment: order.payment
      ? {
          id: String(order.payment.id),
          provider: String(order.payment.provider || ""),
          reference: String(order.payment.reference || ""),
          accessCode: order.payment.accessCode ? String(order.payment.accessCode) : null,
          authorizationUrl: order.payment.authorizationUrl ? String(order.payment.authorizationUrl) : null,
          amount: Number(order.payment.amount || 0),
          currencyCode: String(order.payment.currencyCode || "NGN"),
          status: String(order.payment.status || ""),
          verifiedAt: order.payment.verifiedAt ? String(order.payment.verifiedAt) : null,
          paidAt: order.payment.paidAt ? String(order.payment.paidAt) : null,
        }
      : null,
    sellerGroups: Array.isArray(order.sellerGroups)
      ? order.sellerGroups.map(normalizeSellerGroup)
      : [],
  };
}

function normalizeOrderDetail(order: any, buyer: any): AdminOrderDetailRecord {
  return {
    ...normalizeOrder(order),
    buyer: buyer
      ? {
          id: String(buyer.id),
          userId: String(buyer.userId),
          fullName: String(buyer.fullName || ""),
          email: String(buyer.email || ""),
          phone: buyer.phone ? String(buyer.phone) : null,
          isActive: Boolean(buyer.isActive),
          lastActiveAt: buyer.lastActiveAt ? String(buyer.lastActiveAt) : null,
        }
      : null,
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

export const useAdminOrdersStore = create<AdminOrdersState>((set, get) => ({
  orders: [],
  selectedOrderDetail: null,
  pagination: defaultPagination,
  isLoading: false,
  isDetailLoading: false,
  isUpdating: false,
  error: null,
  loaded: false,

  fetchOrders: async (options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      set({
        orders: [],
        selectedOrderDetail: null,
        pagination: defaultPagination,
        isLoading: false,
        error: "Admin session not found",
        loaded: false,
      });
      return;
    }

    if (state.isLoading) return;
    if (!force && state.loaded) {
      console.log("[Admin Orders] Fetch skipped: using cached store state", {
        count: state.orders.length,
      });
      return;
    }

    console.log("[Admin Orders] Fetch start", { force });
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        orders: any[];
        pagination: AdminPagination;
      }>("/api/admin/orders?page=1&pageSize=50", {
        method: "GET",
        token,
      });

      const orders = response.orders.map(normalizeOrder);
      console.log("[Admin Orders] Fetch success", {
        count: orders.length,
        orderIds: orders.map((order) => order.id),
      });

      set({
        orders,
        pagination: response.pagination ?? { ...defaultPagination, total: orders.length },
        isLoading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error("[Admin Orders] Fetch failed", describeError(error));
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load orders",
      });
    }
  },

  fetchOrderDetail: async (orderId, options) => {
    const token = useAdminAuthStore.getState().token;
    const force = options?.force === true;
    const state = get();

    if (!token) {
      throw new Error("Admin session not found");
    }

    if (
      !force &&
      state.selectedOrderDetail &&
      state.selectedOrderDetail.id === orderId
    ) {
      console.log("[Admin Orders] Detail fetch skipped: using cached detail", {
        orderId,
      });
      return state.selectedOrderDetail;
    }

    console.log("[Admin Orders] Detail fetch start", { orderId, force });
    set({ isDetailLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        order: any;
        buyer: any;
      }>(`/api/admin/orders/${orderId}`, {
        method: "GET",
        token,
      });

      const detail = normalizeOrderDetail(response.order, response.buyer);
      console.log("[Admin Orders] Detail fetch success", {
        orderId,
        sellerGroupCount: detail.sellerGroups.length,
      });

      set((state) => ({
        selectedOrderDetail: detail,
        orders: state.orders.map((order) =>
          order.id === orderId ? normalizeOrder(detail) : order,
        ),
        isDetailLoading: false,
        error: null,
        loaded: true,
      }));

      return detail;
    } catch (error) {
      console.error("[Admin Orders] Detail fetch failed", {
        orderId,
        error: describeError(error),
      });
      set({
        isDetailLoading: false,
        error: error instanceof Error ? error.message : "Unable to load order details",
      });
      throw error;
    }
  },

  updateSellerGroupStatus: async (groupId, status) => {
    const token = useAdminAuthStore.getState().token;
    const currentDetail = get().selectedOrderDetail;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Orders] Status update start", { groupId, status });
    set({ isUpdating: true, error: null });

    try {
      await adminApiRequest<{ success: true; message: string }>(
        `/api/admin/order-groups/${groupId}/status`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({ status }),
        },
      );

      await get().fetchOrders({ force: true });
      if (currentDetail) {
        await get().fetchOrderDetail(currentDetail.id, { force: true });
      }

      console.log("[Admin Orders] Status update success", { groupId, status });
      set({ isUpdating: false, error: null });
    } catch (error) {
      console.error("[Admin Orders] Status update failed", {
        groupId,
        status,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : "Unable to update order status",
      });
      throw error;
    }
  },

  initializeAssistedOrder: async (payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Orders] Assisted initialize start", payload);
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        message: string;
        order: any;
        payment: any;
      }>("/api/admin/orders/assisted/initialize", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      const order = normalizeOrder(response.order);
      const payment: AdminAssistedOrderPaymentRecord = {
        id: String(response.payment.id),
        provider: String(response.payment.provider || ""),
        status: String(response.payment.status || ""),
        reference: String(response.payment.reference || ""),
        accessCode: response.payment.accessCode
          ? String(response.payment.accessCode)
          : null,
        authorizationUrl: response.payment.authorizationUrl
          ? String(response.payment.authorizationUrl)
          : null,
        amount: Number(response.payment.amount || 0),
        amountInSubunit: Number(response.payment.amountInSubunit || 0),
        currencyCode: String(response.payment.currencyCode || "NGN"),
      };

      set((state) => ({
        orders: [order, ...state.orders.filter((entry) => entry.id !== order.id)],
        isUpdating: false,
        error: null,
        loaded: true,
      }));

      console.log("[Admin Orders] Assisted initialize success", {
        orderId: order.id,
        paymentReference: payment.reference,
      });

      return { order, payment };
    } catch (error) {
      console.error("[Admin Orders] Assisted initialize failed", {
        payload,
        error: describeError(error),
      });
      set({
        isUpdating: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to initialize assisted order",
      });
      throw error;
    }
  },

  clearSelectedOrderDetail: () => set({ selectedOrderDetail: null, isDetailLoading: false }),

  resetOrders: () => {
    set({
      orders: [],
      selectedOrderDetail: null,
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
