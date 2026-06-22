import type {
  AppNotification,
  AssignedDelivery,
  DashboardAnalytics,
  LogisticsCoverageArea,
  LogisticsPricingSettings,
} from "@/lib/types";

export const mockDeliveries: AssignedDelivery[] = [];
export const mockNotifications: AppNotification[] = [];
export const mockAnalytics: DashboardAnalytics = {
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
export const mockPricingTiers: LogisticsPricingSettings[] = [];
export const mockCoverageAreas: LogisticsCoverageArea[] = [];
