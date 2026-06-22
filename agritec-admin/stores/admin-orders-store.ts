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
  logisticsCompanyId: string | null;
  logisticsCompanyNameSnapshot: string | null;
  shippingPricedBy: string | null;
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
  weightUnitSizeKg: number | null;
  shippingUnits: number;
  minimumFee: number;
  additionalUnitFee: number;
  discountCodeSnapshot: string | null;
  discountTypeSnapshot: string | null;
  discountValueSnapshot: number | null;
  discountDescriptionSnapshot: string | null;
  statusHistory: Array<{
    id: string;
    status: string;
    description: string | null;
    updatedByRole: string | null;
    updatedByUser: {
      id: string;
      fullName: string;
      role: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  }>;
  items: AdminOrderItemRecord[];
  createdAt: string;
  updatedAt: string;
};

export type AdminAssistedOrderEligibleLogisticsRecord = {
  id: string;
  companyName: string;
  coverageType: string;
  coveredStates: string[];
  pricing: {
    id: string;
    pricingScope: string;
    state: string | null;
    minimumFee: number;
    additionalUnitFee: number;
    weightUnitSizeKg: number;
    volumetricDivisor: number;
    isActive: boolean;
  };
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

export type AdminAssistedOrderQuoteRecord = {
  buyerId: string;
  productSubtotal: number;
  totalShippingFee: number;
  discountTotal: number;
  grandTotal: number;
  currencyCode: string;
  allGroupsLogisticsCompanyId: string | null;
  sellerGroups: Array<{
    sellerId: string;
    sellerName: string;
    farmName: string;
    buyerDeliveryState: string;
    buyerDeliveryCity: string;
    buyerDeliveryLga: string | null;
    productSubtotal: number;
    discountTotal: number;
    totalChargeableWeightKg: number;
    shippingFee: number;
    groupTotal: number;
    logisticsCompanyId: string | null;
    logisticsCompanyName: string | null;
    deliveryRegion: string;
    weightUnitSizeKg: number;
    shippingUnits: number;
    minimumFee: number;
    additionalUnitFee: number;
    shippingPricedBy: string;
    eligibleLogisticsCompanies: AdminAssistedOrderEligibleLogisticsRecord[];
  }>;
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
    logisticsSelections?: Record<string, string>;
    allGroupsLogisticsCompanyId?: string | null;
    callbackUrl?: string;
    channels?: string[];
  } & AdminAssistedOrderAddressPayload) => Promise<{
    order: AdminOrderRecord;
    payment: AdminAssistedOrderPaymentRecord;
  }>;
  quoteAssistedOrder: (payload: {
    buyerId: string;
    items: AdminAssistedOrderLinePayload[];
    discountCodes?: Record<string, string>;
    logisticsSelections?: Record<string, string>;
    allGroupsLogisticsCompanyId?: string | null;
  } & AdminAssistedOrderAddressPayload) => Promise<AdminAssistedOrderQuoteRecord>;
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
    logisticsCompanyId: group.logisticsCompanyId ? String(group.logisticsCompanyId) : null,
    logisticsCompanyNameSnapshot: group.logisticsCompanyNameSnapshot
      ? String(group.logisticsCompanyNameSnapshot)
      : null,
    shippingPricedBy: group.shippingPricedBy ? String(group.shippingPricedBy) : null,
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
    weightUnitSizeKg: group.weightUnitSizeKg == null ? null : Number(group.weightUnitSizeKg),
    shippingUnits: Number(group.shippingUnits || 0),
    minimumFee: Number(group.minimumFee || 0),
    additionalUnitFee: Number(group.additionalUnitFee || 0),
    discountCodeSnapshot: group.discountCodeSnapshot ? String(group.discountCodeSnapshot) : null,
    discountTypeSnapshot: group.discountTypeSnapshot ? String(group.discountTypeSnapshot) : null,
    discountValueSnapshot: group.discountValueSnapshot == null ? null : Number(group.discountValueSnapshot),
    discountDescriptionSnapshot: group.discountDescriptionSnapshot ? String(group.discountDescriptionSnapshot) : null,
    statusHistory: Array.isArray(group.statusHistory)
      ? group.statusHistory.map((entry: any) => ({
          id: String(entry.id),
          status: String(entry.status || ""),
          description: entry.description ? String(entry.description) : null,
          updatedByRole: entry.updatedByRole ? String(entry.updatedByRole) : null,
          updatedByUser: entry.updatedByUser
            ? {
                id: String(entry.updatedByUser.id || ""),
                fullName: String(entry.updatedByUser.fullName || ""),
                role: String(entry.updatedByUser.role || ""),
              }
            : null,
          createdAt: String(entry.createdAt || ""),
          updatedAt: String(entry.updatedAt || ""),
        }))
      : [],
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

