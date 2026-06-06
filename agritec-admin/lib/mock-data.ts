type OrderStatus = "pending" | "in_transit" | "completed";
type PayoutStatus = "pending" | "in_progress" | "completed";

export const platformCategories = [
  { slug: "vegetables", label: "Vegetables" },
  { slug: "fruits", label: "Fruits" },
  { slug: "grains-cereals", label: "Grains & Cereals" },
  { slug: "tubers-roots", label: "Tubers & Roots" },
  { slug: "legumes", label: "Legumes" },
  { slug: "spices-herbs", label: "Spices & Herbs" },
  { slug: "livestock", label: "Livestock" },
  { slug: "poultry", label: "Poultry" },
  { slug: "fish-seafood", label: "Fish & Seafood" },
  { slug: "dairy", label: "Dairy" },
  { slug: "seeds-seedlings", label: "Seeds & Seedlings" },
  { slug: "farm-inputs", label: "Farm Inputs" },
  { slug: "processed-farm-products", label: "Processed Farm Products" },
  { slug: "other", label: "Other" },
] as const;

export const categorySlugFromLabel = (label: string) =>
  platformCategories.find((category) => category.label === label)?.slug ?? "other";
export const salesUnits = [
  "PIECE", "KG", "BAG", "BASKET", "CRATE", "BOX", "BUNDLE", "TRAY", "PACK", "LITRE", "ANIMAL", "OTHER",
] as const;

export const packageTypes = [
  "PIECE", "BAG", "BASKET", "CRATE", "BOX", "BUNDLE", "LIVE_ANIMAL", "OTHER",
] as const;

export const platformShippingSettings = {
  abujaRatePerShippingUnit: 5000,
  outsideAbujaRatePerShippingUnit: 10000,
  weightUnitSizeKg: 10,
  volumetricDivisor: 5000,
};

type SalesUnit = (typeof salesUnits)[number];
type PackageType = (typeof packageTypes)[number];

export type ProductLogistics = {
  salesUnit: SalesUnit;
  unitWeightKg: number;
  unitLengthCm?: number;
  unitWidthCm?: number;
  unitHeightCm?: number;
  packageType: PackageType;
};

const logisticsForProduct = (name: string): ProductLogistics => {
  const key = name.toLowerCase();
  if (key.includes("tomato")) return { salesUnit: "BASKET", unitWeightKg: 18, unitLengthCm: 55, unitWidthCm: 38, unitHeightCm: 28, packageType: "BASKET" };
  if (key.includes("rice")) return { salesUnit: "BAG", unitWeightKg: 25, unitLengthCm: 70, unitWidthCm: 45, unitHeightCm: 16, packageType: "BAG" };
  if (key.includes("wheat")) return { salesUnit: "BAG", unitWeightKg: 20, unitLengthCm: 68, unitWidthCm: 42, unitHeightCm: 14, packageType: "BAG" };
  if (key.includes("milk")) return { salesUnit: "LITRE", unitWeightKg: 1.1, unitLengthCm: 9, unitWidthCm: 9, unitHeightCm: 24, packageType: "PIECE" };
  if (key.includes("plantain")) return { salesUnit: "BUNDLE", unitWeightKg: 7, unitLengthCm: 60, unitWidthCm: 32, unitHeightCm: 25, packageType: "BUNDLE" };
  if (key.includes("yam")) return { salesUnit: "PIECE", unitWeightKg: 2.5, packageType: "PIECE" };
  if (key.includes("honey")) return { salesUnit: "PACK", unitWeightKg: 1.3, packageType: "BOX" };
  if (key.includes("corn")) return { salesUnit: "CRATE", unitWeightKg: 15, unitLengthCm: 60, unitWidthCm: 40, unitHeightCm: 25, packageType: "CRATE" };
  if (key.includes("egg")) return { salesUnit: "TRAY", unitWeightKg: 2.2, unitLengthCm: 30, unitWidthCm: 30, unitHeightCm: 7, packageType: "CRATE" };
  if (key.includes("pepper")) return { salesUnit: "BASKET", unitWeightKg: 10, unitLengthCm: 45, unitWidthCm: 35, unitHeightCm: 24, packageType: "BASKET" };
  return { salesUnit: "OTHER", unitWeightKg: 1, packageType: "OTHER" };
};

export const settings = {
  commissionRate: 10,
  minOrderAmount: 100000,
  maxOrderAmount: 50000000,
  payoutFrequency: "weekly",
  supportEmail: "support@agritec.com",
  supportPhone: "+234 1 234 5678",
};

export const sellers = [
  {
    id: "seller-kingsley",
    name: "Kingsley Joseph",
    email: "kingsley@farm.com",
    phone: "+234 701 234 5678",
    username: "kingsley",
    farmName: "Kingsley Family Farm",
    location: "Lagos, Nigeria",
    address: {
      fullAddress: "12 Admiralty Way, Lekki Phase 1, Lagos",
      latitude: 6.4474,
      longitude: 3.4722,
      landmark: "Near Admiralty Toll Plaza",
    },
    joinDate: "2023-01-15",
    isActive: true,
    wallet: {
      availableBalance: 2850000,
      pendingBalance: 450000,
      totalWithdrawn: 8500000,
      totalEarnings: 11800000,
      bankAccount: {
        bankName: "Guaranty Trust Bank",
        accountNumber: "1234567890",
        accountName: "Kingsley Family Farm",
      },
      automaticPayoutsEnabled: true,
    },
  },
  {
    id: "seller-amina",
    name: "Amina Bello",
    email: "amina@farm.com",
    phone: "+234 702 345 6789",
    username: "amina",
    farmName: "Bello Fresh Produce",
    location: "Kano, Nigeria",
    address: {
      fullAddress: "45 Zoo Road, Kano Municipal, Kano",
      latitude: 12.0022,
      longitude: 8.592,
      landmark: "Opposite Kano Zoo",
    },
    joinDate: "2023-02-20",
    isActive: true,
    wallet: {
      availableBalance: 1740000,
      pendingBalance: 310000,
      totalWithdrawn: 4200000,
      totalEarnings: 6250000,
      bankAccount: {
        bankName: "Zenith Bank",
        accountNumber: "9876543210",
        accountName: "Bello Fresh Produce",
      },
      automaticPayoutsEnabled: true,
    },
  },
];

