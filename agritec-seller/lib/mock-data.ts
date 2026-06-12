// Mock data for AgriTec Farmer Dashboard

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
  "PIECE",
  "KG",
  "BAG",
  "BASKET",
  "CRATE",
  "BOX",
  "BUNDLE",
  "TRAY",
  "PACK",
  "LITRE",
  "ANIMAL",
  "OTHER",
] as const;

export const packageTypes = [
  "PIECE",
  "BAG",
  "BASKET",
  "CRATE",
  "BOX",
  "BUNDLE",
  "LIVE_ANIMAL",
  "OTHER",
] as const;

export const platformShippingSettings = {
  abujaMinimumFee: 2500,
  abujaAdditionalUnitFee: 2500,
  outsideMinimumFee: 5000,
  outsideAdditionalUnitFee: 5000,
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

export const hasCompleteDimensions = (logistics: ProductLogistics) =>
  [logistics.unitLengthCm, logistics.unitWidthCm, logistics.unitHeightCm].every(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );

export const volumetricWeightKg = (logistics: ProductLogistics) => {
  if (!hasCompleteDimensions(logistics)) return null;
  return (
    ((logistics.unitLengthCm as number) *
      (logistics.unitWidthCm as number) *
      (logistics.unitHeightCm as number)) /
    platformShippingSettings.volumetricDivisor
  );
};

export const unitChargeableWeightKg = (logistics: ProductLogistics) => {
  const volumetricWeight = volumetricWeightKg(logistics);
  if (volumetricWeight == null || !Number.isFinite(volumetricWeight) || volumetricWeight <= 0) {
    return logistics.unitWeightKg;
  }
  return Math.max(logistics.unitWeightKg, volumetricWeight);
};

export const mockTestimonials = [
  {
    id: 1,
    sellerId: "seller-kingsley",
    name: "Adeyemi Okafor",
    role: "Cassava Farmer",
    location: "Oyo State, Nigeria",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    quote: "AgriTec has transformed my farming operations. The real-time monitoring and market insights helped me increase yield by 35% and sell directly to buyers.",
    rating: 5,
  },
  {
    id: 2,
    sellerId: "seller-amina",
    name: "Chioma Nwankwo",
    role: "Vegetable Producer",
    location: "Lagos State, Nigeria",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    quote: "The marketplace feature connected me directly with wholesalers and retailers. I eliminated middlemen and increased my margins by 40%.",
    rating: 5,
  },
  {
    id: 3,
    sellerId: "seller-kingsley",
    name: "Amos Adebayo",
    role: "Poultry Farmer",
    location: "Kaduna State, Nigeria",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    quote: "The weather alerts and farm management tools are incredibly accurate. It's like having an agricultural expert in my pocket helping me grow.",
    rating: 5,
  },
  {
    id: 4,
    sellerId: "seller-amina",
    name: "Zainab Ibrahim",
    role: "Dairy Farmer",
    location: "Plateau State, Nigeria",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    quote: "Production tracking is effortless now. I can monitor milk quality and delivery schedules from anywhere. Essential tool for growing my dairy business.",
    rating: 5,
  },
];

export const mockProducts = [
  {
    id: 1,
    sellerId: "seller-kingsley",
    name: "Basmati Rice - Premium Grade",
    category: "Grains & Cereals",
    categorySlug: "grains-cereals",
    price: 28500,
    inventory: 250,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1586190251793-378ec6acda75?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1603073163233-9696f59cd8be?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1548695867-641b6f70a77f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop",
    ],
    variants: [
      { id: "1-1", name: "Premium 1kg", price: 28500, inventory: 120 },
      { id: "1-2", name: "Bulk 5kg", price: 135000, inventory: 80 },
      { id: "1-3", name: "Commercial 20kg", price: 520000, inventory: 50 },
    ],
    dateAdded: new Date("2024-05-15"),
  },
  {
    id: 2,
    sellerId: "seller-kingsley",
    name: "Organic Wheat",
    category: "Grains & Cereals",
    categorySlug: "grains-cereals",
    price: 17500,
    inventory: 180,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1618888007540-2bcfc17241fd?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1599599810694-d3003ca4b974?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1626082927389-6cd097cda687?w=400&h=300&fit=crop",
    ],
    variants: [
      { id: "2-1", name: "Standard 1kg", price: 17500, inventory: 100 },
      { id: "2-2", name: "Family 10kg", price: 160000, inventory: 80 },
    ],
    dateAdded: new Date("2024-05-10"),
  },
  {
    id: 3,
    sellerId: "seller-kingsley",
    name: "Fresh Tomatoes",
    category: "Vegetables",
    categorySlug: "vegetables",
    price: 2200,
    inventory: 8,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1592924357228-91ec8127936f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1571407118258-4d34d75b5b38?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1577003833154-a92bbd4d6d7d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1523677071509-39a1f5c59d3c?w=400&h=300&fit=crop",
    ],
    variants: [
      { id: "3-1", name: "Regular 1kg", price: 2200, inventory: 5 },
      { id: "3-2", name: "Premium 1kg", price: 2800, inventory: 3 },
    ],
    dateAdded: new Date("2024-05-20"),
  },
  {
    id: 4,
    sellerId: "seller-kingsley",
    name: "Milk - Full Cream",
    category: "Dairy",
    categorySlug: "dairy",
    price: 3500,
    inventory: 320,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1608270861620-7c40ca6fb718?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1523677571669-ba0c46d3cc0d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1517693712202-14dd9538aa97?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554995618-83f09137aa1d?w=400&h=300&fit=crop",
    ],
    variants: [
      { id: "4-1", name: "500ml", price: 1750, inventory: 100 },
      { id: "4-2", name: "1L", price: 3500, inventory: 150 },
      { id: "4-3", name: "2L", price: 6500, inventory: 70 },
    ],
    dateAdded: new Date("2024-05-18"),
  },
  {
    id: 5,
    sellerId: "seller-kingsley",
    name: "Plantain",
    category: "Vegetables",
    categorySlug: "vegetables",
    price: 850,
    inventory: 450,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1571407118258-4d34d75b5b38?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1577003833154-a92bbd4d6d7d?w=400&h=300&fit=crop",
    ],
    variants: undefined,
    dateAdded: new Date("2024-05-19"),
  },
  {
    id: 6,
    sellerId: "seller-kingsley",
    name: "Yam",
    category: "Vegetables",
    categorySlug: "vegetables",
    price: 2500,
    inventory: 9,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1511621776919-a1aae19e8ff5?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop",
    ],
    variants: undefined,
    dateAdded: new Date("2024-05-21"),
  },
  {
    id: 7,
    sellerId: "seller-kingsley",
    name: "Honey",
    category: "Other",
    categorySlug: "other",
    categoryNote: "Natural Sweeteners",
    price: 5500,
    inventory: 85,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1587049352861-d64a4ec2a1ea?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop",
    ],
    variants: undefined,
    dateAdded: new Date("2024-05-16"),
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

