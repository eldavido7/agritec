import { create } from "zustand"
import { persist } from "zustand/middleware";
import type { Product, Order, Discount, AnalyticsOrder, OrderWithItems, User, ShippingOption, SalesData, ProductPerformance, Customer, WishlistItem, Event, Blog, Story } from "@/types"

interface StoreState {
  // Products
  products: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  updateVariant: (productId: string, variantId: string, data: { inventory?: number }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Orders
  orders: Order[];
  fetchOrders: () => Promise<void>;
  addOrder: (
    order: Omit<Order, "id" | "createdAt" | "updatedAt" | "subtotal" | "total"> & {
      items: { productId: string; quantity: number }[];
      shippingOptionId?: string | null;
      shippingCost?: number | null;
      paymentReference?: string | null;
    }
  ) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;

  // Discounts
  discounts: Discount[];
  fetchDiscounts: () => Promise<void>;
  addDiscount: (discount: Omit<Discount, "id" | "usageCount" | "createdAt" | "updatedAt">) => Promise<void>;
  updateDiscount: (id: string, discount: Partial<Discount>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
}

// Users
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setState: (state: Partial<AuthStore>) => void;
}

// Content State for Blogs and Stories
interface ContentState {
  blogs: Blog[];
  stories: Story[];
  fetchBlogs: () => Promise<void>;
  fetchStories: () => Promise<void>;
  addBlog: (blog: Omit<Blog, "id" | "dateCreated" | "lastUpdated" | "isFeatured">) => Promise<void>;
  addStory: (story: Omit<Story, "id" | "dateCreated" | "lastUpdated" | "isFeatured">) => Promise<void>;
  updateBlog: (slug: string, blog: Partial<Blog>) => Promise<void>;
  updateStory: (slug: string, story: Partial<Story>) => Promise<void>;
  deleteBlog: (slug: string) => Promise<void>;
  deleteStory: (slug: string) => Promise<void>;
}

// Event State
interface EventState {
  events: Event[];
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<Event, "id" | "dateCreated" | "lastUpdated" | "featured">) => Promise<void>;
  updateEvent: (slug: string, event: Partial<Event>) => Promise<void>;
  deleteEvent: (slug: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  // Products
  products: [],

  fetchProducts: async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    set({ products: data });
  },