export const products = [
  {
    id: 1,
    sellerId: "seller-kingsley",
    name: "Basmati Rice - Premium Grade",
    category: "Grains & Cereals",
    categorySlug: "grains-cereals",
    ...logisticsForProduct("Basmati Rice - Premium Grade"),
    price: 28500,
    inventory: 250,
    status: "active",
    variants: [
      { id: "1-1", name: "Premium 1kg", price: 28500, inventory: 120, logistics: { salesUnit: "BAG", unitWeightKg: 1, unitLengthCm: 24, unitWidthCm: 16, unitHeightCm: 6, packageType: "BAG" } },
      { id: "1-2", name: "Bulk 5kg", price: 135000, inventory: 80, logistics: { salesUnit: "BAG", unitWeightKg: 5, unitLengthCm: 40, unitWidthCm: 26, unitHeightCm: 10, packageType: "BAG" } },
      { id: "1-3", name: "Commercial 20kg", price: 520000, inventory: 50, logistics: { salesUnit: "BAG", unitWeightKg: 20, unitLengthCm: 68, unitWidthCm: 42, unitHeightCm: 15, packageType: "BAG" } },
    ],
    createdAt: "2024-05-15",
  },
  {
    id: 2,
    sellerId: "seller-kingsley",
    name: "Organic Wheat",
    category: "Grains & Cereals",
    categorySlug: "grains-cereals",
    ...logisticsForProduct("Organic Wheat"),
    price: 17500,
    inventory: 180,
    status: "active",
    variants: [
      { id: "2-1", name: "Standard 1kg", price: 17500, inventory: 100, logistics: { salesUnit: "BAG", unitWeightKg: 1, unitLengthCm: 24, unitWidthCm: 16, unitHeightCm: 6, packageType: "BAG" } },
      { id: "2-2", name: "Family 10kg", price: 160000, inventory: 80, logistics: { salesUnit: "BAG", unitWeightKg: 10, unitLengthCm: 55, unitWidthCm: 34, unitHeightCm: 12, packageType: "BAG" } },
    ],
    createdAt: "2024-05-10",
  },
  {
    id: 3,
    sellerId: "seller-kingsley",
    name: "Fresh Tomatoes",
    category: "Vegetables",
    categorySlug: "vegetables",
    ...logisticsForProduct("Fresh Tomatoes"),
    price: 2200,
    inventory: 8,
    status: "active",
    variants: [
      { id: "3-1", name: "Regular 1kg", price: 2200, inventory: 5, logistics: { salesUnit: "KG", unitWeightKg: 1, packageType: "PIECE" } },
      { id: "3-2", name: "Premium 1kg", price: 2800, inventory: 3, logistics: { salesUnit: "KG", unitWeightKg: 1, packageType: "PIECE" } },
    ],
    createdAt: "2024-05-20",
  },
  {
    id: 4,
    sellerId: "seller-kingsley",
    name: "Milk - Full Cream",
    category: "Dairy",
    categorySlug: "dairy",
    ...logisticsForProduct("Milk - Full Cream"),
    price: 3500,
    inventory: 320,
    status: "active",
    variants: [
      { id: "4-1", name: "500ml", price: 1750, inventory: 100, logistics: { salesUnit: "LITRE", unitWeightKg: 0.55, unitLengthCm: 7, unitWidthCm: 7, unitHeightCm: 18, packageType: "PIECE" } },
      { id: "4-2", name: "1L", price: 3500, inventory: 150, logistics: { salesUnit: "LITRE", unitWeightKg: 1.1, unitLengthCm: 9, unitWidthCm: 9, unitHeightCm: 24, packageType: "PIECE" } },
      { id: "4-3", name: "2L", price: 6500, inventory: 70, logistics: { salesUnit: "LITRE", unitWeightKg: 2.2, unitLengthCm: 12, unitWidthCm: 12, unitHeightCm: 30, packageType: "PIECE" } },
    ],
    createdAt: "2024-05-18",
  },
  {
    id: 5,
    sellerId: "seller-kingsley",
    name: "Plantain",
    category: "Vegetables",
    categorySlug: "vegetables",
    ...logisticsForProduct("Plantain"),
    price: 850,
    inventory: 450,
    status: "active",
    variants: [],
    createdAt: "2024-05-19",
  },
  {
    id: 6,
    sellerId: "seller-kingsley",
    name: "Yam",
    category: "Vegetables",
    categorySlug: "vegetables",
    ...logisticsForProduct("Yam"),
    price: 2500,
    inventory: 9,
    status: "active",
    variants: [],
    createdAt: "2024-05-21",
  },
  {
    id: 7,
    sellerId: "seller-kingsley",
    name: "Honey",
    category: "Other",
    categorySlug: "other",
    ...logisticsForProduct("Honey"),
    categoryNote: "Natural Sweeteners",
    price: 5500,
    inventory: 85,
    status: "active",
    variants: [],
    createdAt: "2024-05-16",
  },
  {
    id: 101,
    sellerId: "seller-amina",
    name: "Sweet Corn",
    category: "Grains & Cereals",
    categorySlug: "grains-cereals",
    ...logisticsForProduct("Sweet Corn"),
    price: 1200,
    inventory: 640,
    status: "active",
    variants: [
      { id: "101-1", name: "Fresh 1kg", price: 1200, inventory: 320, logistics: { salesUnit: "KG", unitWeightKg: 1, packageType: "PIECE" } },
      { id: "101-2", name: "Crate 15kg", price: 16500, inventory: 90, logistics: { salesUnit: "CRATE", unitWeightKg: 15, unitLengthCm: 60, unitWidthCm: 40, unitHeightCm: 25, packageType: "CRATE" } },
    ],
    createdAt: "2024-05-12",
  },
  {
    id: 102,
    sellerId: "seller-amina",
    name: "Free Range Eggs",
    category: "Poultry",
    categorySlug: "poultry",
    ...logisticsForProduct("Free Range Eggs"),
    price: 4300,
    inventory: 210,
    status: "active",
    variants: [
      { id: "102-1", name: "Half crate", price: 4300, inventory: 110, logistics: { salesUnit: "TRAY", unitWeightKg: 1.1, unitLengthCm: 30, unitWidthCm: 30, unitHeightCm: 4, packageType: "CRATE" } },
      { id: "102-2", name: "Full crate", price: 8200, inventory: 100, logistics: { salesUnit: "TRAY", unitWeightKg: 2.2, unitLengthCm: 30, unitWidthCm: 30, unitHeightCm: 7, packageType: "CRATE" } },
    ],
    createdAt: "2024-05-14",
  },
  {
    id: 103,
    sellerId: "seller-amina",
    name: "Red Bell Pepper",
    category: "Vegetables",
    categorySlug: "vegetables",
    ...logisticsForProduct("Red Bell Pepper"),
    price: 1800,
    inventory: 70,
    status: "active",
    variants: [],
    createdAt: "2024-05-19",
  },
];