export type MarketplaceSellerOrderGroup = {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  status: "Pending" | "Processing" | "In Transit" | "Delivered";
  items: MarketplaceOrderItem[];
  productSubtotal: number;
  shippingFee: number;
  discountTotal: number;
  groupTotal: number;
  date: Date;
  deliveryDate: Date;
};

export type MarketplaceOrder = {
  id: string;
  buyerId: string;
  buyerName: string;
  paymentReference: string;
  productSubtotal: number;
  totalShippingFee: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: Date;
  sellerGroups: MarketplaceSellerOrderGroup[];
};

export const mockMarketplaceOrders: MarketplaceOrder[] = [
  {
    id: "ORD-001",
    buyerId: "buyer-fresh-market",
    buyerName: "Fresh Market Wholesale",
    paymentReference: "PSK-20240520-001",
    productSubtotal: 6750000,
    totalShippingFee: 1250000,
    discountTotal: 0,
    grandTotal: 8000000,
    createdAt: new Date("2024-05-20"),
    sellerGroups: [
      {
        id: "ORD-001-G1",
        sellerId: "seller-kingsley",
        buyerId: "buyer-fresh-market",
        buyerName: "Fresh Market Wholesale",
        status: "Delivered",
        items: [
          { productId: 1, variantId: "1-2", productName: "Basmati Rice - Premium Grade", unit: "Bulk 5kg", quantity: 50, price: 135000, lineTotal: 6750000 },
        ],
        productSubtotal: 6750000,
        shippingFee: 1250000,
        discountTotal: 0,
        groupTotal: 8000000,
        date: new Date("2024-05-20"),
        deliveryDate: new Date("2024-05-22"),
      },
    ],
  },
  {
    id: "ORD-002",
    buyerId: "buyer-green-valley",
    buyerName: "Green Valley Supermarket",
    paymentReference: "PSK-20240523-002",
    productSubtotal: 440000,
    totalShippingFee: 1800000,
    discountTotal: 0,
    grandTotal: 2240000,
    createdAt: new Date("2024-05-23"),
    sellerGroups: [
      {
        id: "ORD-002-G1",
        sellerId: "seller-kingsley",
        buyerId: "buyer-green-valley",
        buyerName: "Green Valley Supermarket",
        status: "In Transit",
        items: [
          { productId: 3, variantId: "3-1", productName: "Fresh Tomatoes", unit: "Regular 1kg", quantity: 200, price: 2200, lineTotal: 440000 },
        ],
        productSubtotal: 440000,
        shippingFee: 1800000,
        discountTotal: 0,
        groupTotal: 2240000,
        date: new Date("2024-05-23"),
        deliveryDate: new Date("2024-05-25"),
      },
    ],
  },
  {
    id: "ORD-003",
    buyerId: "buyer-dairy-dist",
    buyerName: "Dairy Distribution Ltd",
    paymentReference: "PSK-20240524-003",
    productSubtotal: 1050000,
    totalShippingFee: 330000,
    discountTotal: 0,
    grandTotal: 1380000,
    createdAt: new Date("2024-05-24"),
    sellerGroups: [
      {
        id: "ORD-003-G1",
        sellerId: "seller-kingsley",
        buyerId: "buyer-dairy-dist",
        buyerName: "Dairy Distribution Ltd",
        status: "Processing",
        items: [
          { productId: 4, variantId: "4-2", productName: "Milk - Full Cream", unit: "1L", quantity: 300, price: 3500, lineTotal: 1050000 },
        ],
        productSubtotal: 1050000,
        shippingFee: 330000,
        discountTotal: 0,
        groupTotal: 1380000,
        date: new Date("2024-05-24"),
        deliveryDate: new Date("2024-05-26"),
      },
    ],
  },
  {
    id: "ORD-004",
    buyerId: "buyer-grain-export",
    buyerName: "Grain Export House",
    paymentReference: "PSK-20240525-004",
    productSubtotal: 17500000,
    totalShippingFee: 20000000,
    discountTotal: 0,
    grandTotal: 37500000,
    createdAt: new Date("2024-05-25"),
    sellerGroups: [
      {
        id: "ORD-004-G1",
        sellerId: "seller-kingsley",
        buyerId: "buyer-grain-export",
        buyerName: "Grain Export House",
        status: "Pending",
        items: [
          { productId: 2, variantId: "2-1", productName: "Organic Wheat", unit: "Standard 1kg", quantity: 1000, price: 17500, lineTotal: 17500000 },
        ],
        productSubtotal: 17500000,
        shippingFee: 20000000,
        discountTotal: 0,
        groupTotal: 37500000,
        date: new Date("2024-05-25"),
        deliveryDate: new Date("2024-05-28"),
      },
    ],
  },
  {
    id: "AMN-ORD-001",
    buyerId: "buyer-north-coop",
    buyerName: "North Market Cooperative",
    paymentReference: "PSK-20240518-005",
    productSubtotal: 577500,
    totalShippingFee: 530000,
    discountTotal: 0,
    grandTotal: 1107500,
    createdAt: new Date("2024-05-18"),
    sellerGroups: [
      {
        id: "AMN-ORD-001-G1",
        sellerId: "seller-amina",
        buyerId: "buyer-north-coop",
        buyerName: "North Market Cooperative",
        status: "Delivered",
        items: [
          { productId: 101, variantId: "101-2", productName: "Sweet Corn", unit: "Crate 15kg", quantity: 35, price: 16500, lineTotal: 577500 },
        ],
        productSubtotal: 577500,
        shippingFee: 530000,
        discountTotal: 0,
        groupTotal: 1107500,
        date: new Date("2024-05-18"),
        deliveryDate: new Date("2024-05-21"),
      },
    ],
  },
  {
    id: "AMN-ORD-002",
    buyerId: "buyer-kano-fresh",
    buyerName: "Kano Fresh Foods",
    paymentReference: "PSK-20240523-006",
    productSubtotal: 492000,
    totalShippingFee: 140000,
    discountTotal: 0,
    grandTotal: 632000,
    createdAt: new Date("2024-05-23"),
    sellerGroups: [
      {
        id: "AMN-ORD-002-G1",
        sellerId: "seller-amina",
        buyerId: "buyer-kano-fresh",
        buyerName: "Kano Fresh Foods",
        status: "In Transit",
        items: [
          { productId: 102, variantId: "102-2", productName: "Free Range Eggs", unit: "Full crate", quantity: 60, price: 8200, lineTotal: 492000 },
        ],
        productSubtotal: 492000,
        shippingFee: 140000,
        discountTotal: 0,
        groupTotal: 632000,
        date: new Date("2024-05-23"),
        deliveryDate: new Date("2024-05-26"),
      },
    ],
  },
  {
    id: "AMN-ORD-003",
    buyerId: "buyer-kaduna-grocers",
    buyerName: "Kaduna Grocers",
    paymentReference: "PSK-20240525-007",
    productSubtotal: 216000,
    totalShippingFee: 1200000,
    discountTotal: 0,
    grandTotal: 1416000,
    createdAt: new Date("2024-05-25"),
    sellerGroups: [
      {
        id: "AMN-ORD-003-G1",
        sellerId: "seller-amina",
        buyerId: "buyer-kaduna-grocers",
        buyerName: "Kaduna Grocers",
        status: "Pending",
        items: [
          { productId: 103, variantId: null, productName: "Red Bell Pepper", unit: "kg", quantity: 120, price: 1800, lineTotal: 216000 },
        ],
        productSubtotal: 216000,
        shippingFee: 1200000,
        discountTotal: 0,
        groupTotal: 1416000,
        date: new Date("2024-05-25"),
        deliveryDate: new Date("2024-05-28"),
      },
    ],
  },
];

