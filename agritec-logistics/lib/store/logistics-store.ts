"use client";

import { create } from "zustand";
import { logisticsApiRequest } from "@/lib/logistics-api";
import { useLogisticsAuthStore } from "@/lib/store/logistics-auth-store";
import type {
  AppNotification,
  AssignedDelivery,
  CoverageSelectionType,
  CoverageType,
  DashboardAnalytics,
  DeliveryStatus,
  LogisticsCoverageArea,
  LogisticsPricingSettings,
  LogisticsProfileResponse,
} from "@/lib/types";

type CoverageDraft = {
  coverageType: CoverageType;
  stateSelections: string[];
  lgaSelections: Array<{ state: string; lga: string }>;
};

type LogisticsProfileState = {
  pricingSettings: LogisticsPricingSettings | null;
  coverageAreas: LogisticsCoverageArea[];
  coverageDraft: CoverageDraft;
};

type LogisticsStore = {
  deliveries: AssignedDelivery[];
  notifications: AppNotification[];
  unreadCount: number;
  profile: LogisticsProfileState | null;
  analytics: DashboardAnalytics;
  isLoadingDeliveries: boolean;
  isLoadingDeliveryDetail: boolean;
  isLoadingNotifications: boolean;
  isLoadingProfile: boolean;
  isUpdatingStatus: boolean;
  isUpdatingProfile: boolean;
  error: string | null;
  fetchDeliveries: (options?: { force?: boolean }) => Promise<void>;
  fetchDelivery: (id: string, options?: { force?: boolean }) => Promise<AssignedDelivery>;
  updateDeliveryStatus: (
    id: string,
    status: DeliveryStatus,
    description?: string
  ) => Promise<AssignedDelivery>;
  fetchNotifications: (options?: { force?: boolean }) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  fetchProfile: (options?: { force?: boolean }) => Promise<void>;
  updateProfile: (payload: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
};

const emptyAnalytics: DashboardAnalytics = {
  totalDeliveries: 0,
  deliveredCount: 0,
  cancelledCount: 0,
  pendingCount: 0,
  inTransitCount: 0,
  revenue: 0,
  statusBreakdown: {
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    REFUNDED: 0,
  },
  revenueByDate: [],
  deliveriesByDate: [],
};

function ensureToken() {
  const token = useLogisticsAuthStore.getState().token;
  if (!token) {
    throw new Error("Unauthorized");
  }
  return token;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDeliveryProduct(item: any) {
  return {
    id: String(item.id),
    productId: item.productId ? String(item.productId) : null,
    variantId: item.variantId ? String(item.variantId) : null,
    productTitleSnapshot: String(item.productTitleSnapshot || ""),
    variantTitleSnapshot: item.variantTitleSnapshot
      ? String(item.variantTitleSnapshot)
      : null,
    salesUnitSnapshot: String(item.salesUnitSnapshot || ""),
    packageTypeSnapshot: String(item.packageTypeSnapshot || ""),
    quantity: toNumber(item.quantity),
    lineTotal: toNumber(item.lineTotal),
    unitWeightKgSnapshot:
      item.unitWeightKgSnapshot == null ? null : toNumber(item.unitWeightKgSnapshot),
  };
}

function normalizeStatusHistory(entry: any) {
  return {
    id: String(entry.id),
    sellerOrderGroupId: String(entry.sellerOrderGroupId || ""),
    status: String(entry.status || "PENDING") as DeliveryStatus,
    description: entry.description ? String(entry.description) : null,
    updatedByUserId: entry.updatedByUserId ? String(entry.updatedByUserId) : null,
    updatedByRole: entry.updatedByRole ? String(entry.updatedByRole) : null,
    updatedByUser: entry.updatedByUser
      ? {
          id: String(entry.updatedByUser.id),
          fullName: String(entry.updatedByUser.fullName || ""),
          role: String(entry.updatedByUser.role || ""),
        }
      : null,
    createdAt: String(entry.createdAt || ""),
  };
}

function normalizeDelivery(delivery: any): AssignedDelivery {
  return {
    id: String(delivery.id),
    parentOrderId: String(delivery.parentOrderId || ""),
    sellerId: String(delivery.sellerId || ""),
    status: String(delivery.status || "PENDING") as DeliveryStatus,
    sellerNameSnapshot: String(delivery.sellerNameSnapshot || ""),
    farmNameSnapshot: String(delivery.farmNameSnapshot || ""),
    logisticsCompanyNameSnapshot: delivery.logisticsCompanyNameSnapshot
      ? String(delivery.logisticsCompanyNameSnapshot)
      : null,
    productSubtotal: toNumber(delivery.productSubtotal),
    shippingFee: toNumber(delivery.shippingFee),
    discountTotal: toNumber(delivery.discountTotal),
    groupTotal: toNumber(delivery.groupTotal),
    deliveryRegion: String(delivery.deliveryRegion || ""),
    totalChargeableWeightKg:
      delivery.totalChargeableWeightKg == null
        ? null
        : toNumber(delivery.totalChargeableWeightKg),
    weightUnitSizeKg:
      delivery.weightUnitSizeKg == null ? null : toNumber(delivery.weightUnitSizeKg),
    shippingUnits: toNumber(delivery.shippingUnits),
    minimumFee: toNumber(delivery.minimumFee),
    additionalUnitFee: toNumber(delivery.additionalUnitFee),
    sellerPickupStateSnapshot: delivery.sellerPickupStateSnapshot
      ? String(delivery.sellerPickupStateSnapshot)
      : null,
    sellerPickupCitySnapshot: delivery.sellerPickupCitySnapshot
      ? String(delivery.sellerPickupCitySnapshot)
      : null,
    sellerPickupLgaSnapshot: delivery.sellerPickupLgaSnapshot
      ? String(delivery.sellerPickupLgaSnapshot)
      : null,
    buyerDeliveryStateSnapshot: delivery.buyerDeliveryStateSnapshot
      ? String(delivery.buyerDeliveryStateSnapshot)
      : null,
    buyerDeliveryCitySnapshot: delivery.buyerDeliveryCitySnapshot
      ? String(delivery.buyerDeliveryCitySnapshot)
      : null,
    buyerDeliveryLgaSnapshot: delivery.buyerDeliveryLgaSnapshot
      ? String(delivery.buyerDeliveryLgaSnapshot)
      : null,
    logisticsCompany: delivery.logisticsCompany
      ? {
          id: String(delivery.logisticsCompany.id),
          companyName: String(delivery.logisticsCompany.companyName || ""),
          phone: delivery.logisticsCompany.phone
            ? String(delivery.logisticsCompany.phone)
            : null,
          contactPersonName: delivery.logisticsCompany.contactPersonName
            ? String(delivery.logisticsCompany.contactPersonName)
            : null,
        }
      : null,
    seller: delivery.seller
      ? {
          id: String(delivery.seller.id),
          user: delivery.seller.user
            ? {
                fullName: String(delivery.seller.user.fullName || ""),
                phone: delivery.seller.user.phone
                  ? String(delivery.seller.user.phone)
                  : null,
              }
            : null,
        }
      : null,
    parentOrder: delivery.parentOrder
      ? {
          id: String(delivery.parentOrder.id),
          buyerNameSnapshot: String(delivery.parentOrder.buyerNameSnapshot || ""),
          buyerPhoneSnapshot: delivery.parentOrder.buyerPhoneSnapshot
            ? String(delivery.parentOrder.buyerPhoneSnapshot)
            : null,
          paymentStatus: delivery.parentOrder.paymentStatus
            ? String(delivery.parentOrder.paymentStatus)
            : undefined,
          payment: delivery.parentOrder.payment
            ? { status: String(delivery.parentOrder.payment.status || "") }
            : null,
          addressSnapshot: delivery.parentOrder.addressSnapshot
            ? {
                addressLine: String(
                  delivery.parentOrder.addressSnapshot.addressLine || ""
                ),
                fullAddress: String(
                  delivery.parentOrder.addressSnapshot.fullAddress || ""
                ),
                city: delivery.parentOrder.addressSnapshot.city
                  ? String(delivery.parentOrder.addressSnapshot.city)
                  : null,
                state: delivery.parentOrder.addressSnapshot.state
                  ? String(delivery.parentOrder.addressSnapshot.state)
                  : null,
                lga: delivery.parentOrder.addressSnapshot.lga
                  ? String(delivery.parentOrder.addressSnapshot.lga)
                  : null,
                area: delivery.parentOrder.addressSnapshot.area
                  ? String(delivery.parentOrder.addressSnapshot.area)
                  : null,
                landmark: delivery.parentOrder.addressSnapshot.landmark
                  ? String(delivery.parentOrder.addressSnapshot.landmark)
                  : null,
              }
            : null,
          buyer: delivery.parentOrder.buyer
            ? {
                user: delivery.parentOrder.buyer.user
                  ? {
                      fullName: String(
                        delivery.parentOrder.buyer.user.fullName || ""
                      ),
                      phone: delivery.parentOrder.buyer.user.phone
                        ? String(delivery.parentOrder.buyer.user.phone)
                        : null,
                    }
                  : null,
              }
            : null,
        }
      : null,
    items: Array.isArray(delivery.items)
      ? delivery.items.map(normalizeDeliveryProduct)
      : [],
    refunds: Array.isArray(delivery.refunds)
      ? delivery.refunds.map((refund: any) => ({
          id: String(refund.id),
          status: String(refund.status || ""),
          amount: toNumber(refund.amount),
          createdAt: String(refund.createdAt || ""),
        }))
      : [],
    statusHistory: Array.isArray(delivery.statusHistory)
      ? delivery.statusHistory.map(normalizeStatusHistory)
      : [],
    createdAt: String(delivery.createdAt || ""),
    updatedAt: String(delivery.updatedAt || ""),
  };
}

function normalizeNotification(notification: any): AppNotification {
  return {
    id: String(notification.id),
    type: String(notification.type || ""),
    title: String(notification.title || ""),
    body: String(notification.body || ""),
    isRead: Boolean(notification.isRead),
    targetType: notification.targetType ? String(notification.targetType) : null,
    targetId: notification.targetId ? String(notification.targetId) : null,
    metadata:
      notification.metadata && typeof notification.metadata === "object"
        ? (notification.metadata as Record<string, unknown>)
        : null,
    createdAt: String(notification.createdAt || ""),
  };
}

function buildCoverageDraft(
  coverageAreas: LogisticsCoverageArea[]
): CoverageDraft {
  const hasNationwide = coverageAreas.some(
    (area) => area.coverageType === "NATIONWIDE"
  );

  if (hasNationwide) {
    return {
      coverageType: "NATIONWIDE",
      stateSelections: [],
      lgaSelections: [],
    };
  }

  const states = new Set<string>();
  const lgaSelections: Array<{ state: string; lga: string }> = [];

  for (const area of coverageAreas) {
    if (area.state) {
      states.add(area.state);
    }
    if (area.state && area.selectionType === "LGA" && area.lga) {
      lgaSelections.push({ state: area.state, lga: area.lga });
    }
  }

  return {
    coverageType: "REGIONAL",
    stateSelections: Array.from(states.values()).sort(),
    lgaSelections,
  };
}

function normalizePricingSettings(settings: any): LogisticsPricingSettings | null {
  if (!settings) {
    return null;
  }

  return {
    id: String(settings.id),
    logisticsCompanyId: String(settings.logisticsCompanyId),
    abujaMinimumFee: toNumber(settings.abujaMinimumFee),
    abujaAdditionalUnitFee: toNumber(settings.abujaAdditionalUnitFee),
    outsideMinimumFee: toNumber(settings.outsideMinimumFee),
    outsideAdditionalUnitFee: toNumber(settings.outsideAdditionalUnitFee),
    weightUnitSizeKg: toNumber(settings.weightUnitSizeKg),
    volumetricDivisor: toNumber(settings.volumetricDivisor),
    weeklyAutoPayoutDay:
      settings.weeklyAutoPayoutDay == null
        ? null
        : toNumber(settings.weeklyAutoPayoutDay),
    createdAt: String(settings.createdAt || ""),
    updatedAt: String(settings.updatedAt || ""),
  };
}

function normalizeCoverageArea(area: any): LogisticsCoverageArea {
  return {
    id: String(area.id),
    logisticsCompanyId: String(area.logisticsCompanyId || ""),
    coverageType: String(area.coverageType || "REGIONAL") as CoverageType,
    selectionType: area.selectionType
      ? (String(area.selectionType) as CoverageSelectionType)
      : null,
    state: area.state ? String(area.state) : null,
    lga: area.lga ? String(area.lga) : null,
    city: area.city ? String(area.city) : null,
    area: area.area ? String(area.area) : null,
    isActive: Boolean(area.isActive),
    createdAt: String(area.createdAt || ""),
    updatedAt: String(area.updatedAt || ""),
  };
}

function buildAnalytics(deliveries: AssignedDelivery[]): DashboardAnalytics {
  const analytics = structuredClone(emptyAnalytics);
  analytics.totalDeliveries = deliveries.length;

  const revenueByDateMap = new Map<string, number>();
  const deliveriesByDateMap = new Map<string, number>();

  for (const delivery of deliveries) {
    analytics.statusBreakdown[delivery.status] += 1;
    if (delivery.status === "DELIVERED") analytics.deliveredCount += 1;
    if (delivery.status === "CANCELLED") analytics.cancelledCount += 1;
    if (delivery.status === "PENDING" || delivery.status === "CONFIRMED") {
      analytics.pendingCount += 1;
    }
    if (delivery.status === "PROCESSING" || delivery.status === "SHIPPED") {
      analytics.inTransitCount += 1;
    }
    if (delivery.status !== "CANCELLED" && delivery.status !== "REFUNDED") {
      analytics.revenue += delivery.shippingFee;
    }

    const day = new Date(delivery.createdAt).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    });
    deliveriesByDateMap.set(day, (deliveriesByDateMap.get(day) || 0) + 1);

    if (delivery.status === "DELIVERED") {
      revenueByDateMap.set(day, (revenueByDateMap.get(day) || 0) + delivery.shippingFee);
    }
  }

  analytics.deliveriesByDate = Array.from(deliveriesByDateMap.entries()).map(
    ([date, count]) => ({ date, count })
  );
  analytics.revenueByDate = Array.from(revenueByDateMap.entries()).map(
    ([date, revenue]) => ({ date, revenue })
  );

  return analytics;
}