export const discounts = [
  {
    id: "disc-kingsley-1",
    sellerId: "seller-kingsley",
    code: "RICE15",
    type: "percentage",
    value: 15,
    productIds: [1],
    variantIds: [],
    startsAt: "2026-05-01T00:00:00",
    endsAt: "2026-06-15T23:59:00",
    isActive: true,
    usageLimit: 150,
    usageCount: 43,
  },
  {
    id: "disc-kingsley-2",
    sellerId: "seller-kingsley",
    code: "MILK500",
    type: "fixed",
    value: 500,
    productIds: [],
    variantIds: ["4-2"],
    startsAt: "2026-06-10T00:00:00",
    endsAt: "2026-07-10T23:59:00",
    isActive: true,
    usageCount: 0,
  },
  {
    id: "disc-amina-1",
    sellerId: "seller-amina",
    code: "CORN20",
    type: "percentage",
    value: 20,
    productIds: [],
    variantIds: ["101-2"],
    startsAt: "2026-05-15T00:00:00",
    endsAt: "2026-06-30T23:59:00",
    isActive: true,
    usageLimit: 80,
    usageCount: 12,
  },
];

const buyerData = [
  {
    id: "buyer-fresh-market",
    name: "Fresh Market Wholesale",
    email: "info@freshmarket.com.ng",
    phone: "+234 805 987 6543",
    location: "Lagos",
    joinDate: "2023-01-10",
    isActive: true,
  },
  {
    id: "buyer-green-valley",
    name: "Green Valley Supermarket",
    email: "info@greenvalley.com.ng",
    phone: "+234 805 987 6543",
    location: "Abuja",
    joinDate: "2023-02-15",
    isActive: true,
  },
  {
    id: "buyer-dairy-dist",
    name: "Dairy Distribution Ltd",
    email: "sales@dairydist.com.ng",
    phone: "+234 702 345 6789",
    location: "Port Harcourt",
    joinDate: "2023-03-20",
    isActive: true,
  },
  {
    id: "buyer-grain-export",
    name: "Grain Export House",
    email: "export@grainhouse.com.ng",
    phone: "+234 809 456 7890",
    location: "Kano",
    joinDate: "2024-01-05",
    isActive: true,
  },
  {
    id: "buyer-north-coop",
    name: "North Market Cooperative",
    email: "orders@northmarket.ng",
    phone: "+234 803 111 2222",
    location: "Kano",
    joinDate: "2023-04-12",
    isActive: true,
  },
  {
    id: "buyer-kano-fresh",
    name: "Kano Fresh Foods",
    email: "supply@kanofresh.ng",
    phone: "+234 805 333 4444",
    location: "Kano",
    joinDate: "2023-06-08",
    isActive: true,
  },
  {
    id: "buyer-kaduna-grocers",
    name: "Kaduna Grocers",
    email: "buyer@kadunagrocers.ng",
    phone: "+234 809 555 6666",
    location: "Kaduna",
    joinDate: "2024-02-18",
    isActive: true,
  },
];

type BuyerAddress = {
  id: string;
  buyerId: string;
  addressLine: string;
  city: string;
  state: string;
  landmark: string;
  latitude: number;
  longitude: number;
  isManualAddress: boolean;
  isDefault: boolean;
  displayName?: string;
  isAdminAssisted?: boolean;
  fullAddress?: string;
  createdByRole?: 'buyer' | 'admin';
};