export const mockOrders = mockMarketplaceOrders.flatMap((order) =>
  order.sellerGroups.map((group) => ({
    id: order.id,
    parentOrderId: order.id,
    sellerGroupId: group.id,
    sellerId: group.sellerId,
    buyerId: order.buyerId,
    buyer: order.buyerName,
    product: group.items[0]?.productName ?? "Mixed order",
    variant: group.items[0]?.unit ?? "unit",
    quantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
    price: group.groupTotal,
    productSubtotal: group.productSubtotal,
    shippingFee: group.shippingFee,
    discountTotal: group.discountTotal,
    status: group.status,
    date: group.date,
    deliveryDate: group.deliveryDate,
    items: group.items,
  })),
);

const getSellerOrderGroups = (sellerId: string) =>
  mockOrders.filter((order) => order.sellerId === sellerId);

export const mockCustomers = [
  {
    id: 1,
    sellerId: "seller-kingsley",
    name: "Fresh Market Wholesale",
    location: "Lagos",
    totalOrders: 12,
    totalSpent: 53500000,
    lastOrder: new Date("2024-05-20"),
    email: "info@freshmarket.com.ng",
    phone: "+234 701 234 5678",
  },
  {
    id: 2,
    sellerId: "seller-kingsley",
    name: "Green Valley Supermarket",
    location: "Abuja",
    totalOrders: 8,
    totalSpent: 26400000,
    lastOrder: new Date("2024-05-23"),
    email: "info@greenvalley.com.ng",
    phone: "+234 805 987 6543",
  },
  {
    id: 3,
    sellerId: "seller-kingsley",
    name: "Dairy Distribution Ltd",
    location: "Port Harcourt",
    totalOrders: 5,
    totalSpent: 19500000,
    lastOrder: new Date("2024-05-24"),
    email: "sales@dairydist.com.ng",
    phone: "+234 702 345 6789",
  },
  {
    id: 4,
    sellerId: "seller-kingsley",
    name: "Grain Export House",
    location: "Kano",
    totalOrders: 3,
    totalSpent: 36500000,
    lastOrder: new Date("2024-05-25"),
    email: "export@grainhouse.com.ng",
    phone: "+234 809 456 7890",
  },
];

