import {
  SellerOrderGroupRecord,
  SellerParentOrderSnapshot,
} from "@/stores/seller-orders-store";
import {
  SellerProductRecord,
  SellerProductVariantRecord,
} from "@/stores/seller-products-store";

export type SellerRevenuePoint = {
  month: string;
  revenue: number;
};

export type SellerProductSalesPoint = {
  name: string;
  sales: number;
  orders: number;
  units: number;
};

export type SellerTopProductPoint = {
  name: string;
  units: number;
};

export type SellerLowStockItem = {
  id: string;
  productName: string;
  variantName: string | null;
  inventory: number;
  category: string;
};

export type SellerCustomerRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: Date | null;
};

export type SellerDashboardSummary = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  activeProducts: number;
  activeCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  monthlyRevenue: SellerRevenuePoint[];
  productSales: SellerProductSalesPoint[];
  topProducts: SellerTopProductPoint[];
  lowStockItems: SellerLowStockItem[];
  customers: SellerCustomerRecord[];
  recentOrderGroups: SellerOrderGroupRecord[];
};

type ProductAggregate = {
  name: string;
  sales: number;
  orders: Set<string>;
  units: number;
};

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short" });

function normalizeDate(value?: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

function locationFromSnapshot(parentOrder: SellerParentOrderSnapshot) {
  const parts = [
    parentOrder.addressSnapshot?.city,
    parentOrder.addressSnapshot?.state,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return parentOrder.addressSnapshot?.addressLine || "Unknown location";
}

function customerKey(parentOrder: SellerParentOrderSnapshot) {
  return (
    parentOrder.buyerId ||
    parentOrder.buyerEmailSnapshot ||
    parentOrder.buyerPhoneSnapshot ||
    parentOrder.buyerNameSnapshot ||
    parentOrder.id
  );
}

function customerName(parentOrder: SellerParentOrderSnapshot) {
  return parentOrder.buyerNameSnapshot || "Marketplace buyer";
}

function buildCustomerRecords(orderGroups: SellerOrderGroupRecord[]) {
  const customerMap = new Map<string, SellerCustomerRecord>();

  for (const group of orderGroups) {
    const parentOrder = group.parentOrder;
    const key = String(customerKey(parentOrder));
    const orderDate = normalizeDate(parentOrder.createdAt || group.createdAt);
    const current = customerMap.get(key);

    if (!current) {
      customerMap.set(key, {
        id: key,
        name: customerName(parentOrder),
        email: parentOrder.buyerEmailSnapshot || null,
        phone: parentOrder.buyerPhoneSnapshot || null,
        location: locationFromSnapshot(parentOrder),
        totalOrders: 1,
        totalSpent: group.groupTotal,
        lastOrder: orderDate,
      });
      continue;
    }

    current.totalOrders += 1;
    current.totalSpent += group.groupTotal;
    current.location = current.location || locationFromSnapshot(parentOrder);
    if (!current.email && parentOrder.buyerEmailSnapshot) {
      current.email = parentOrder.buyerEmailSnapshot;
    }
    if (!current.phone && parentOrder.buyerPhoneSnapshot) {
      current.phone = parentOrder.buyerPhoneSnapshot;
    }
    if (orderDate && (!current.lastOrder || orderDate > current.lastOrder)) {
      current.lastOrder = orderDate;
    }
  }

  return Array.from(customerMap.values()).sort((a, b) => {
    const aTime = a.lastOrder?.getTime() || 0;
    const bTime = b.lastOrder?.getTime() || 0;
    return bTime - aTime;
  });
}

function buildProductSales(orderGroups: SellerOrderGroupRecord[]) {
  const salesMap = new Map<string, ProductAggregate>();

  for (const group of orderGroups) {
    for (const item of group.items) {
      const key = item.productTitleSnapshot || item.productId || item.id;
      const current = salesMap.get(key) || {
        name: item.productTitleSnapshot || "Untitled product",
        sales: 0,
        orders: new Set<string>(),
        units: 0,
      };

      current.sales += item.lineTotal;
      current.units += item.quantity;
      current.orders.add(group.id);
      salesMap.set(key, current);
    }
  }

  return Array.from(salesMap.values())
    .map((entry) => ({
      name: entry.name,
      sales: entry.sales,
      orders: entry.orders.size,
      units: entry.units,
    }))
    .sort((a, b) => b.sales - a.sales);
}

function buildMonthlyRevenue(orderGroups: SellerOrderGroupRecord[]) {
  const now = new Date();
  const buckets: SellerRevenuePoint[] = [];

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      month: monthLabel.format(date),
      revenue: 0,
    });
  }

  const bucketIndex = new Map<string, number>();
  buckets.forEach((bucket, index) => {
    bucketIndex.set(bucket.month, index);
  });

  for (const group of orderGroups) {
    const createdAt = normalizeDate(group.createdAt || group.parentOrder.createdAt);
    if (!createdAt) continue;

    const key = monthLabel.format(createdAt);
    const index = bucketIndex.get(key);
    if (index == null) continue;
    buckets[index].revenue += group.groupTotal;
  }

  return buckets;
}

