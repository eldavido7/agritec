// Product Types
export interface Product {
  id: string;
  title: string;
  description: string;
  price?: number;
  inventory?: number;
  category: string;
  subcategory?: string; // optional
  variants?: ProductVariant[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string;
  imagePublicId?: string;
}

// ProductVariant Types
export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string | null;
  name?: string | null; // e.g. "M", "L", "XL", "Red/XL"
  price?: number | null; // optional override
  inventory: number;
  createdAt: Date;
  updatedAt: Date;
}

// Order Types
export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string | null; // (nullable for backward compatibility)
  variant?: ProductVariant | null; // (optional populated relation)
  quantity: number;
  subtotal: number; // product.price * quantity
  total: number;
  orderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  items: OrderItem[];
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  subtotal: number; // Sum of OrderItem.subtotal
  shippingOptionId?: string | null; // References ShippingOption
  shippingCost?: number | null; // Cost of selected shipping option
  total: number; // Subtotal + shippingCost - discount
  discountId?: string | null;
  discount?: Discount | null;
  paymentReference?: string | null; // Paystack transaction reference
  createdAt: Date;
  updatedAt: Date;
}

// Discount Types
export interface Discount {
  id: string;
  code: string;
  description?: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  usageLimit?: number | null;
  usageCount: number;
  startsAt: Date;
  endsAt?: Date | null;
  minSubtotal?: number | null;
  products?: Product[];
  variants?: ProductVariant[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  id: string;
  title: string;
  sales: number;
  revenue: number;
}

export type ProductItem = {
  product: {
    id: string;
    title: string;
  };
  quantity: number;
  total: number;
};

// Enhanced OrderWithItems to properly support variants
export type OrderWithItems = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  items: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      title: string;
      price?: number;
      category: string;
      variants?: ProductVariant[];
    };
    variantId?: string | null;
    variant?: {
      id: string;
      name?: string | null;
      price?: number | null;
    } | null;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
  createdAt: string | Date;
};

// Enhanced AnalyticsOrder to support variants
export type AnalyticsOrder = {
  id: string;
  createdAt: string;
  status: string;
  items: Array<{
    productId: string;
    product: {
      id: string;
      title: string;
      price?: number;
      category: string;
    };
    variantId?: string | null;
    variant?: {
      id: string;
      name?: string | null;
      price?: number | null;
    } | null;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
};

// New variant analytics types
export interface VariantAnalytics {
  productTitle: string;
  variantName: string;
  totalSold: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface CategoryAnalytics {
  name: string;
  productCount: number;
  totalRevenue: number;
  totalUnitsSold: number;
  averagePrice: number;
}

export interface LowStockAlert {
  productId: string;
  productTitle: string;
  type: "product" | "variant";
  variantId?: string;
  variantName?: string;
  currentStock: number;
  threshold: number;
}

// Enhanced ProductPerformance to include variant info
export interface ProductPerformance {
  id: string;
  title: string;
  sales: number;
  revenue: number;
  avgPrice: number;
  performance: "High" | "Medium" | "Low";
  variantBreakdown?: Record<
    string,
    {
      name: string;
      sold: number;
      revenue: number;
    }
  >;
}

//User Types
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional since it may not be returned in GET responses
  lastActive: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryTime: string;
  status: "ACTIVE" | "CONDITIONAL";
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistItem {
  id: string;
  customerId: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  variant?: ProductVariant | null;
  createdAt: Date;
}

export interface AuthResponse {
  success: boolean;
  customer?: Customer;
  token?: string;
  message?: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface EmailVerificationData {
  email: string;
  code: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export type FAQItem = {
  question: string;
  answer: string;
};

export interface Story {
  id: string;
  title: string;
  author: string;
  summary: string;
  content: Record<string, any>;
  type: "text" | "video" | "audio";
  videoUrl?: string;
  audioFile?: string;
  thumbnail?: string;
  isFeatured?: boolean;
  status: "published" | "draft";
  dateCreated: string;
  lastUpdated: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  faq?: FAQItem[]; // primaryKeyword?: string;
  primaryKeyword?: string | null;
}

export interface Blog {
  id: string;
  title: string;
  author: string;
  summary: string;
  content: Record<string, any>;
  category: string;
  type: "text" | "video" | "audio";
  videoUrl?: string;
  audioFile?: string;
  thumbnail?: string;
  isFeatured?: boolean;
  status: "published" | "draft";
  dateCreated: string;
  lastUpdated: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  faq?: FAQItem[]; // primaryKeyword?: string;
  primaryKeyword?: string | null;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  featured: boolean;
  image: string;
  meetingLink: string;
  status: "active" | "ended";
  time: string;
  dateCreated: string;
  lastUpdated: string;
  slug: string;
}