export const mockMessageConversations = [
  {
    id: "seller-conv-buyer-fresh-market",
    sellerId: "seller-kingsley",
    channelType: "buyer-seller",
    participantId: "buyer-fresh-market",
    participantName: "Fresh Market Wholesale",
    participantType: "buyer",
    relatedOrderId: "ORD-001",
    messages: [
      {
        id: 1,
        sellerId: "seller-kingsley",
        from: "Fresh Market Wholesale",
        subject: "Order ORD-001 Delivery Confirmation",
        message: "We have received the basmati rice shipment. Quality is excellent. Looking forward to future orders.",
        timestamp: new Date("2024-05-22"),
        read: true,
      },
    ],
  },
  {
    id: "seller-conv-buyer-green-valley",
    sellerId: "seller-kingsley",
    channelType: "buyer-seller",
    participantId: "buyer-green-valley",
    participantName: "Green Valley Supermarket",
    participantType: "buyer",
    relatedOrderId: "ORD-002",
    messages: [
      {
        id: 2,
        sellerId: "seller-kingsley",
        from: "Green Valley Supermarket",
        subject: "Special Request for Tomato Shipment",
        message: "Can you provide 300kg of premium tomatoes for our upcoming festival promotion?",
        timestamp: new Date("2024-05-24"),
        read: false,
      },
    ],
  },
  {
    id: "seller-conv-buyer-dairy-dist",
    sellerId: "seller-kingsley",
    channelType: "buyer-seller",
    participantId: "buyer-dairy-dist",
    participantName: "Dairy Distribution Ltd",
    participantType: "buyer",
    relatedOrderId: "ORD-003",
    messages: [
      {
        id: 3,
        sellerId: "seller-kingsley",
        from: "Dairy Distribution Ltd",
        subject: "Pricing for Bulk Milk Orders",
        message: "We are interested in a long-term contract. Can you provide a quote for 500L monthly deliveries?",
        timestamp: new Date("2024-05-23"),
        read: true,
      },
    ],
  },
  {
    id: "seller-conv-support",
    sellerId: "seller-kingsley",
    channelType: "seller-support",
    participantId: "admin-support",
    participantName: "AgriTec Support",
    participantType: "support",
    relatedOrderId: null,
    messages: [
      {
        id: 4,
        sellerId: "seller-kingsley",
        from: "AgriTec Support",
        subject: "Account Active",
        message: "Your seller account is active and ready for marketplace orders.",
        timestamp: new Date("2024-05-20"),
        read: true,
      },
    ],
  },
  {
    id: "seller-conv-buyer-north-coop",
    sellerId: "seller-amina",
    channelType: "buyer-seller",
    participantId: "buyer-north-coop",
    participantName: "North Market Cooperative",
    participantType: "buyer",
    relatedOrderId: "AMN-ORD-001",
    messages: [
      {
        id: 201,
        sellerId: "seller-amina",
        from: "North Market Cooperative",
        subject: "Sweet corn reorder",
        message: "We need another 50 crates of sweet corn next week.",
        timestamp: new Date("2024-05-24"),
        read: false,
      },
    ],
  },
  {
    id: "seller-conv-buyer-kano-fresh",
    sellerId: "seller-amina",
    channelType: "buyer-seller",
    participantId: "buyer-kano-fresh",
    participantName: "Kano Fresh Foods",
    participantType: "buyer",
    relatedOrderId: "AMN-ORD-002",
    messages: [
      {
        id: 202,
        sellerId: "seller-amina",
        from: "Kano Fresh Foods",
        subject: "Egg delivery update",
        message: "Please confirm the ETA for AMN-ORD-002.",
        timestamp: new Date("2024-05-25"),
        read: false,
      },
    ],
  },
];

export const mockMessages = mockMessageConversations
  .filter((conversation) => conversation.channelType === "buyer-seller")
  .flatMap((conversation) => conversation.messages);

