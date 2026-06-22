export type LogisticsVerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "SUSPENDED";

export type DeliveryStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type CoverageType = "NATIONWIDE" | "REGIONAL";

export type CoverageSelectionType = "STATE" | "LGA" | "CITY" | "AREA";

export type LogisticsAuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "LOGISTICS";
  phone?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  logisticsProfile: LogisticsCompanyProfile | null;
};

export type LogisticsCompanyProfile = {
  id: string;
  companyName: string;
  description?: string | null;
  contactPersonName?: string | null;
  phone?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  lga?: string | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus: LogisticsVerificationStatus;
  isVerified: boolean;
};

export type LogisticsPricingSettings = {
  id: string;
  logisticsCompanyId: string;
  abujaMinimumFee: number;
  abujaAdditionalUnitFee: number;
  outsideMinimumFee: number;
  outsideAdditionalUnitFee: number;
  weightUnitSizeKg: number;
  volumetricDivisor: number;
  weeklyAutoPayoutDay: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LogisticsCoverageArea = {
  id: string;
  logisticsCompanyId: string;
  coverageType: CoverageType;
  selectionType: CoverageSelectionType | null;
  state: string | null;
  lga: string | null;
  city: string | null;
  area: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LogisticsProfileResponse = {
  user: LogisticsAuthUser;
  pricingSettings: LogisticsPricingSettings | null;
  coverageAreas: LogisticsCoverageArea[];
};

export type StatusHistoryEntry = {
  id: string;
  sellerOrderGroupId: string;
  status: DeliveryStatus;
  description?: string | null;
  updatedByUserId?: string | null;
  updatedByRole?: string | null;
  updatedByUser?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  createdAt: string;
};

export type DeliveryProduct = {
  id: string;
  productId: string | null;
  variantId: string | null;
  productTitleSnapshot: string;
  variantTitleSnapshot: string | null;
  salesUnitSnapshot: string;
  packageTypeSnapshot: string;
  quantity: number;
  lineTotal: number;
  unitWeightKgSnapshot: number | null;
};

export type AssignedDelivery = {
  id: string;
  parentOrderId: string;
  sellerId: string;
  status: DeliveryStatus;
  sellerNameSnapshot: string;
  farmNameSnapshot: string;
  logisticsCompanyNameSnapshot?: string | null;
  productSubtotal: number;
  shippingFee: number;
  discountTotal: number;
  groupTotal: number;
  deliveryRegion: string;
  totalChargeableWeightKg: number | null;
  weightUnitSizeKg: number | null;
  shippingUnits: number;
  minimumFee: number;
  additionalUnitFee: number;
  sellerPickupStateSnapshot?: string | null;
  sellerPickupCitySnapshot?: string | null;
  sellerPickupLgaSnapshot?: string | null;
  buyerDeliveryStateSnapshot?: string | null;
  buyerDeliveryCitySnapshot?: string | null;
  buyerDeliveryLgaSnapshot?: string | null;
  logisticsCompany?: {
    id: string;
    companyName: string;
    phone?: string | null;
    contactPersonName?: string | null;
  } | null;
  seller?: {
    id: string;
    user?: {
      fullName: string;
      phone?: string | null;
    } | null;
  } | null;
  parentOrder?: {
    id: string;
    buyerNameSnapshot: string;
    buyerPhoneSnapshot?: string | null;
    paymentStatus?: string;
    payment?: {
      status: string;
    } | null;
    addressSnapshot?: {
      addressLine: string;
      fullAddress: string;
      city?: string | null;
      state?: string | null;
      lga?: string | null;
      area?: string | null;
      landmark?: string | null;
    } | null;
    buyer?: {
      user?: {
        fullName: string;
        phone?: string | null;
      } | null;
    } | null;
  } | null;
  items: DeliveryProduct[];
  refunds?: Array<{
    id: string;
    status: string;
    amount: number;
    createdAt: string;
  }>;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type DashboardAnalytics = {
  totalDeliveries: number;
  deliveredCount: number;
  cancelledCount: number;
  pendingCount: number;
  inTransitCount: number;
  revenue: number;
  statusBreakdown: Record<DeliveryStatus, number>;
  revenueByDate: { date: string; revenue: number }[];
  deliveriesByDate: { date: string; count: number }[];
};

export type LogisticsSignupPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  companyName: string;
  description?: string | null;
  contactPersonName?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  lga?: string | null;
  area?: string | null;
};