export const buyerAddresses: BuyerAddress[] = [
  {
    id: "baddr-001",
    buyerId: "buyer-fresh-market",
    addressLine: "24 Creek Road",
    city: "Lagos",
    state: "Lagos",
    landmark: "Near Apapa Roundabout",
    latitude: 6.4541,
    longitude: 3.3923,
    isManualAddress: false,
    isDefault: true,
  },
  {
    id: "baddr-002",
    buyerId: "buyer-green-valley",
    addressLine: "11 Gimbiya Street",
    city: "Abuja",
    state: "FCT",
    landmark: "Area 11 Junction",
    latitude: 9.0579,
    longitude: 7.4951,
    isManualAddress: false,
    isDefault: true,
  },
  {
    id: "baddr-003",
    buyerId: "buyer-dairy-dist",
    addressLine: "8 Rumuola Link Road",
    city: "Port Harcourt",
    state: "Rivers",
    landmark: "Opposite Rumuola Market",
    latitude: 4.8242,
    longitude: 7.0336,
    isManualAddress: false,
    isDefault: true,
  },
  {
    id: "baddr-004",
    buyerId: "buyer-grain-export",
    addressLine: "14 France Road",
    city: "Kano",
    state: "Kano",
    landmark: "Sabon Gari",
    latitude: 12.0022,
    longitude: 8.5919,
    isManualAddress: false,
    isDefault: true,
  },
  {
    id: "baddr-005",
    buyerId: "buyer-north-coop",
    addressLine: "No 5 Emir Palace Road",
    city: "Kano",
    state: "Kano",
    landmark: "Kurna area",
    latitude: 12.0132,
    longitude: 8.5231,
    isManualAddress: false,
    isDefault: true,
  },
  {
    id: "baddr-006",
    buyerId: "buyer-kano-fresh",
    addressLine: "77 Bompai Industrial Layout",
    city: "Kano",
    state: "Kano",
    landmark: "Near Bompai Police HQ",
    latitude: 12.0214,
    longitude: 8.5333,
    isManualAddress: false,
    isDefault: true,
  },
  {
    id: "baddr-007",
    buyerId: "buyer-kaduna-grocers",
    addressLine: "2 Ahmadu Bello Way",
    city: "Kaduna",
    state: "Kaduna",
    landmark: "Near Independence Way",
    latitude: 10.5105,
    longitude: 7.4388,
    isManualAddress: false,
    isDefault: true,
  },
];