  addProduct: async (product: Omit<Product, "id" | "createdAt">) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!res.ok) throw new Error("Failed to add product");

      // Refetch all products after successful add
      const updatedRes = await fetch("/api/products");
      const updatedProducts = await updatedRes.json();
      set({ products: updatedProducts });
    } catch (error) {
      console.error("[ADD_PRODUCT_STORE]", error);
    }
  },

  updateProduct: async (id, updatedProduct) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedProduct),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update product");
      }

      const returnedProduct = await res.json();

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? returnedProduct : p
        ),
      }));

      return returnedProduct;
    } catch (error) {
      console.error("[UPDATE_PRODUCT]", error);
      throw error;
    }
  },

  updateVariant: async (productId: string, variantId: string, data: { inventory?: number }) => {
    try {
      const product = get().products.find((p) => p.id === productId);
      if (!product) throw new Error("Product not found");

      const variants = product.variants?.map((v) =>
        v.id === variantId ? { ...v, inventory: data.inventory ?? v.inventory } : v
      ) ?? [];

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: product.price,
          inventory: product.inventory,
          category: product.category,
          subcategory: product.subcategory,
          tags: product.tags,
          imageUrl: product.imageUrl,
          imagePublicId: product.imagePublicId,
          variants,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update variant");
      }

      const updatedProduct = await response.json();
      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId ? updatedProduct : p
        ),
      }));
    } catch (err) {
      console.error("[UPDATE_VARIANT_ERROR]", err);
      throw err;
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error("[DELETE_PRODUCT]", error);
      throw error;
    }
  },

  // Orders
  orders: [],

  fetchOrders: async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const orders: Order[] = await res.json();
      set({ orders });
    } catch (error) {
      console.error("[FETCH_ORDERS]", error);
    }
  },

  addOrder: async (order) => {
    try {
      const { products, discounts } = get();
      const { shippingOptions } = useSettingsStore.getState();

      // Calculate subtotal from items
      const itemsWithSubtotal = order.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found in state`);

        const variant = item.variantId
          ? product.variants?.find((v) => v.id === item.variantId) || null
          : null;

        const price = variant?.price ?? product.price;
        if (price == null) throw new Error(`No price found for product ${product.id}`);

        return {
          productId: item.productId,
          variantId: item.variantId ?? null,
          product,
          variant,
          quantity: item.quantity,
          subtotal: price * item.quantity,
        };
      });

      const subtotal = itemsWithSubtotal.reduce((sum, item) => sum + item.subtotal, 0);
      let shippingCost = 0;

      // Validate shipping option
      if (order.shippingOptionId) {
        const shippingOption = shippingOptions.find((s) => s.id === order.shippingOptionId);
        if (!shippingOption || shippingOption.status !== "ACTIVE") {
          throw new Error("Invalid or inactive shipping option");
        }
        shippingCost = shippingOption.price;
        if (order.shippingCost !== undefined && order.shippingCost !== shippingCost) {
          throw new Error("Provided shipping cost does not match selected option");
        }
      } else if (order.shippingCost !== undefined && order.shippingCost !== 0) {
        throw new Error("Shipping cost provided without shipping option");
      }

      // Validate and apply discount
      let discount: Discount | null = null;
      let total = subtotal + shippingCost;

      if (order.discountId) {
        discount = discounts.find((d) => d.id === order.discountId) || null;
        if (!discount) throw new Error("Invalid discount");

        const isApplicableToItems = itemsWithSubtotal.some((item) =>
          discount?.products?.some((p) => p.id === item.productId) ||
          discount?.variants?.some((v) => v.id === item.variantId)
        );

        if (
          !discount.isActive ||
          (discount.usageLimit && discount.usageCount >= discount.usageLimit) ||
          (discount.startsAt && new Date() < new Date(discount.startsAt)) ||
          (discount.endsAt && new Date() > new Date(discount.endsAt)) ||
          (discount.minSubtotal && subtotal < discount.minSubtotal) ||
          (discount.products?.length || discount.variants?.length) && !isApplicableToItems
        ) {
          throw new Error("Discount is not applicable");
        }

        if (discount.type === "percentage") {
          total = subtotal * (1 - discount.value / 100) + shippingCost;
        } else if (discount.type === "fixed_amount") {
          total = Math.max(0, subtotal - discount.value) + shippingCost;
        } else if (discount.type === "free_shipping") {
          total = subtotal;
          shippingCost = 0;
        }
      }

      const newOrder = {
        ...order,
        items: itemsWithSubtotal,
        subtotal,
        shippingCost,
        total,
        discount,
        paymentReference: order.paymentReference || null,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const createdOrder = await res.json();
      set((state) => ({ orders: [createdOrder, ...state.orders] }));
    } catch (error) {
      console.error("[ADD_ORDER]", error);
      throw error;
    }
  },

  updateOrder: async (id, updatedOrder) => {
    try {
      const { products, discounts } = get();
      const { shippingOptions } = useSettingsStore.getState();

      let subtotal = 0;
      let shippingCost = updatedOrder.shippingCost ?? 0;
      let total = 0;
      let discount: Discount | null = updatedOrder.discount || null;
      let shippingOptionId = updatedOrder.shippingOptionId;

      // Recalculate subtotal based on items
      let itemsWithSubtotal = updatedOrder.items;
      if (updatedOrder.items) {
        itemsWithSubtotal = updatedOrder.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) throw new Error(`Product ${item.productId} not found in state`);

          const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId) || null
            : null;

          const price = variant?.price ?? product.price ?? 0;
          const subtotal = price * item.quantity;

          return {
            ...item,
            product,
            variant,
            subtotal,
          };
        });
        subtotal = itemsWithSubtotal.reduce((sum, item) => sum + item.subtotal, 0);
      }

      // Validate shipping option
      if (updatedOrder.shippingOptionId !== undefined) {
        if (updatedOrder.shippingOptionId) {
          const shippingOption = shippingOptions.find((s) => s.id === updatedOrder.shippingOptionId);
          if (!shippingOption || shippingOption.status !== "ACTIVE") {
            throw new Error("Invalid or inactive shipping option");
          }
          shippingCost = shippingOption.price;
          if (updatedOrder.shippingCost !== undefined && updatedOrder.shippingCost !== shippingOption.price) {
            throw new Error("Provided shipping cost does not match selected option");
          }
        } else if (updatedOrder.shippingCost !== undefined && updatedOrder.shippingCost !== 0) {
          throw new Error("Shipping cost provided without shipping option");
        } else {
          shippingCost = 0;
        }
      }

      // Validate and apply discount
      if (updatedOrder.discountId !== undefined) {
        discount = discounts.find((d) => d.id === updatedOrder.discountId) ?? null;
        if (updatedOrder.discountId && !discount) throw new Error("Invalid discount");

        if (discount) {
          if (
            !discount.isActive ||
            (discount.usageLimit && discount.usageCount >= discount.usageLimit) ||
            (discount.startsAt && new Date() < new Date(discount.startsAt)) ||
            (discount.endsAt && new Date() > new Date(discount.endsAt)) ||
            (discount.minSubtotal && subtotal < discount.minSubtotal) ||
            (discount.products?.length && !itemsWithSubtotal?.some((item) =>
              discount?.products?.some((p) => p.id === item.productId)
            )) ||
            (discount.variants?.length && !itemsWithSubtotal?.some((item) =>
              discount?.variants?.some((v) => v.id === item.variantId)
            ))
          ) {
            throw new Error("Discount is not applicable");
          }

          if (discount.type === "percentage") {
            total = subtotal * (1 - discount.value / 100) + shippingCost;
          } else if (discount.type === "fixed_amount") {
            total = Math.max(0, subtotal - discount.value) + shippingCost;
          } else if (discount.type === "free_shipping") {
            total = subtotal;
            shippingCost = 0;
          }
        } else {
          total = subtotal + shippingCost;
        }
      } else {
        total = subtotal + shippingCost;
      }

      const updated = {
        ...updatedOrder,
        items: itemsWithSubtotal,
        subtotal,
        shippingOptionId,
        shippingCost,
        total,
        discount,
        discountId: discount?.id ?? null,
        paymentReference: updatedOrder.paymentReference ?? null,
      };

      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("[UPDATE_ORDER] API Error:", errorData);
        throw new Error(errorData.error || "Failed to update order");
      }
      const updatedOrderResponse = await res.json();
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, ...updatedOrderResponse } : o
        ),
      }));
    } catch (error) {
      console.error("[UPDATE_ORDER]", error);
      throw error;
    }
  },

  // Discounts
  discounts: [],

  fetchDiscounts: async () => {
    try {
      const res = await fetch("/api/discounts");
      if (!res.ok) throw new Error("Failed to fetch discounts");
      const data = await res.json();
      set({ discounts: data });
    } catch (error) {
      console.error("[FETCH_DISCOUNTS]", error);
    }
  },

  addDiscount: async (discount) => {
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discount),
      });
      if (!res.ok) throw new Error("Failed to create discount");
      const newDiscount = await res.json();
      set((state) => ({
        discounts: [newDiscount, ...state.discounts],
      }));
    } catch (error) {
      console.error("[ADD_DISCOUNT]", error);
    }
  },

  updateDiscount: async (id, updatedDiscount) => {
    try {
      const res = await fetch(`/api/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDiscount),
      });
      if (!res.ok) throw new Error("Failed to update discount");
      const updated = await res.json();

      set((state) => ({
        discounts: state.discounts.map((discount) =>
          discount.id === id ? updated : discount,
        ),
      }));
    } catch (error) {
      console.error("[UPDATE_DISCOUNT]", error);
    }
  },

  deleteDiscount: async (id) => {
    try {
      await fetch(`/api/discounts/${id}`, { method: "DELETE" });
      set((state) => ({
        discounts: state.discounts.filter((d) => d.id !== id),
      }));
    } catch (error) {
      console.error("[DELETE_DISCOUNT]", error);
    }
  },
}))