export const mockNotifications = [
  {
    id: 1,
    sellerId: "seller-kingsley",
    type: "order",
    orderId: "ORD-001",
    targetType: "order",
    targetId: "ORD-001",
    title: "New Order Received",
    message: "Fresh Market Wholesale ordered 50 units (Bulk 5kg)",
    timestamp: new Date("2024-05-25T10:30:00"),
    read: false,
  },
  {
    id: 2,
    sellerId: "seller-kingsley",
    type: "product",
    productId: 3,
    targetType: "product",
    targetId: 3,
    title: "Low Stock Alert",
    message: "Fresh Tomatoes - 5 remaining",
    timestamp: new Date("2024-05-24T14:20:00"),
    read: false,
  },
  {
    id: 3,
    sellerId: "seller-kingsley",
    type: "order",
    orderId: "ORD-002",
    targetType: "order",
    targetId: "ORD-002",
    title: "Order Status Update",
    message: "Your order ORD-002 is now in transit",
    timestamp: new Date("2024-05-24T09:15:00"),
    read: true,
  },
  {
    id: 4,
    sellerId: "seller-kingsley",
    type: "product",
    productId: 1,
    targetType: "product",
    targetId: 1,
    title: "Low Stock Alert",
    message: "Basmati Rice - Premium Grade - 250 remaining",
    timestamp: new Date("2024-05-23T16:45:00"),
    read: true,
  },
];

export const mockWallet = {
  sellerId: "seller-kingsley",
  availableBalance: 2850000,
  pendingBalance: 450000,
  totalWithdrawn: 8500000,
  totalEarnings: 11800000,
  bankAccount: {
    name: "Guaranty Trust Bank",
    accountNumber: "1234567890",
    accountName: "Kingsley Family Farm",
    lastPayoutDate: new Date("2024-05-24"),
  },
  automaticPayoutsEnabled: true,
};

export const mockTransactions = [
  {
    id: "TXN-001",
    sellerId: "seller-kingsley",
    type: "Sale Credit",
    description: "Order ORD-001: Basmati Rice - 50 units (Bulk 5kg)",
    amount: 6750000,
    status: "Completed",
    date: new Date("2024-05-20"),
    buyer: "Fresh Market Wholesale",
  },
  {
    id: "TXN-002",
    sellerId: "seller-kingsley",
    type: "Commission Deduction",
    description: "Platform commission",
    amount: -135000,
    status: "Completed",
    date: new Date("2024-05-20"),
  },
  {
    id: "TXN-003",
    sellerId: "seller-kingsley",
    type: "Sale Credit",
    description: "Order ORD-002: Fresh Tomatoes - 200 units (Regular 1kg)",
    amount: 440000,
    status: "Completed",
    date: new Date("2024-05-23"),
    buyer: "Green Valley Supermarket",
  },
  {
    id: "TXN-004",
    sellerId: "seller-kingsley",
    type: "Commission Deduction",
    description: "Platform commission",
    amount: -8800,
    status: "Completed",
    date: new Date("2024-05-23"),
  },
  {
    id: "TXN-005",
    sellerId: "seller-kingsley",
    type: "Sale Credit",
    description: "Order ORD-003: Milk - Full Cream - 300 units (1L)",
    amount: 1050000,
    status: "Completed",
    date: new Date("2024-05-24"),
    buyer: "Dairy Distribution Ltd",
  },
  {
    id: "TXN-006",
    sellerId: "seller-kingsley",
    type: "Commission Deduction",
    description: "Platform commission",
    amount: -21000,
    status: "Completed",
    date: new Date("2024-05-24"),
  },
  {
    id: "TXN-007",
    sellerId: "seller-kingsley",
    type: "Withdrawal",
    description: "Withdrawal request approved",
    amount: -3500000,
    status: "Completed",
    date: new Date("2024-05-18"),
  },
  {
    id: "TXN-008",
    sellerId: "seller-kingsley",
    type: "Refund Adjustment",
    description: "Refund for damaged goods - ORD-001",
    amount: -250000,
    status: "Completed",
    date: new Date("2024-05-21"),
  },
  {
    id: "TXN-009",
    sellerId: "seller-kingsley",
    type: "Sale Credit",
    description: "Order ORD-004: Organic Wheat - 1000 units (Standard 1kg)",
    amount: 17500000,
    status: "Pending",
    date: new Date("2024-05-25"),
    buyer: "Grain Export House",
  },
  {
    id: "TXN-010",
    sellerId: "seller-kingsley",
    type: "Commission Deduction",
    description: "Platform commission",
    amount: -350000,
    status: "Pending",
    date: new Date("2024-05-25"),
  },
  {
    id: "TXN-011",
    sellerId: "seller-kingsley",
    type: "Sale Credit",
    description: "Marketplace sale: Honey 15 units",
    amount: 82500,
    status: "Completed",
    date: new Date("2024-05-22"),
    buyer: "Local Market Retailer",
  },
  {
    id: "TXN-012",
    sellerId: "seller-kingsley",
    type: "Commission Deduction",
    description: "Platform commission",
    amount: -1650,
    status: "Completed",
    date: new Date("2024-05-22"),
  },
];