function normalizeAssistedOrderQuote(quote: any): AdminAssistedOrderQuoteRecord {
  return {
    buyerId: String(quote.buyerId || ""),
    productSubtotal: Number(quote.productSubtotal || 0),
    totalShippingFee: Number(quote.totalShippingFee || 0),
    discountTotal: Number(quote.discountTotal || 0),
    grandTotal: Number(quote.grandTotal || 0),
    currencyCode: String(quote.currencyCode || "NGN"),
    allGroupsLogisticsCompanyId: quote.allGroupsLogisticsCompanyId
      ? String(quote.allGroupsLogisticsCompanyId)
      : null,
    sellerGroups: Array.isArray(quote.sellerGroups)
      ? quote.sellerGroups.map((group: any) => ({
          sellerId: String(group.sellerId || ""),
          sellerName: String(group.sellerName || ""),
          farmName: String(group.farmName || ""),
          buyerDeliveryState: String(group.buyerDeliveryState || ""),
          buyerDeliveryCity: String(group.buyerDeliveryCity || ""),
          buyerDeliveryLga: group.buyerDeliveryLga ? String(group.buyerDeliveryLga) : null,
          productSubtotal: Number(group.productSubtotal || 0),
          discountTotal: Number(group.discountTotal || 0),
          totalChargeableWeightKg: Number(group.totalChargeableWeightKg || 0),
          shippingFee: Number(group.shippingFee || 0),
          groupTotal: Number(group.groupTotal || 0),
          logisticsCompanyId: group.logisticsCompanyId ? String(group.logisticsCompanyId) : null,
          logisticsCompanyName: group.logisticsCompanyName ? String(group.logisticsCompanyName) : null,
          deliveryRegion: String(group.deliveryRegion || ""),
          weightUnitSizeKg: Number(group.weightUnitSizeKg || 0),
          shippingUnits: Number(group.shippingUnits || 0),
          minimumFee: Number(group.minimumFee || 0),
          additionalUnitFee: Number(group.additionalUnitFee || 0),
          shippingPricedBy: String(group.shippingPricedBy || ""),
          eligibleLogisticsCompanies: Array.isArray(group.eligibleLogisticsCompanies)
            ? group.eligibleLogisticsCompanies.map((company: any) => ({
                id: String(company.id || ""),
                companyName: String(company.companyName || ""),
                coverageType: String(company.coverageType || ""),
                coveredStates: Array.isArray(company.coveredStates)
                  ? company.coveredStates.map((state: unknown) => String(state))
                  : [],
                pricing: {
                  id: String(company.pricing?.id || ""),
                  pricingScope: String(company.pricing?.pricingScope || ""),
                  state: company.pricing?.state ? String(company.pricing.state) : null,
                  minimumFee: Number(company.pricing?.minimumFee || 0),
                  additionalUnitFee: Number(company.pricing?.additionalUnitFee || 0),
                  weightUnitSizeKg: Number(company.pricing?.weightUnitSizeKg || 0),
                  volumetricDivisor: Number(company.pricing?.volumetricDivisor || 0),
                  isActive: Boolean(company.pricing?.isActive),
                },
              }))
            : [],
        }))
      : [],
  };
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

  quoteAssistedOrder: async (payload) => {
    const token = useAdminAuthStore.getState().token;
    if (!token) {
      throw new Error("Admin session not found");
    }

    console.log("[Admin Orders] Assisted quote start", payload);

    try {
      const response = await adminApiRequest<{
        success: true;
        quote: any;
      }>("/api/admin/orders/assisted/quote", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      const quote = normalizeAssistedOrderQuote(response.quote);
      console.log("[Admin Orders] Assisted quote success", {
        sellerGroupCount: quote.sellerGroups.length,
        totalShippingFee: quote.totalShippingFee,
      });
      return quote;
    } catch (error) {
      console.error("[Admin Orders] Assisted quote failed", {
        payload,
        error: describeError(error),
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
