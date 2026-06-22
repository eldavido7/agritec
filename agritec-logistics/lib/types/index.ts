export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';

export type CoverageType = 'local' | 'regional' | 'nationwide';

export type NotificationType = 'new_delivery' | 'status_update' | 'admin_message' | 'failed_delivery';

export interface LogisticsCompany {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  coverageType: CoverageType;
  isActive: boolean;
  address?: string;
  cacNumber?: string;
}

export interface StatusHistoryEntry {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  description?: string;
  updatedByUserId: string;
  updatedByName: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  weight: number;
}

export interface AssignedDelivery {
  id: string;
  parentOrderId: string;
  sellerGroupId: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  buyerId: string;
  buyerDisplayName: string;
  buyerPhone?: string;
  pickupAddress: string;
  pickupCoordinates?: { lat: number; lng: number };
  deliveryAddress: string;
  deliveryCoordinates?: { lat: number; lng: number };
  deliveryRegion: string;
  deliveryState?: string;
  deliveryCity?: string;
  deliveryFee: number;
  totalChargeableWeightKg: number;
  currentStatus: DeliveryStatus;
  products?: Product[];
  assignedAt: Date;
  updatedAt: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  statusHistory: StatusHistoryEntry[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  deliveryId?: string;
  createdAt: Date;
}

export interface DashboardAnalytics {
  totalDeliveries: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  inTransitCount: number;
  revenue: number;
  statusBreakdown: Record<DeliveryStatus, number>;
  revenueByDate: { date: string; revenue: number }[];
  deliveriesByDate: { date: string; count: number }[];
}

export interface PricingTier {
  id: string;
  name: string;
  basePrice: number;
  pricePerKg: number;
  minWeight: number;
  maxWeight: number;
}

export interface CoverageArea {
  id: string;
  state: string;
  cities: string[];
  covered: boolean;
}