export type MarketplaceOrderItem = {
  productId: number;
  variantId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type DeliveryAddressSnapshot = {
  id: string;
  addressLine: string;
  displayName: string;
  fullAddress: string;
  city: string;
  state: string;
  landmark?: string;
  latitude: number | null;
  longitude: number | null;
  isManualAddress: boolean;
  isAdminAssisted: boolean;
  createdByRole: 'buyer' | 'admin';
};

const addressSnapshotById = (addressId: string): DeliveryAddressSnapshot => {
  const address = buyerAddresses.find((entry) => entry.id === addressId);
  if (!address) {
    return {
      id: addressId,
      addressLine: 'Unknown address',
      displayName: 'Unknown address',
      fullAddress: 'Unknown address',
      city: '',
      state: '',
      landmark: '',
      latitude: null,
      longitude: null,
      isManualAddress: true,
      isAdminAssisted: true,
      createdByRole: 'admin',
    };
  }
  return {
    id: address.id,
    addressLine: address.addressLine,
    displayName: address.displayName ?? address.addressLine,
    fullAddress: address.fullAddress ?? `${address.addressLine}, ${address.city}, ${address.state}`,
    city: address.city,
    state: address.state,
    landmark: address.landmark ?? '',
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isManualAddress: address.isManualAddress ?? false,
    isAdminAssisted: address.isAdminAssisted ?? false,
    createdByRole: (address.createdByRole ?? 'buyer') as 'buyer' | 'admin',
  };
};

export type MarketplaceSellerOrderGroup = {
  id: string;
  sellerId: string;  sellerName: string;
  farmName: string;
  buyerId: string;
  status: OrderStatus;
  items: MarketplaceOrderItem[];
  productSubtotal: number;
  shippingQuote: {
    deliveryRegion: string;
    totalChargeableWeightKg: number;
    shippingUnits: number;
    locationRate: number;
    shippingFee: number;
  };
  shippingFee: number;
  discountTotal: number;
  groupTotal: number;
  orderDate: string;
  deliveryDate: string;
  deliveryAddressId: string;
};

export type MarketplaceOrder = {
  id: string;
  buyerId: string;
  paymentReference: string;
  productSubtotal: number;
  totalShippingFee: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: string;
  sellerGroups: MarketplaceSellerOrderGroup[];
};

export const marketplaceOrders: MarketplaceOrder[] = [
  {
    id: "ORD-001",
    buyerId: "buyer-fresh-market",
    paymentReference: "PSK-20240520-001",
    productSubtotal: 6750000,
    totalShippingFee: 1250000,
    discountTotal: 0,
    grandTotal: 8000000,
    createdAt: "2024-05-20",
    sellerGroups: [
      {
        id: "ORD-001-G1",
        sellerId: "seller-kingsley",        sellerName: "Kingsley Joseph",
        farmName: "Kingsley Family Farm",
        buyerId: "buyer-fresh-market",
        status: "completed",
        items: [
          { productId: 1, variantId: "1-2", productName: "Basmati Rice - Premium Grade", unit: "Bulk 5kg", quantity: 50, price: 135000, lineTotal: 6750000 },
        ],
        productSubtotal: 6750000,
        shippingQuote: { deliveryRegion: "Outside Abuja", totalChargeableWeightKg: 1250, shippingUnits: 125, locationRate: 10000, shippingFee: 1250000 },
        shippingFee: 1250000,
        discountTotal: 0,
        groupTotal: 8000000,
        orderDate: "2024-05-20",
        deliveryDate: "2024-05-22",
        deliveryAddressId: "baddr-001",
      },
    ],
  },
  {
    id: "ORD-002",
    buyerId: "buyer-green-valley",
    paymentReference: "PSK-20240523-002",
    productSubtotal: 440000,
    totalShippingFee: 1800000,
    discountTotal: 0,
    grandTotal: 2240000,
    createdAt: "2024-05-23",
    sellerGroups: [
      {
        id: "ORD-002-G1",
        sellerId: "seller-kingsley",        sellerName: "Kingsley Joseph",
        farmName: "Kingsley Family Farm",
        buyerId: "buyer-green-valley",
        status: "in_transit",
        items: [
          { productId: 3, variantId: "3-1", productName: "Fresh Tomatoes", unit: "Regular 1kg", quantity: 200, price: 2200, lineTotal: 440000 },
        ],
        productSubtotal: 440000,
        shippingQuote: { deliveryRegion: "Abuja / FCT", totalChargeableWeightKg: 3600, shippingUnits: 360, locationRate: 5000, shippingFee: 1800000 },
        shippingFee: 1800000,
        discountTotal: 0,
        groupTotal: 2240000,
        orderDate: "2024-05-23",
        deliveryDate: "2024-05-25",
        deliveryAddressId: "baddr-002",
      },
    ],
  },
  {
    id: "ORD-003",
    buyerId: "buyer-dairy-dist",
    paymentReference: "PSK-20240524-003",
    productSubtotal: 1050000,
    totalShippingFee: 330000,
    discountTotal: 0,
    grandTotal: 1380000,
    createdAt: "2024-05-24",
    sellerGroups: [
      {
        id: "ORD-003-G1",
        sellerId: "seller-kingsley",        sellerName: "Kingsley Joseph",
        farmName: "Kingsley Family Farm",
        buyerId: "buyer-dairy-dist",
        status: "pending",
        items: [
          { productId: 4, variantId: "4-2", productName: "Milk - Full Cream", unit: "1L", quantity: 300, price: 3500, lineTotal: 1050000 },
        ],
        productSubtotal: 1050000,
        shippingQuote: { deliveryRegion: "Outside Abuja", totalChargeableWeightKg: 330, shippingUnits: 33, locationRate: 10000, shippingFee: 330000 },
        shippingFee: 330000,
        discountTotal: 0,
        groupTotal: 1380000,
        orderDate: "2024-05-24",
        deliveryDate: "2024-05-26",
        deliveryAddressId: "baddr-003",
      },
    ],
  },
  {
    id: "ORD-004",
    buyerId: "buyer-grain-export",
    paymentReference: "PSK-20240525-004",
    productSubtotal: 17500000,
    totalShippingFee: 20000000,
    discountTotal: 0,
    grandTotal: 37500000,
    createdAt: "2024-05-25",
    sellerGroups: [
      {
        id: "ORD-004-G1",
        sellerId: "seller-kingsley",        sellerName: "Kingsley Joseph",
        farmName: "Kingsley Family Farm",
        buyerId: "buyer-grain-export",
        status: "pending",
        items: [
          { productId: 2, variantId: "2-1", productName: "Organic Wheat", unit: "Standard 1kg", quantity: 1000, price: 17500, lineTotal: 17500000 },
        ],
        productSubtotal: 17500000,
        shippingQuote: { deliveryRegion: "Outside Abuja", totalChargeableWeightKg: 20000, shippingUnits: 2000, locationRate: 10000, shippingFee: 20000000 },
        shippingFee: 20000000,
        discountTotal: 0,
        groupTotal: 37500000,
        orderDate: "2024-05-25",
        deliveryDate: "2024-05-28",
        deliveryAddressId: "baddr-004",
      },
    ],
  },
  {
    id: "AMN-ORD-001",
    buyerId: "buyer-north-coop",
    paymentReference: "PSK-20240518-005",
    productSubtotal: 577500,
    totalShippingFee: 530000,
    discountTotal: 0,
    grandTotal: 1107500,
    createdAt: "2024-05-18",
    sellerGroups: [
      {
        id: "AMN-ORD-001-G1",
        sellerId: "seller-amina",        sellerName: "Amina Bello",
        farmName: "Bello Fresh Produce",
        buyerId: "buyer-north-coop",
        status: "completed",
        items: [
          { productId: 101, variantId: "101-2", productName: "Sweet Corn", unit: "Crate 15kg", quantity: 35, price: 16500, lineTotal: 577500 },
        ],
        productSubtotal: 577500,
        shippingQuote: { deliveryRegion: "Outside Abuja", totalChargeableWeightKg: 525, shippingUnits: 53, locationRate: 10000, shippingFee: 530000 },
        shippingFee: 530000,
        discountTotal: 0,
        groupTotal: 1107500,
        orderDate: "2024-05-18",
        deliveryDate: "2024-05-21",
        deliveryAddressId: "baddr-005",
      },
    ],
  },
  {
    id: "AMN-ORD-002",
    buyerId: "buyer-kano-fresh",
    paymentReference: "PSK-20240523-006",
    productSubtotal: 492000,
    totalShippingFee: 140000,
    discountTotal: 0,
    grandTotal: 632000,
    createdAt: "2024-05-23",
    sellerGroups: [
      {
        id: "AMN-ORD-002-G1",
        sellerId: "seller-amina",        sellerName: "Amina Bello",
        farmName: "Bello Fresh Produce",
        buyerId: "buyer-kano-fresh",
        status: "in_transit",
        items: [
          { productId: 102, variantId: "102-2", productName: "Free Range Eggs", unit: "Full crate", quantity: 60, price: 8200, lineTotal: 492000 },
        ],
        productSubtotal: 492000,
        shippingQuote: { deliveryRegion: "Outside Abuja", totalChargeableWeightKg: 132, shippingUnits: 14, locationRate: 10000, shippingFee: 140000 },
        shippingFee: 140000,
        discountTotal: 0,
        groupTotal: 632000,
        orderDate: "2024-05-23",
        deliveryDate: "2024-05-26",
        deliveryAddressId: "baddr-006",
      },
    ],
  },
  {
    id: "AMN-ORD-003",
    buyerId: "buyer-kaduna-grocers",
    paymentReference: "PSK-20240525-007",
    productSubtotal: 216000,
    totalShippingFee: 1200000,
    discountTotal: 0,
    grandTotal: 1416000,
    createdAt: "2024-05-25",
    sellerGroups: [
      {
        id: "AMN-ORD-003-G1",
        sellerId: "seller-amina",        sellerName: "Amina Bello",
        farmName: "Bello Fresh Produce",
        buyerId: "buyer-kaduna-grocers",
        status: "pending",
        items: [
          { productId: 103, variantId: null, productName: "Red Bell Pepper", unit: "kg", quantity: 120, price: 1800, lineTotal: 216000 },
        ],
        productSubtotal: 216000,
        shippingQuote: { deliveryRegion: "Outside Abuja", totalChargeableWeightKg: 1200, shippingUnits: 120, locationRate: 10000, shippingFee: 1200000 },
        shippingFee: 1200000,
        discountTotal: 0,
        groupTotal: 1416000,
        orderDate: "2024-05-25",
        deliveryDate: "2024-05-28",
        deliveryAddressId: "baddr-007",
      },
    ],
  },
];

export const orders = marketplaceOrders.flatMap((order) =>
  order.sellerGroups.map((group) => ({
    id: order.id,
    parentOrderId: order.id,
    sellerGroupId: group.id,
    sellerId: group.sellerId,    buyerId: order.buyerId,
    productId: group.items[0]?.productId,
    variantId: group.items[0]?.variantId ?? null,
    productName: group.items[0]?.productName ?? "Mixed order",
    quantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
    unit: group.items[0]?.unit ?? "unit",
    price: group.items[0]?.price ?? 0,
    totalAmount: group.groupTotal,
    productSubtotal: group.productSubtotal,
    shippingFee: group.shippingFee,
    discountTotal: group.discountTotal,
    status: group.status,
    orderDate: group.orderDate,
    deliveryDate: group.deliveryDate,
    shippingQuote: group.shippingQuote,
    deliveryAddressId: group.deliveryAddressId,
  })),
);

export const buyers = buyerData.map((buyer) => {
  const buyerOrders = getOrdersByBuyer(buyer.id);
  return {
    ...buyer,
    addresses: buyerAddresses.filter((address) => address.buyerId === buyer.id),
    totalPurchases: buyerOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    ),
    orderCount: buyerOrders.length,
  };
});