export const mockPayouts = [
  {
    id: "PAYOUT-001",
    sellerId: "seller-kingsley",
    amount: 3500000,
    status: "Paid",
    requestDate: new Date("2024-05-11"),
    approvalDate: new Date("2024-05-12"),
    paymentDate: new Date("2024-05-18"),
    transactionReference: "GTB-TXN-20240518-001",
  },
  {
    id: "PAYOUT-002",
    sellerId: "seller-kingsley",
    amount: 2850000,
    status: "Processing",
    requestDate: new Date("2024-05-18"),
    approvalDate: new Date("2024-05-19"),
    paymentDate: null,
  },
  {
    id: "PAYOUT-003",
    sellerId: "seller-kingsley",
    amount: 1500000,
    status: "Pending",
    requestDate: new Date("2024-05-22"),
    approvalDate: null,
    paymentDate: null,
  },
  {
    id: "PAYOUT-004",
    sellerId: "seller-kingsley",
    amount: 650000,
    status: "Rejected",
    requestDate: new Date("2024-05-15"),
    approvalDate: new Date("2024-05-16"),
    paymentDate: null,
    rejectionReason: "Account verification required",
  },
];

export const mockAnalytics = {
  sellerId: "seller-kingsley",
  totalRevenue: 153750000,
  totalOrders: 28,
  totalProducts: 4,
  activeCustomers: 3,
  revenueGrowth: 24.5,
  orderGrowth: 12.3,
  avgOrderValue: 5491071,
  monthlyRevenue: [
    { month: "Jan", revenue: 53500000 },
    { month: "Feb", revenue: 57800000 },
    { month: "Mar", revenue: 61600000 },
    { month: "Apr", revenue: 70400000 },
    { month: "May", revenue: 89200000 },
    { month: "Jun", revenue: 116200000 },
  ],
  productSales: [
    { name: "Basmati Rice", sales: 53500000, orders: 8 },
    { name: "Milk", sales: 39000000, orders: 12 },
    { name: "Wheat", sales: 28300000, orders: 5 },
    { name: "Vegetables", sales: 33000000, orders: 3 },
  ],
  topProducts: [
    { name: "Basmati Rice", revenue: 53500000, trend: 15, units: 320 },
    { name: "Milk", revenue: 39000000, trend: 8, units: 280 },
    { name: "Wheat", revenue: 28300000, trend: 12, units: 190 },
    { name: "Vegetables", revenue: 33000000, trend: 5, units: 155 },
  ],
  revenueByMonth: [
    { month: "Jan", value: 53500000 },
    { month: "Feb", value: 57800000 },
    { month: "Mar", value: 61600000 },
    { month: "Apr", value: 70400000 },
    { month: "May", value: 89200000 },
    { month: "Jun", value: 116200000 },
  ],
};

export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  inventory: number;
  sku?: string;
  logistics?: ProductLogistics;
};

export type SellerProduct = Omit<(typeof mockProducts)[number], "variants"> & ProductLogistics & {
  sellerId: string;
  variants?: ProductVariant[];
};

export type SellerDiscount = {
  id: string;
  sellerId: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  productIds: number[];
  variantIds: string[];
  startsAt: Date;
  endsAt?: Date;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SellerMockData = {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  farmName: string;
  location: string;
  address: {
    fullAddress: string;
    latitude: number;
    longitude: number;
    landmark?: string;
  };
  products: SellerProduct[];
  orders: typeof mockOrders;
  customers: typeof mockCustomers;
  messages: typeof mockMessages;
  notifications: typeof mockNotifications;
  discounts: SellerDiscount[];
  wallet: typeof mockWallet;
  transactions: typeof mockTransactions;
  payouts: typeof mockPayouts;
  analytics: typeof mockAnalytics;
};

const withSellerProducts = (sellerId: string, products: typeof mockProducts) =>
  products.map((product) => ({
    ...product,
    sellerId,
    ...logisticsForProduct(product.name),
    variants: product.variants?.map((variant) => ({
      ...variant,
      logistics: logisticsForProduct(`${product.name} ${variant.name}`),
      sku: `${sellerId.toUpperCase()}-${product.id}-${variant.id}`,
    })),
  })) as SellerProduct[];

const sellerOneProducts = withSellerProducts("seller-kingsley", mockProducts);

const sellerTwoProducts: SellerProduct[] = withSellerProducts("seller-amina", [
  {
    id: 101,
    name: "Sweet Corn",
    category: "Grains & Cereals",
    categorySlug: "grains-cereals",
    price: 1200,
    inventory: 640,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop",
    ],
    variants: [
      { id: "101-1", name: "Fresh 1kg", price: 1200, inventory: 320 },
      { id: "101-2", name: "Crate 15kg", price: 16500, inventory: 90 },
    ],
    dateAdded: new Date("2024-05-12"),
  },
  {
    id: 102,
    name: "Free Range Eggs",
    category: "Poultry",
    categorySlug: "poultry",
    price: 4300,
    inventory: 210,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=300&fit=crop",
    ],
    variants: [
      { id: "102-1", name: "Half crate", price: 4300, inventory: 110 },
      { id: "102-2", name: "Full crate", price: 8200, inventory: 100 },
    ],
    dateAdded: new Date("2024-05-14"),
  },
  {
    id: 103,
    name: "Red Bell Pepper",
    category: "Vegetables",
    categorySlug: "vegetables",
    price: 1800,
    inventory: 70,
    status: "Active",
    images: [
      "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop",
    ],
    variants: undefined,
    dateAdded: new Date("2024-05-19"),
  },
] as typeof mockProducts);