function calculateGrowth(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function buildLowStockItems(products: SellerProductRecord[]) {
  const items: SellerLowStockItem[] = [];

  for (const product of products) {
    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (variants.length > 0) {
      variants.forEach((variant: SellerProductVariantRecord, index) => {
        if (variant.inventory <= 10) {
          items.push({
            id: `${product.id}-${variant.id || index}`,
            productName: product.name,
            variantName: variant.name,
            inventory: variant.inventory,
            category: product.category,
          });
        }
      });
      continue;
    }

    if (product.inventory <= 10) {
      items.push({
        id: product.id,
        productName: product.name,
        variantName: null,
        inventory: product.inventory,
        category: product.category,
      });
    }
  }

  return items.sort((a, b) => a.inventory - b.inventory);
}

export function buildSellerDashboardSummary(
  products: SellerProductRecord[],
  orderGroups: SellerOrderGroupRecord[],
): SellerDashboardSummary {
  const customers = buildCustomerRecords(orderGroups);
  const productSales = buildProductSales(orderGroups);
  const monthlyRevenue = buildMonthlyRevenue(orderGroups);
  const lowStockItems = buildLowStockItems(products);
  const totalRevenue = orderGroups.reduce((sum, group) => sum + group.groupTotal, 0);
  const totalOrders = orderGroups.length;
  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.status === "Active").length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const currentMonthRevenue = monthlyRevenue.at(-1)?.revenue || 0;
  const previousMonthRevenue = monthlyRevenue.at(-2)?.revenue || 0;

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const previousMonthStart = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() - 1,
    1,
  );

  const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);

  const currentMonthOrders = orderGroups.filter((group) => {
    const createdAt = normalizeDate(group.createdAt || group.parentOrder.createdAt);
    return createdAt ? createdAt >= currentMonthStart : false;
  }).length;

  const previousMonthOrders = orderGroups.filter((group) => {
    const createdAt = normalizeDate(group.createdAt || group.parentOrder.createdAt);
    return createdAt
      ? createdAt >= previousMonthStart && createdAt <= previousMonthEnd
      : false;
  }).length;

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    activeProducts,
    activeCustomers: customers.length,
    avgOrderValue,
    revenueGrowth: calculateGrowth(currentMonthRevenue, previousMonthRevenue),
    orderGrowth: calculateGrowth(currentMonthOrders, previousMonthOrders),
    monthlyRevenue,
    productSales,
    topProducts: productSales
      .map((entry) => ({ name: entry.name, units: entry.units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5),
    lowStockItems,
    customers,
    recentOrderGroups: [...orderGroups].sort((a, b) => {
      const aTime = normalizeDate(a.createdAt || a.parentOrder.createdAt)?.getTime() || 0;
      const bTime = normalizeDate(b.createdAt || b.parentOrder.createdAt)?.getTime() || 0;
      return bTime - aTime;
    }),
  };
}