export function getTopProducts(orders: OrderWithItems[]) {
  const productStats: Record<string,
    {
      title: string;
      totalSold: number;
      totalRevenue: number;
      variantBreakdown?: Record<string, { name: string; sold: number; revenue: number }>;
    }
  > = {};

  orders.forEach((order) => {
    if (order.status !== "DELIVERED") return;

    order.items.forEach((item) => {
      // Handle deleted products gracefully
      if (!item.product) {
        console.warn(`Order item missing product reference (likely deleted):`, item);

        // Use productId as fallback if available
        const productId = item.productId || 'unknown';
        if (!productStats[productId]) {
          productStats[productId] = {
            title: `[Deleted Product]`,
            totalSold: 0,
            totalRevenue: 0,
            variantBreakdown: {},
          };
        }

        // Use subtotal from order item as fallback
        const itemRevenue = item.subtotal || 0;
        productStats[productId].totalSold += item.quantity;
        productStats[productId].totalRevenue += itemRevenue;
        return;
      }

      const productId = item.product.id;

      // CRITICAL: Calculate revenue from item.subtotal first (most reliable), 
      // then fall back to calculated price
      let effectivePrice = 0;
      let itemRevenue = 0;

      if (item.subtotal && item.subtotal > 0) {
        // Use subtotal directly - this is the actual price paid
        itemRevenue = item.subtotal;
        effectivePrice = item.quantity > 0 ? item.subtotal / item.quantity : 0;
      } else {
        // Fallback: calculate from variant/product price
        effectivePrice = item.variant?.price ?? item.product.price ?? 0;
        itemRevenue = effectivePrice * item.quantity;
      }

      // Initialize product stats if not exists
      if (!productStats[productId]) {
        productStats[productId] = {
          title: item.product.title,
          totalSold: 0,
          totalRevenue: 0,
          variantBreakdown: {},
        };
      }

      // ALWAYS update product totals regardless of variant
      productStats[productId].totalSold += item.quantity;
      productStats[productId].totalRevenue += itemRevenue;

      // Track variant-specific stats if variant exists OR if variantId exists
      if (item.variantId) {
        const variantKey = item.variantId;

        if (!productStats[productId].variantBreakdown![variantKey]) {
          // Determine variant name
          let variantName = '[Deleted Variant]';
          if (item.variant) {
            variantName = item.variant.name || `Variant ${item.variantId.slice(0, 8)}`;
          }

          productStats[productId].variantBreakdown![variantKey] = {
            name: variantName,
            sold: 0,
            revenue: 0,
          };
        }

        productStats[productId].variantBreakdown![variantKey].sold += item.quantity;
        productStats[productId].variantBreakdown![variantKey].revenue += itemRevenue;
      }
    });
  });

  const products = Object.values(productStats);

  const topByRevenue = [...products].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );
  const topByQuantity = [...products].sort(
    (a, b) => b.totalSold - a.totalSold
  );

  return {
    topByRevenue,
    topByQuantity,
  };
}