export const useLogisticsStore = create<LogisticsStore>((set, get) => ({
  deliveries: [],
  notifications: [],
  unreadCount: 0,
  profile: null,
  analytics: emptyAnalytics,
  isLoadingDeliveries: false,
  isLoadingDeliveryDetail: false,
  isLoadingNotifications: false,
  isLoadingProfile: false,
  isUpdatingStatus: false,
  isUpdatingProfile: false,
  error: null,

  fetchDeliveries: async ({ force = false } = {}) => {
    if (!force && get().deliveries.length > 0) {
      return;
    }

    set({ isLoadingDeliveries: true, error: null });
    try {
      const token = ensureToken();
      const response = await logisticsApiRequest<{
        success: true;
        deliveries: any[];
      }>("/api/logistics/deliveries", { method: "GET", token });

      const deliveries = Array.isArray(response.deliveries)
        ? response.deliveries.map(normalizeDelivery)
        : [];

      set({
        deliveries,
        analytics: buildAnalytics(deliveries),
        isLoadingDeliveries: false,
      });
    } catch (error) {
      set({
        isLoadingDeliveries: false,
        error: error instanceof Error ? error.message : "Failed to load deliveries",
      });
      throw error;
    }
  },

  fetchDelivery: async (id, { force = false } = {}) => {
    const existing = get().deliveries.find((delivery) => delivery.id === id);
    if (existing && !force && existing.parentOrder) {
      return existing;
    }

    set({ isLoadingDeliveryDetail: true, error: null });
    try {
      const token = ensureToken();
      const response = await logisticsApiRequest<{
        success: true;
        delivery: any;
      }>(`/api/logistics/deliveries/${id}`, { method: "GET", token });

      const normalized = normalizeDelivery(response.delivery);
      const deliveries = get().deliveries.some((delivery) => delivery.id === normalized.id)
        ? get().deliveries.map((delivery) =>
            delivery.id === normalized.id ? normalized : delivery
          )
        : [normalized, ...get().deliveries];

      set({
        deliveries,
        analytics: buildAnalytics(deliveries),
        isLoadingDeliveryDetail: false,
      });

      return normalized;
    } catch (error) {
      set({
        isLoadingDeliveryDetail: false,
        error:
          error instanceof Error ? error.message : "Failed to load delivery details",
      });
      throw error;
    }
  },

  updateDeliveryStatus: async (id, status, description) => {
    set({ isUpdatingStatus: true, error: null });
    try {
      const token = ensureToken();
      const response = await logisticsApiRequest<{
        success: true;
        delivery: any;
      }>(`/api/logistics/deliveries/${id}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          status,
          description: description?.trim() || null,
        }),
      });

      const normalized = normalizeDelivery(response.delivery);
      const deliveries = get().deliveries.map((delivery) =>
        delivery.id === normalized.id ? normalized : delivery
      );

      set({
        deliveries,
        analytics: buildAnalytics(deliveries),
        isUpdatingStatus: false,
      });

      return normalized;
    } catch (error) {
      set({
        isUpdatingStatus: false,
        error:
          error instanceof Error ? error.message : "Failed to update delivery status",
      });
      throw error;
    }
  },

  fetchNotifications: async ({ force = false } = {}) => {
    if (!force && get().notifications.length > 0) {
      return;
    }

    set({ isLoadingNotifications: true, error: null });
    try {
      const token = ensureToken();
      const response = await logisticsApiRequest<{
        success: true;
        notifications: any[];
        unreadCount: number;
      }>("/api/notifications?page=1&pageSize=50", { method: "GET", token });

      set({
        notifications: Array.isArray(response.notifications)
          ? response.notifications.map(normalizeNotification)
          : [],
        unreadCount: toNumber(response.unreadCount),
        isLoadingNotifications: false,
      });
    } catch (error) {
      set({
        isLoadingNotifications: false,
        error:
          error instanceof Error ? error.message : "Failed to load notifications",
      });
      throw error;
    }
  },

  markNotificationAsRead: async (id) => {
    const token = ensureToken();
    await logisticsApiRequest(`/api/notifications/${id}/read`, {
      method: "PATCH",
      token,
    });

    set((state) => {
      const notifications = state.notifications.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      );
      return {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.isRead).length,
      };
    });
  },

  markAllNotificationsAsRead: async () => {
    const token = ensureToken();
    await logisticsApiRequest("/api/notifications/read-all", {
      method: "PATCH",
      token,
    });

    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
      unreadCount: 0,
    }));
  },

  fetchProfile: async ({ force = false } = {}) => {
    if (!force && get().profile) {
      return;
    }

    set({ isLoadingProfile: true, error: null });
    try {
      const token = ensureToken();
      const response = await logisticsApiRequest<
        { success: true } & LogisticsProfileResponse
      >("/api/logistics/profile", {
        method: "GET",
        token,
      });

      const pricingSettings = normalizePricingSettings(response.pricingSettings);
      const coverageAreas = Array.isArray(response.coverageAreas)
        ? response.coverageAreas.map(normalizeCoverageArea)
        : [];

      useLogisticsAuthStore.setState({ user: response.user });

      set({
        profile: {
          pricingSettings,
          coverageAreas,
          coverageDraft: buildCoverageDraft(coverageAreas),
        },
        isLoadingProfile: false,
      });
    } catch (error) {
      set({
        isLoadingProfile: false,
        error: error instanceof Error ? error.message : "Failed to load profile",
      });
      throw error;
    }
  },

  updateProfile: async (payload) => {
    set({ isUpdatingProfile: true, error: null });
    try {
      const token = ensureToken();
      const response = await logisticsApiRequest<
        { success: true; message: string } & LogisticsProfileResponse
      >("/api/logistics/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      const pricingSettings = normalizePricingSettings(response.pricingSettings);
      const coverageAreas = Array.isArray(response.coverageAreas)
        ? response.coverageAreas.map(normalizeCoverageArea)
        : [];

      useLogisticsAuthStore.setState({ user: response.user });

      set({
        profile: {
          pricingSettings,
          coverageAreas,
          coverageDraft: buildCoverageDraft(coverageAreas),
        },
        isUpdatingProfile: false,
      });
    } catch (error) {
      set({
        isUpdatingProfile: false,
        error: error instanceof Error ? error.message : "Failed to update profile",
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