export const mockSellers: SellerMockData[] = [
  {
    id: "seller-kingsley",
    name: "Kingsley Joseph",
    email: "kingsley@farm.com",
    username: "kingsley",
    password: "kingsley123",
    farmName: "Kingsley Family Farm",
    location: "Lagos, Nigeria",
    address: {
      fullAddress: "12 Admiralty Way, Lekki Phase 1, Lagos",
      latitude: 6.4474,
      longitude: 3.4722,
      landmark: "Near Admiralty Toll Plaza",
    },
    products: sellerOneProducts,
    orders: getSellerOrderGroups("seller-kingsley"),
    customers: mockCustomers,
    messages: mockMessageConversations.filter((conversation) => conversation.sellerId === "seller-kingsley" && conversation.channelType === "buyer-seller").flatMap((conversation) => conversation.messages),
    notifications: mockNotifications,
    discounts: [
      {
        id: "disc-kingsley-1",
        sellerId: "seller-kingsley",
        code: "RICE15",
        description: "15% off premium rice packs",
        type: "percentage",
        value: 15,
        productIds: [1],
        variantIds: [],
        startsAt: new Date("2026-05-01T00:00:00"),
        endsAt: new Date("2026-06-15T23:59:00"),
        isActive: true,
        usageLimit: 150,
        usageCount: 43,
        createdAt: new Date("2026-04-28"),
        updatedAt: new Date("2026-05-04"),
      },
      {
        id: "disc-kingsley-2",
        sellerId: "seller-kingsley",
        code: "MILK500",
        description: "Fixed discount on 1L full cream milk",
        type: "fixed",
        value: 500,
        productIds: [],
        variantIds: ["4-2"],
        startsAt: new Date("2026-06-10T00:00:00"),
        endsAt: new Date("2026-07-10T23:59:00"),
        isActive: true,
        usageCount: 0,
        createdAt: new Date("2026-05-20"),
        updatedAt: new Date("2026-05-20"),
      },
      {
        id: "disc-kingsley-3",
        sellerId: "seller-kingsley",
        code: "TOMATO10",
        description: "Expired tomato flash sale",
        type: "percentage",
        value: 10,
        productIds: [3],
        variantIds: [],
        startsAt: new Date("2026-04-01T00:00:00"),
        endsAt: new Date("2026-04-20T23:59:00"),
        isActive: true,
        usageLimit: 50,
        usageCount: 50,
        createdAt: new Date("2026-03-28"),
        updatedAt: new Date("2026-04-20"),
      },
    ],
    wallet: mockWallet,
    transactions: mockTransactions,
    payouts: mockPayouts,
    analytics: {
      ...mockAnalytics,
      topProducts: mockAnalytics.topProducts.map((product, index) => ({
        ...product,
        units: [320, 280, 190, 155][index] ?? 100,
      })),
    },
  },
  {
    id: "seller-amina",
    name: "Amina Bello",
    email: "amina@farm.com",
    username: "amina",
    password: "amina123",
    farmName: "Bello Fresh Produce",
    location: "Kano, Nigeria",
    address: {
      fullAddress: "45 Zoo Road, Kano Municipal, Kano",
      latitude: 12.0022,
      longitude: 8.592,
      landmark: "Opposite Kano Zoo",
    },
    products: sellerTwoProducts,
    orders: getSellerOrderGroups("seller-amina"),
    customers: [
      {
        id: 201,
        sellerId: "seller-amina",
        name: "North Market Cooperative",
        location: "Kano",
        totalOrders: 9,
        totalSpent: 8200000,
        lastOrder: new Date("2024-05-18"),
        email: "orders@northmarket.ng",
        phone: "+234 803 111 2222",
      },
      {
        id: 202,
        sellerId: "seller-amina",
        name: "Kano Fresh Foods",
        location: "Kano",
        totalOrders: 6,
        totalSpent: 5100000,
        lastOrder: new Date("2024-05-23"),
        email: "supply@kanofresh.ng",
        phone: "+234 805 333 4444",
      },
      {
        id: 203,
        sellerId: "seller-amina",
        name: "Kaduna Grocers",
        location: "Kaduna",
        totalOrders: 4,
        totalSpent: 3550000,
        lastOrder: new Date("2024-05-25"),
        email: "buyer@kadunagrocers.ng",
        phone: "+234 809 555 6666",
      },
    ],
    messages: mockMessageConversations.filter((conversation) => conversation.sellerId === "seller-amina" && conversation.channelType === "buyer-seller").flatMap((conversation) => conversation.messages),
    notifications: [
      {
        id: 201,
        sellerId: "seller-amina",
        type: "order",
        orderId: "AMN-ORD-002",
        targetType: "order",
        targetId: "AMN-ORD-002",
        title: "Order In Transit",
        message: "Kano Fresh Foods order is now in transit",
        timestamp: new Date("2024-05-25T09:00:00"),
        read: false,
      },
      {
        id: 202,
        sellerId: "seller-amina",
        type: "product",
        productId: 103,
        targetType: "product",
        targetId: 103,
        title: "Stock Check",
        message: "Red Bell Pepper inventory is below your target level",
        timestamp: new Date("2024-05-24T16:30:00"),
        read: true,
      },
    ],
    discounts: [
      {
        id: "disc-amina-1",
        sellerId: "seller-amina",
        code: "CORN20",
        description: "20% off sweet corn crates",
        type: "percentage",
        value: 20,
        productIds: [],
        variantIds: ["101-2"],
        startsAt: new Date("2026-05-15T00:00:00"),
        endsAt: new Date("2026-06-30T23:59:00"),
        isActive: true,
        usageLimit: 80,
        usageCount: 12,
        createdAt: new Date("2026-05-10"),
        updatedAt: new Date("2026-05-15"),
      },
    ],
    wallet: {
      ...mockWallet,
      sellerId: "seller-amina",
      availableBalance: 1740000,
      pendingBalance: 310000,
      totalWithdrawn: 4200000,
      totalEarnings: 6250000,
      bankAccount: {
        ...mockWallet.bankAccount,
        name: "Zenith Bank",
        accountNumber: "9876543210",
        accountName: "Bello Fresh Produce",
      },
    },
    transactions: [
      {
        id: "AMN-TXN-001",
        sellerId: "seller-amina",
        type: "Sale Credit",
        description: "Order AMN-ORD-001: Sweet Corn - 35 units (Crate 15kg)",
        amount: 577500,
        status: "Completed",
        date: new Date("2024-05-18"),
        buyer: "North Market Cooperative",
      },
      {
        id: "AMN-TXN-002",
        sellerId: "seller-amina",
        type: "Commission Deduction",
        description: "Platform commission for AMN-ORD-001",
        amount: -11550,
        status: "Completed",
        date: new Date("2024-05-18"),
      },
      {
        id: "AMN-TXN-003",
        sellerId: "seller-amina",
        type: "Sale Credit",
        description: "Order AMN-ORD-002: Free Range Eggs - 60 units (Full crate)",
        amount: 492000,
        status: "Pending",
        date: new Date("2024-05-23"),
        buyer: "Kano Fresh Foods",
      },
      {
        id: "AMN-TXN-004",
        sellerId: "seller-amina",
        type: "Commission Deduction",
        description: "Platform commission for AMN-ORD-002",
        amount: -9840,
        status: "Pending",
        date: new Date("2024-05-23"),
      },
      {
        id: "AMN-TXN-005",
        sellerId: "seller-amina",
        type: "Sale Credit",
        description: "Order AMN-ORD-003: Red Bell Pepper - 120 units",
        amount: 216000,
        status: "Pending",
        date: new Date("2024-05-25"),
        buyer: "Kaduna Grocers",
      },
      {
        id: "AMN-TXN-006",
        sellerId: "seller-amina",
        type: "Withdrawal",
        description: "Withdrawal request approved",
        amount: -900000,
        status: "Completed",
        date: new Date("2024-05-19"),
      },
    ],
    payouts: mockPayouts.slice(0, 2).map((payout, index) => ({
      ...payout,
      id: `AMN-PAYOUT-${String(index + 1).padStart(3, "0")}`,
      sellerId: "seller-amina",
    })),
    analytics: {
      ...mockAnalytics,
      sellerId: "seller-amina",
      totalRevenue: 62500000,
      totalOrders: 16,
      totalProducts: 3,
      activeCustomers: 5,
      revenueGrowth: 18.2,
      orderGrowth: 9.4,
      avgOrderValue: 3906250,
      monthlyRevenue: [
        { month: "Jan", revenue: 18800000 },
        { month: "Feb", revenue: 23200000 },
        { month: "Mar", revenue: 29400000 },
        { month: "Apr", revenue: 36700000 },
        { month: "May", revenue: 48100000 },
        { month: "Jun", revenue: 62500000 },
      ],
      productSales: [
        { name: "Sweet Corn", sales: 26800000, orders: 7 },
        { name: "Eggs", sales: 22100000, orders: 6 },
        { name: "Bell Pepper", sales: 13600000, orders: 3 },
      ],
      topProducts: [
        { name: "Sweet Corn", revenue: 26800000, trend: 11, units: 420 },
        { name: "Eggs", revenue: 22100000, trend: 8, units: 380 },
        { name: "Bell Pepper", revenue: 13600000, trend: 5, units: 210 },
      ],
      revenueByMonth: [
        { month: "Jan", value: 18800000 },
        { month: "Feb", value: 23200000 },
        { month: "Mar", value: 29400000 },
        { month: "Apr", value: 36700000 },
        { month: "May", value: 48100000 },
        { month: "Jun", value: 62500000 },
      ],
    },
  },
];

export const getActiveSellerId = () => {
  if (typeof window === "undefined") return mockSellers[0].id;
  const session = localStorage.getItem("agritecSellerSession");
  if (!session) return mockSellers[0].id;

  try {
    const parsed = JSON.parse(session) as { sellerId?: string };
    return parsed.sellerId || mockSellers[0].id;
  } catch {
    return mockSellers[0].id;
  }
};

export const getSellerMockData = (sellerId = getActiveSellerId()) =>
  mockSellers.find((seller) => seller.id === sellerId) || mockSellers[0];