export function getSalesData(orders: AnalyticsOrder[], period: 'week' | 'month' | '6months' | 'year' = 'year'): SalesData[] {
  const revenueByPeriod: Record<string, number> = {};
  const orderCountByPeriod: Record<string, number> = {};

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '6months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
    default:
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  orders.forEach((order) => {
    const orderDate = new Date(order.createdAt);
    if (orderDate < startDate) return;

    let periodKey: string;

    switch (period) {
      case 'week':
        periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")}`;
        break;
      case 'month':
        periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${Math.ceil(orderDate.getDate() / 7)}`;
        break;
      case '6months':
      case 'year':
      default:
        periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
        break;
    }

    if (!orderCountByPeriod[periodKey]) {
      orderCountByPeriod[periodKey] = 0;
    }
    orderCountByPeriod[periodKey] += 1;

    if (order.status === "DELIVERED") {
      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = 0;
      }
      revenueByPeriod[periodKey] += order.total;
    }
  });

  const periods = Object.keys(orderCountByPeriod).sort();

  // Format the period labels for display
  const formattedData = periods.map((periodKey) => {
    let displayDate: string;

    switch (period) {
      case 'week':
        displayDate = periodKey; // YYYY-MM-DD
        break;
      case 'month':
        const [year, month, week] = periodKey.split('-');
        displayDate = `${year}-${month} W${week}`;
        break;
      case '6months':
      case 'year':
      default:
        displayDate = periodKey; // YYYY-MM
        break;
    }

    return {
      date: displayDate,
      revenue: revenueByPeriod[periodKey] || 0,
      orders: orderCountByPeriod[periodKey],
    };
  });

  return formattedData;
}

export function getVariantAnalytics(orders: OrderWithItems[]) {
  const variantStats: Record<string,
    {
      productTitle: string;
      variantName: string;
      totalSold: number;
      totalRevenue: number;
      averagePrice: number;
    }
  > = {};

  orders.forEach((order) => {
    if (order.status !== "DELIVERED") return;

    order.items.forEach((item) => {
      // Only process items with variants
      if (!item.variantId) return;

      const variantKey = `${item.productId || 'unknown'}-${item.variantId}`;

      // Handle deleted products
      const productTitle = item.product?.title || '[Deleted Product]';

      // Handle deleted variants and calculate price
      let variantName = '[Deleted Variant]';
      let effectivePrice = 0;
      let itemRevenue = 0;

      // Use subtotal first (most reliable)
      if (item.subtotal && item.subtotal > 0) {
        itemRevenue = item.subtotal;
        effectivePrice = item.quantity > 0 ? item.subtotal / item.quantity : 0;
      } else {
        // Fallback to calculated price
        if (item.variant) {
          effectivePrice = item.variant.price ?? item.product?.price ?? 0;
        } else if (item.product) {
          effectivePrice = item.product.price ?? 0;
        }
        itemRevenue = effectivePrice * item.quantity;
      }

      if (item.variant) {
        variantName = item.variant.name || `Variant ${item.variantId.slice(0, 8)}`;
      }

      if (!variantStats[variantKey]) {
        variantStats[variantKey] = {
          productTitle,
          variantName,
          totalSold: 0,
          totalRevenue: 0,
          averagePrice: effectivePrice,
        };
      }

      variantStats[variantKey].totalSold += item.quantity;
      variantStats[variantKey].totalRevenue += itemRevenue;
      variantStats[variantKey].averagePrice =
        variantStats[variantKey].totalRevenue / variantStats[variantKey].totalSold;
    });
  });

  const variants = Object.values(variantStats);

  return {
    topVariantsByRevenue: [...variants].sort((a, b) => b.totalRevenue - a.totalRevenue),
    topVariantsByQuantity: [...variants].sort((a, b) => b.totalSold - a.totalSold),
  };
}

export function getCategoryAnalytics(products: Product[], orders: OrderWithItems[]) {
  const categoryStats: Record<string,
    {
      name: string;
      productCount: number;
      totalRevenue: number;
      totalUnitsSold: number;
      averagePrice: number;
    }
  > = {};

  // Initialize categories from products
  products.forEach((product) => {
    if (!categoryStats[product.category]) {
      categoryStats[product.category] = {
        name: product.category,
        productCount: 0,
        totalRevenue: 0,
        totalUnitsSold: 0,
        averagePrice: 0,
      };
    }
    categoryStats[product.category].productCount++;
  });

  // Calculate revenue and units sold from delivered orders
  orders.forEach((order) => {
    if (order.status !== "DELIVERED") return;

    order.items.forEach((item) => {
      // Handle deleted products gracefully
      if (!item.product) {
        console.warn(`Order item missing product reference (likely deleted):`, item);

        const category = "Uncategorized";
        const itemRevenue = item.subtotal || 0;

        // Initialize category if it doesn't exist
        if (!categoryStats[category]) {
          categoryStats[category] = {
            name: category,
            productCount: 0,
            totalRevenue: 0,
            totalUnitsSold: 0,
            averagePrice: 0,
          };
        }

        categoryStats[category].totalRevenue += itemRevenue;
        categoryStats[category].totalUnitsSold += item.quantity;
        return;
      }

      const category = item.product.category ?? "Uncategorized";
      const effectivePrice = item.variant?.price ?? item.product.price ?? 0;
      const itemRevenue = item.subtotal || (effectivePrice * item.quantity);

      // Initialize category if it doesn't exist
      if (!categoryStats[category]) {
        categoryStats[category] = {
          name: category,
          productCount: 0,
          totalRevenue: 0,
          totalUnitsSold: 0,
          averagePrice: 0,
        };
      }

      categoryStats[category].totalRevenue += itemRevenue;
      categoryStats[category].totalUnitsSold += item.quantity;
    });
  });

  // Calculate average prices
  Object.values(categoryStats).forEach((category) => {
    if (category.totalUnitsSold > 0) {
      category.averagePrice = category.totalRevenue / category.totalUnitsSold;
    }
  });

  return Object.values(categoryStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// Function to get low stock alerts considering variants
export function getLowStockAlerts(products: Product[], threshold: number = 10) {
  const alerts: Array<{
    productId: string;
    productTitle: string;
    type: 'product' | 'variant';
    variantId?: string;
    variantName?: string;
    currentStock: number;
    threshold: number;
  }> = [];

  products.forEach((product) => {
    // Check main product inventory
    if ((product.inventory ?? 0) < threshold) {
      alerts.push({
        productId: product.id,
        productTitle: product.title,
        type: 'product',
        currentStock: product.inventory ?? 0,
        threshold,
      });
    }

    // Check variant inventories
    product.variants?.forEach((variant) => {
      if (variant.inventory < threshold) {
        alerts.push({
          productId: product.id,
          productTitle: product.title,
          type: 'variant',
          variantId: variant.id,
          variantName: variant.name || `Variant ${variant.id.slice(0, 8)}`,
          currentStock: variant.inventory,
          threshold,
        });
      }
    });
  });

  return alerts.sort((a, b) => a.currentStock - b.currentStock);
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true, // Start with isLoading: true
      setState: (state) => set(state),

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            set({ user: data.user });
            const { updateUserActivity } = useSettingsStore.getState();
            await updateUserActivity(data.user.id); // Update lastActive on login
            return true;
          }

          return false;
        } catch (err) {
          console.error("Login error:", err);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth");
        }
        window.location.href = "/dashboard/login"; // force redirect
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "auth", // localStorage key
      partialize: (state) => ({ user: state.user }), // only persist user
      onRehydrateStorage: () => {
        return (state) => {
          // Called when persist middleware has finished hydrating
          state?.setState({ isLoading: false }); // Set isLoading to false after hydration
        };
      },
    }
  )
);

interface SettingsState {
  users: User[];
  shippingOptions: ShippingOption[];
  fetchSettings: () => Promise<void>;
  createUser: (user: Partial<User>) => Promise<void>;
  updateUser: (user: Partial<User> & { id: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  createShipping: (option: Partial<ShippingOption>) => Promise<void>;
  updateShipping: (option: Partial<ShippingOption> & { id: string }) => Promise<void>;
  deleteShipping: (id: string) => Promise<void>;
  updateUserActivity: (userId: string) => Promise<void>; // New function
}

export const useSettingsStore = create<SettingsState>((set) => ({
  users: [],
  shippingOptions: [],

  fetchSettings: async () => {
    const [usersRes, shippingRes] = await Promise.all([
      fetch("/api/settings/users"),
      fetch("/api/settings/shipping-options"),
    ]);

    const [users, shippingOptions] = await Promise.all([
      usersRes.json(),
      shippingRes.json(),
    ]);

    set({ users, shippingOptions });
  },

  createUser: async (user) => {
    const payload = { name: user.name, email: user.email, password: user.password };
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Failed to create user: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
    }
    const newUser = await res.json();
    set((state) => ({ users: [...state.users, newUser] }));
  },

  updateUser: async (user) => {
    await fetch(`/api/settings/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    set((state) => ({
      users: state.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)),
    }));
  },

  updateUserActivity: async (userId) => {
    const res = await fetch("/api/settings/users/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Failed to update activity: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
    }
    const updatedUser = await res.json();
    set((state) => ({
      users: state.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    }));
  },

  deleteUser: async (id) => {
    await fetch(`/api/settings/users/${id}`, { method: "DELETE" });
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
    }));
  },

  createShipping: async (option) => {
    const res = await fetch("/api/settings/shipping-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(option),
    });
    if (!res.ok) {
      throw new Error(`Failed to create shipping option: ${res.status} ${res.statusText}`);
    }
    const newOption = await res.json();
    set((state) => ({
      shippingOptions: [...state.shippingOptions, newOption],
    }));
  },

  updateShipping: async (option) => {
    await fetch(`/api/settings/shipping-options/${option.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(option),
    });
    set((state) => ({
      shippingOptions: state.shippingOptions.map((s) =>
        s.id === option.id ? { ...s, ...option } : s
      ),
    }));
  },

  deleteShipping: async (id) => {
    await fetch(`/api/settings/shipping-options/${id}`, { method: "DELETE" });
    set((state) => ({
      shippingOptions: state.shippingOptions.filter((s) => s.id !== id),
    }));
  },
}));

// Add these interfaces and store to your existing store.ts file

interface CustomerAuthState {
  customer: Customer | null;
  isLoading: boolean;
  wishlistItems: WishlistItem[];
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => void;
  verifyToken: () => Promise<void>;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string, variantId?: string) => Promise<{ success: boolean; message?: string }>;
  removeFromWishlist: (productId: string, variantId?: string) => Promise<{ success: boolean; message?: string }>;
  isInWishlist: (productId: string, variantId?: string) => boolean;
}

// Add these interfaces and store to your existing store.ts file

interface CustomerAuthState {
  customer: Customer | null;
  isLoading: boolean;
  wishlistItems: WishlistItem[];
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => void;
  verifyToken: () => Promise<void>;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string, variantId?: string) => Promise<{ success: boolean; message?: string }>;
  removeFromWishlist: (productId: string, variantId?: string) => Promise<{ success: boolean; message?: string }>;
  isInWishlist: (productId: string, variantId?: string) => boolean;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      isLoading: false,
      wishlistItems: [],

      signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'signin', email, password }),
          });

          const data = await response.json();

          if (data.success && data.customer && data.token) {
            localStorage.setItem('customerToken', data.token);
            set({ customer: data.customer });
            // Fetch wishlist after successful login
            await get().fetchWishlist();
          }

          return data;
        } catch (error) {
          console.error('[SIGNIN_ERROR]', error);
          return { success: false, message: 'An error occurred during sign in' };
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'signup', name, email, password }),
          });

          const data = await response.json();
          return data;
        } catch (error) {
          console.error('[SIGNUP_ERROR]', error);
          return { success: false, message: 'An error occurred during sign up' };
        } finally {
          set({ isLoading: false });
        }
      },

      verifyEmail: async (email: string, code: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify-email', email, code }),
          });

          const data = await response.json();

          if (data.success && data.customer && data.token) {
            localStorage.setItem('customerToken', data.token);
            set({ customer: data.customer });
            // Fetch wishlist after successful verification
            await get().fetchWishlist();
          }

          return data;
        } catch (error) {
          console.error('[VERIFY_EMAIL_ERROR]', error);
          return { success: false, message: 'An error occurred during email verification' };
        } finally {
          set({ isLoading: false });
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'forgot-password', email }),
          });

          const data = await response.json();
          return data;
        } catch (error) {
          console.error('[FORGOT_PASSWORD_ERROR]', error);
          return { success: false, message: 'An error occurred while sending reset email' };
        } finally {
          set({ isLoading: false });
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset-password', token, password }),
          });

          const data = await response.json();
          return data;
        } catch (error) {
          console.error('[RESET_PASSWORD_ERROR]', error);
          return { success: false, message: 'An error occurred while resetting password' };
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: () => {
        localStorage.removeItem('customerToken');
        set({ customer: null, wishlistItems: [] });
      },

      verifyToken: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        try {
          const response = await fetch('/api/auth/customer', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (data.success && data.customer) {
            set({ customer: data.customer });
            // Fetch wishlist after token verification
            await get().fetchWishlist();
          } else {
            localStorage.removeItem('customerToken');
            set({ customer: null, wishlistItems: [] });
          }
        } catch (error) {
          console.error('[VERIFY_TOKEN_ERROR]', error);
          localStorage.removeItem('customerToken');
          set({ customer: null, wishlistItems: [] });
        }
      },

      fetchWishlist: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        try {
          const response = await fetch('/api/wishlist', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (data.success) {
            set({ wishlistItems: data.wishlistItems });
          }
        } catch (error) {
          console.error('[FETCH_WISHLIST_ERROR]', error);
        }
      },

      addToWishlist: async (productId: string, variantId?: string) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          return { success: false, message: 'Please sign in to add items to wishlist' };
        }

        try {
          const response = await fetch('/api/wishlist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ productId, variantId }),
          });

          const data = await response.json();

          if (data.success) {
            // Refresh wishlist
            // Instead of re-fetching, optimistically update the state
            set((state) => ({
              wishlistItems: [...state.wishlistItems, data.wishlistItem],
            }));
          }

          return data;
        } catch (error) {
          console.error('[ADD_TO_WISHLIST_ERROR]', error);
          return { success: false, message: 'An error occurred while adding to wishlist' };
        }
      },

      removeFromWishlist: async (productId: string, variantId?: string) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          return { success: false, message: 'Please sign in to manage wishlist' };
        }

        try {
          const url = new URL('/api/wishlist', window.location.origin);
          url.searchParams.set('productId', productId);
          if (variantId) {
            url.searchParams.set('variantId', variantId);
          }

          const response = await fetch(url.toString(), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (data.success) {
            // Refresh wishlist
            set((state) => ({
              wishlistItems: state.wishlistItems.filter(item =>
                !(item.productId === productId && item.variantId === (variantId || null))
              ),
            }));
          }

          return data;
        } catch (error) {
          console.error('[REMOVE_FROM_WISHLIST_ERROR]', error);
          return { success: false, message: 'An error occurred while removing from wishlist' };
        }
      },

      isInWishlist: (productId: string, variantId?: string) => {
        const { wishlistItems } = get();
        return wishlistItems.some(item =>
          item.productId === productId &&
          (variantId ? item.variantId === variantId : item.variantId === null)
        );
      },
    }),
    {
      name: 'customerAuth',
      partialize: (state) => ({
        customer: state.customer,
        wishlistItems: state.wishlistItems,
      }),
    }
  )
);

// Updated store functions that need changes

export const useContentStore = create<ContentState>((set) => ({
  blogs: [],
  stories: [],

  fetchBlogs: async () => {
    try {
      const res = await fetch("/api/blogs");
      if (!res.ok) throw new Error(`Failed to fetch blogs: ${res.statusText}`);
      const blogs: Blog[] = await res.json();
      set({ blogs });
    } catch (error) {
      console.error("[FETCH_BLOGS]", error);
      throw error;
    }
  },

  fetchStories: async () => {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) throw new Error(`Failed to fetch stories: ${res.statusText}`);
      const stories: Story[] = await res.json();
      set({ stories });
    } catch (error) {
      console.error("[FETCH_STORIES]", error);
      throw error;
    }
  },

  addBlog: async (blog) => {
    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blog),
      });
      if (!res.ok) throw new Error(`Failed to add blog: ${res.statusText}`);

      // Refetch all blogs to ensure featured states are correct
      const blogsRes = await fetch("/api/blogs");
      const blogs: Blog[] = await blogsRes.json();
      set({ blogs });
    } catch (error) {
      console.error("[ADD_BLOG]", error);
      throw error;
    }
  },

  addStory: async (story) => {
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(story),
      });
      if (!res.ok) throw new Error(`Failed to add story: ${res.statusText}`);

      // Refetch all stories to ensure featured states are correct
      const storiesRes = await fetch("/api/stories");
      const stories: Story[] = await storiesRes.json();
      set({ stories });
    } catch (error) {
      console.error("[ADD_STORY]", error);
      throw error;
    }
  },

  updateBlog: async (slug, updatedBlog) => {
    try {
      const res = await fetch(`/api/blogs/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBlog),
      });
      if (!res.ok) throw new Error(`Failed to update blog: ${res.statusText}`);

      // Refetch all blogs to ensure featured states are correct
      const blogsRes = await fetch("/api/blogs");
      const blogs: Blog[] = await blogsRes.json();
      set({ blogs });
    } catch (error) {
      console.error("[UPDATE_BLOG]", error);
      throw error;
    }
  },

  updateStory: async (slug, updatedStory) => {
    try {
      const res = await fetch(`/api/stories/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedStory),
      });
      if (!res.ok) throw new Error(`Failed to update story: ${res.statusText}`);

      // Refetch all stories to ensure featured states are correct
      const storiesRes = await fetch("/api/stories");
      const stories: Story[] = await storiesRes.json();
      set({ stories });
    } catch (error) {
      console.error("[UPDATE_STORY]", error);
      throw error;
    }
  },

  deleteBlog: async (slug) => {
    try {
      const res = await fetch(`/api/blogs/${slug}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete blog");
      }

      set((state) => ({
        blogs: state.blogs.filter((b) => b.slug !== slug),
      }));
    } catch (error) {
      console.error("[DELETE_BLOG]", error);
      throw error;
    }
  },

  deleteStory: async (slug) => {
    try {
      const res = await fetch(`/api/stories/${slug}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete story");
      }

      set((state) => ({
        stories: state.stories.filter((s) => s.slug !== slug),
      }));
    } catch (error) {
      console.error("[DELETE_STORY]", error);
      throw error;
    }
  },
}));


export const useEventStore = create<EventState>((set) => ({
  events: [],

  fetchEvents: async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
      const events: Event[] = await res.json();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      for (const event of events) {
        const eventDate = new Date(event.date);
        if (event.status === "active" && eventDate < today) {
          try {
            await fetch(`/api/events/${event.slug}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...event, status: "ended" }),
            });
          } catch (error) {
            console.error(`[UPDATE_EVENT_STATUS_${event.slug}]`, error);
          }
        }
      }

      // Fetch updated events after status updates
      const updatedRes = await fetch("/api/events");
      if (!updatedRes.ok) throw new Error(`Failed to fetch updated events: ${updatedRes.statusText}`);
      const updatedEvents: Event[] = await updatedRes.json();
      set({ events: updatedEvents });
    } catch (error) {
      console.error("[FETCH_EVENTS]", error);
      throw error;
    }
  },

  addEvent: async (event) => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) throw new Error(`Failed to add event: ${res.statusText}`);

      // Refetch all events to ensure featured states are correct
      const eventsRes = await fetch("/api/events");
      const events: Event[] = await eventsRes.json();
      set({ events });
    } catch (error) {
      console.error("[ADD_EVENT]", error);
      throw error;
    }
  },

  updateEvent: async (slug, updatedEvent) => {
    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEvent),
      });
      if (!res.ok) throw new Error(`Failed to update event: ${res.statusText}`);

      // Refetch all events to ensure featured states are correct
      const eventsRes = await fetch("/api/events");
      const events: Event[] = await eventsRes.json();
      set({ events });
    } catch (error) {
      console.error("[UPDATE_EVENT]", error);
      throw error;
    }
  },

  deleteEvent: async (slug) => {
    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete event");
      }

      set((state) => ({
        events: state.events.filter((e) => e.slug !== slug),
      }));
    } catch (error) {
      console.error("[DELETE_EVENT]", error);
      throw error;
    }
  },
}));