export const farmers = sellers.map((seller) => {
  const sellerOrders = getOrdersBySeller(seller.id);
  return {
    id: seller.id,
    name: seller.name,
    email: seller.email,
    phone: seller.phone,
    location: seller.location,
    farmName: seller.farmName,
    totalSales: sellerOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    ordersCompleted: sellerOrders.filter(
      (order) => order.status === "completed",
    ).length,
    products: products
      .filter((product) => product.sellerId === seller.id)
      .map((product) => product.name),
    joinDate: seller.joinDate,
    isActive: seller.isActive,
    wallet: seller.wallet,
  };
});

export const listings = products.map((product) => ({
  id: `LIST-${product.id}`,
  sellerId: product.sellerId,  productId: product.id,
  productName: product.name,
  quantity: product.inventory,
  unit: product.variants[0]?.name || "unit",
  pricePerUnit: product.price,
  category: product.category,
  categorySlug: categorySlugFromLabel(product.category),
  description: `${product.name} listed by ${sellers.find((seller) => seller.id === product.sellerId)?.farmName}`,
  status: product.status,
}));

export const buyerProducts = orders.map((order) => {
  const product = products.find((item) => item.id === order.productId);
  return {
    buyerId: order.buyerId,    productId: order.productId,
    name: order.productName,
    category: product?.category || "Uncategorized",
    categorySlug: product ? categorySlugFromLabel(product.category) : "uncategorized",
    price: order.price,
    variants: product?.variants.length
      ? product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
        }))
      : [
          {
            id: `${order.productId}-default`,
            name: order.unit,
            price: order.price,
          },
        ],
  };
});

type ConversationParticipantType = "buyer" | "seller" | "admin" | "support";

type ConversationMessage = {
  id: string;
  conversationId: string;
  orderId?: string;
  senderId: string;
  senderName: string;
  senderType: ConversationParticipantType;
  recipientId: string;
  recipientName: string;
  recipientType: ConversationParticipantType;
  message: string;
  timestamp: string;
  read: boolean;
};

type MessageConversation = {
  id: string;
  channelType: "buyer-seller" | "admin-buyer" | "admin-seller";
  participantType: "buyer" | "seller";
  participantId: string;
  participantName: string;
  participantSecondaryId: string;
  participantSecondaryName: string;
  messages: ConversationMessage[];
};

export const messageConversations: MessageConversation[] = [
  {
    id: "conv-buyer-fresh-market-seller-kingsley",
    channelType: "buyer-seller",
    participantType: "buyer",
    participantId: "buyer-fresh-market",
    participantName: "Fresh Market Wholesale",
    participantSecondaryId: "seller-kingsley",
    participantSecondaryName: "Kingsley Joseph",
    messages: [
      {
        id: "MSG-001",
        conversationId: "conv-buyer-fresh-market-seller-kingsley",
        orderId: "ORD-001",
        senderId: "buyer-fresh-market",
        senderName: "Fresh Market Wholesale",
        senderType: "buyer",
        recipientId: "seller-kingsley",
        recipientName: "Kingsley Joseph",
        recipientType: "seller",
        message: "We received the basmati rice shipment. Quality is excellent.",
        timestamp: "2024-05-22 10:30",
        read: true,
      },
    ],
  },
  {
    id: "conv-buyer-green-valley-seller-kingsley",
    channelType: "buyer-seller",
    participantType: "buyer",
    participantId: "buyer-green-valley",
    participantName: "Green Valley Supermarket",
    participantSecondaryId: "seller-kingsley",
    participantSecondaryName: "Kingsley Joseph",
    messages: [
      {
        id: "MSG-002",
        conversationId: "conv-buyer-green-valley-seller-kingsley",
        orderId: "ORD-002",
        senderId: "buyer-green-valley",
        senderName: "Green Valley Supermarket",
        senderType: "buyer",
        recipientId: "seller-kingsley",
        recipientName: "Kingsley Joseph",
        recipientType: "seller",
        message:
          "Can you provide 300kg of premium tomatoes for our festival promotion?",
        timestamp: "2024-05-24 11:15",
        read: false,
      },
    ],
  },
  {
    id: "conv-buyer-dairy-dist-seller-kingsley",
    channelType: "buyer-seller",
    participantType: "buyer",
    participantId: "buyer-dairy-dist",
    participantName: "Dairy Distribution Ltd",
    participantSecondaryId: "seller-kingsley",
    participantSecondaryName: "Kingsley Joseph",
    messages: [
      {
        id: "MSG-003",
        conversationId: "conv-buyer-dairy-dist-seller-kingsley",
        orderId: "ORD-003",
        senderId: "buyer-dairy-dist",
        senderName: "Dairy Distribution Ltd",
        senderType: "buyer",
        recipientId: "seller-kingsley",
        recipientName: "Kingsley Joseph",
        recipientType: "seller",
        message: "We are interested in a long-term milk supply contract.",
        timestamp: "2024-05-23 14:20",
        read: true,
      },
    ],
  },
  {
    id: "conv-buyer-north-coop-seller-amina",
    channelType: "buyer-seller",
    participantType: "buyer",
    participantId: "buyer-north-coop",
    participantName: "North Market Cooperative",
    participantSecondaryId: "seller-amina",
    participantSecondaryName: "Amina Bello",
    messages: [
      {
        id: "MSG-004",
        conversationId: "conv-buyer-north-coop-seller-amina",
        orderId: "AMN-ORD-001",
        senderId: "buyer-north-coop",
        senderName: "North Market Cooperative",
        senderType: "buyer",
        recipientId: "seller-amina",
        recipientName: "Amina Bello",
        recipientType: "seller",
        message: "We need another 50 crates of sweet corn next week.",
        timestamp: "2024-05-24 09:45",
        read: false,
      },
    ],
  },
  {
    id: "conv-buyer-kano-fresh-seller-amina",
    channelType: "buyer-seller",
    participantType: "buyer",
    participantId: "buyer-kano-fresh",
    participantName: "Kano Fresh Foods",
    participantSecondaryId: "seller-amina",
    participantSecondaryName: "Amina Bello",
    messages: [
      {
        id: "MSG-005",
        conversationId: "conv-buyer-kano-fresh-seller-amina",
        orderId: "AMN-ORD-002",
        senderId: "buyer-kano-fresh",
        senderName: "Kano Fresh Foods",
        senderType: "buyer",
        recipientId: "seller-amina",
        recipientName: "Amina Bello",
        recipientType: "seller",
        message: "Please confirm the ETA for AMN-ORD-002.",
        timestamp: "2024-05-25 16:30",
        read: false,
      },
    ],
  },
];

export const messages = messageConversations.flatMap((conversation) =>
  conversation.messages,
);

export const payouts = [
  {
    id: "PAYOUT-001",
    sellerId: "seller-kingsley",    farmerName: "Kingsley Joseph",
    amount: 3500000,
    status: "completed" as PayoutStatus,
    date: "2024-05-18",
    method: "Bank Transfer",
    bankName: "Guaranty Trust Bank",
    orderIds: ["ORD-001"],
    walletBalanceAfter: 2850000,
  },
  {
    id: "PAYOUT-002",
    sellerId: "seller-kingsley",    farmerName: "Kingsley Joseph",
    amount: 2850000,
    status: "in_progress" as PayoutStatus,
    date: "2024-05-19",
    method: "Bank Transfer",
    bankName: "Guaranty Trust Bank",
    orderIds: ["ORD-002", "ORD-003"],
    walletBalanceAfter: 450000,
  },
  {
    id: "PAYOUT-003",
    sellerId: "seller-kingsley",    farmerName: "Kingsley Joseph",
    amount: 1500000,
    status: "pending" as PayoutStatus,
    date: "2024-05-22",
    method: "Bank Transfer",
    bankName: "Guaranty Trust Bank",
    orderIds: ["ORD-004"],
    walletBalanceAfter: 2850000,
  },
  {
    id: "AMN-PAYOUT-001",
    sellerId: "seller-amina",    farmerName: "Amina Bello",
    amount: 900000,
    status: "completed" as PayoutStatus,
    date: "2024-05-19",
    method: "Bank Transfer",
    bankName: "Zenith Bank",
    orderIds: ["AMN-ORD-001"],
    walletBalanceAfter: 1740000,
  },
  {
    id: "AMN-PAYOUT-002",
    sellerId: "seller-amina",    farmerName: "Amina Bello",
    amount: 650000,
    status: "pending" as PayoutStatus,
    date: "2024-05-25",
    method: "Bank Transfer",
    bankName: "Zenith Bank",
    orderIds: ["AMN-ORD-002", "AMN-ORD-003"],
    walletBalanceAfter: 1740000,
  },
];

const monthlyGrossRevenue = [
  { month: "Jan", revenue: 72300000 },
  { month: "Feb", revenue: 81000000 },
  { month: "Mar", revenue: 91000000 },
  { month: "Apr", revenue: 107100000 },
  { month: "May", revenue: 137300000 },
  { month: "Jun", revenue: 178700000 },
];

export const analytics = {
  totalFarmers: farmers.length,
  totalBuyers: buyers.length,
  totalOrders: orders.length,
  totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
  completedOrders: orders.filter((order) => order.status === "completed")
    .length,
  pendingOrders: orders.filter((order) => order.status === "pending").length,
  monthlyRevenue: monthlyGrossRevenue,
  productDistribution: Object.entries(
    products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value })),
  topFarmers: farmers
    .slice()
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 3),
  topBuyers: buyers
    .slice()
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 3),
  sellerWallets: sellers.map((seller) => ({
    sellerId: seller.id,
    sellerName: seller.name,
    availableBalance: seller.wallet.availableBalance,
    pendingBalance: seller.wallet.pendingBalance,
    totalWithdrawn: seller.wallet.totalWithdrawn,
    totalEarnings: seller.wallet.totalEarnings,
  })),
};

export const auditLogs = [
  {
    id: "AUD-001",
    action: "Payout Approved",
    severity: "success",
    admin: "admin@agritec.com",
    target: "PAYOUT-002",
    targetId: "PAYOUT-002",
    targetType: "payout",
    actorId: "admin-super-1",
    sellerId: "seller-kingsley",
    timestamp: "2024-05-20 10:30",
    details:
      "Kingsley Joseph payout request approved and sent to Paystack processing",
  },
  {
    id: "AUD-002",
    action: "Seller Moderation Review",
    severity: "info",
    admin: "admin@agritec.com",
    target: "seller-amina",
    targetId: "seller-amina",
    targetType: "seller",
    actorId: "admin-super-1",
    sellerId: "seller-amina",
    timestamp: "2024-05-19 14:15",
    details:
      "Reviewed Bello Fresh Produce shipping coverage after buyer complaint",
  },
  {
    id: "AUD-003",
    action: "Buyer Message Flagged",
    severity: "warning",
    admin: "admin@agritec.com",
    target: "MSG-002",
    targetId: "MSG-002",
    relatedConversationId: "conv-buyer-green-valley-seller-kingsley",
    targetType: "message",
    actorId: "admin-support-2",
    buyerId: "buyer-green-valley",
    sellerId: "seller-kingsley",
    timestamp: "2024-05-18 09:00",
    details: "Message flagged for moderation and left visible after review",
  },
  {
    id: "AUD-004",
    action: "Settings Updated",
    severity: "info",
    admin: "admin@agritec.com",
    target: "Platform Config",
    targetId: "platform-settings",
    targetType: "settings",
    actorId: "admin-super-1",
    timestamp: "2024-05-17 16:45",
    details: "Commission rate updated to 10%",
  },
  {
    id: "AUD-005",
    action: "Buyer Reactivated",
    severity: "success",
    admin: "admin@agritec.com",
    target: "buyer-kaduna-grocers",
    targetId: "buyer-kaduna-grocers",
    targetType: "buyer",
    actorId: "admin-support-2",
    buyerId: "buyer-kaduna-grocers",
    timestamp: "2024-05-16 11:20",
    details: "Kaduna Grocers account reactivated after verification",
  },
];

export const notifications = [
  {
    id: "NOTIF-001",
    type: "message",
    title: "New Seller Message",
    message: "Green Valley Supermarket replied to Kingsley Joseph",
    timestamp: "2024-05-24 11:15",
    read: false,
    relatedUserId: "seller-kingsley",
    relatedOrderId: "ORD-002",
    relatedConversationId: "conv-buyer-green-valley-seller-kingsley",
    targetType: "message",
    targetId: "MSG-002",
  },
  {
    id: "NOTIF-002",
    type: "payout",
    title: "Withdrawal Request",
    message: "Kingsley Joseph requested payout of 1,500,000 NGN",
    timestamp: "2024-05-22 14:15",
    read: false,
    relatedUserId: "seller-kingsley",
    relatedPayoutId: "PAYOUT-003",
    targetType: "payout",
    targetId: "PAYOUT-003",
  },
  {
    id: "NOTIF-003",
    type: "payout",
    title: "Withdrawal Request",
    message: "Amina Bello requested payout of 650,000 NGN",
    timestamp: "2024-05-25 09:00",
    read: false,
    relatedUserId: "seller-amina",
    relatedPayoutId: "AMN-PAYOUT-002",
    targetType: "payout",
    targetId: "AMN-PAYOUT-002",
  },
  {
    id: "NOTIF-004",
    type: "audit",
    title: "Audit Trail",
    message: "Settings updated by admin@agritec.com",
    timestamp: "2024-05-17 16:45",
    read: true,
    targetType: "audit",
    targetId: "AUD-004",
  },
  {
    id: "NOTIF-005",
    type: "payment",
    title: "Payment Completed",
    message: "Paystack confirmed PAYOUT-001 transfer completion",
    timestamp: "2024-05-18 00:30",
    read: true,
    relatedUserId: "seller-kingsley",
    relatedPayoutId: "PAYOUT-001",
    targetType: "payout",
    targetId: "PAYOUT-001",
  },
];

function getOrdersBySeller(sellerId: string) {
  return orders.filter((order) => order.sellerId === sellerId);
}

function getOrdersByBuyer(buyerId: string) {
  return orders.filter((order) => order.buyerId === buyerId);
}














