"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import KPICard from "@/components/dashboard/kpi-card";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  formatCurrency,
  formatCompactNumber,
  formatDate,
} from "@/lib/formatting";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { useSellerProductsStore } from "@/stores/seller-products-store";
import {
  SellerOrderGroupRecord,
  useSellerOrdersStore,
} from "@/stores/seller-orders-store";
import { buildSellerDashboardSummary } from "@/lib/seller-reporting";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const getStatusColor = (status: string) => {
  const normalized = status.toUpperCase();
  const colors: Record<string, string> = {
    DELIVERED:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    SHIPPED:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    PROCESSING:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
    PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  };
  return colors[normalized] || colors.PENDING;
};

export default function DashboardPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
  const sellerName = useSellerAuthStore((state) => state.user?.fullName);
  const {
    products,
    isLoading: isProductsLoading,
    fetchProducts,
  } = useSellerProductsStore((state) => state);
  const {
    orderGroups,
    isLoading: isOrdersLoading,
    fetchOrderGroups,
  } = useSellerOrdersStore((state) => state);

  const [selectedOrderGroup, setSelectedOrderGroup] =
    useState<SellerOrderGroupRecord | null>(null);

  useEffect(() => {
    if (!authReady || !sellerProfile) return;
    void fetchProducts();
    void fetchOrderGroups();
  }, [authReady, sellerProfile, fetchProducts, fetchOrderGroups]);

  const summary = useMemo(
    () => buildSellerDashboardSummary(products, orderGroups),
    [products, orderGroups],
  );

  const isLoading = isProductsLoading || isOrdersLoading;
  const formatTimelineDate = (value?: Date) =>
    value
      ? value.toLocaleString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "-";

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <p className="mt-2 text-muted-foreground">
          Welcome back{sellerName ? `, ${sellerName}` : ""}. Here&apos;s your
          current marketplace performance for {sellerProfile?.farmName ?? "your farm"}.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <KPICard
            label="Total Revenue"
            value={formatCompactNumber(summary.totalRevenue)}
            icon={TrendingUp}
            trend={{ value: summary.revenueGrowth, isPositive: summary.revenueGrowth >= 0 }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            label="Total Orders"
            value={summary.totalOrders}
            icon={ShoppingCart}
            trend={{ value: summary.orderGrowth, isPositive: summary.orderGrowth >= 0 }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            label="Active Products"
            value={summary.activeProducts}
            icon={Package}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            label="Active Customers"
            value={summary.activeCustomers}
            icon={Users}
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Revenue Trend
            </h3>
            {isLoading ? (
              <div className="flex h-75 items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={summary.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    tickFormatter={(value) => formatCompactNumber(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--primary)", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Product Sales
            </h3>
            {isLoading ? (
              <div className="flex h-75 items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.productSales.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    tickFormatter={(value) => formatCompactNumber(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="sales" fill="var(--secondary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Top Performing Products
            </h3>
            <div className="space-y-3">
              {summary.productSales.slice(0, 4).map((product) => {
                const width = summary.totalRevenue > 0
                  ? `${Math.max(8, (product.sales / summary.totalRevenue) * 100)}%`
                  : "8%";

                return (
                  <div
                    key={product.name}
                    className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {product.name}
                      </p>
                      <div className="mt-1 h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width }}
                        />
                      </div>
                    </div>
                    <span className="ml-2 whitespace-nowrap text-xs font-semibold text-primary">
                      {formatCompactNumber(product.sales)}
                    </span>
                  </div>
                );
              })}
              {summary.productSales.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No product sales yet.
                </p>
              ) : null}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full p-6">
            <div className="mb-6 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg font-semibold text-foreground">
                Low Stock Alerts
              </h3>
              {summary.lowStockItems.length > 0 ? (
                <span className="ml-auto rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                  {summary.lowStockItems.length} items
                </span>
              ) : null}
            </div>
            {summary.lowStockItems.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {summary.lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.productName}
                        </p>
                        {item.variantName ? (
                          <p className="text-xs text-muted-foreground">
                            {item.variantName}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-200">
                          {item.inventory} units remaining
                        </p>
                      </div>
                      <span className="ml-2 whitespace-nowrap rounded bg-yellow-200 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  All products have sufficient inventory.
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Recent Orders
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Order Group
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Buyer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.recentOrderGroups.slice(0, 8).map((group) => (
                  <tr
                    key={group.id}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-secondary/50 hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                    onClick={() => setSelectedOrderGroup(group)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      #{group.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {group.parentOrder.buyerNameSnapshot || "Marketplace buyer"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {group.items.map((item) => item.productTitleSnapshot).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      {formatCurrency(group.groupTotal)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(group.status)}`}>
                        {group.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {summary.recentOrderGroups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {selectedOrderGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6"
          >
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-foreground">
                Order Group #{selectedOrderGroup.id}
              </h2>
              <button
                onClick={() => setSelectedOrderGroup(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Buyer</p>
                <p className="font-semibold text-foreground">
                  {selectedOrderGroup.parentOrder.buyerNameSnapshot || "Marketplace buyer"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Status</p>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(selectedOrderGroup.status)}`}>
                  {selectedOrderGroup.status}
                </span>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Order Date</p>
                <p className="font-semibold text-foreground">
                  {formatDate(selectedOrderGroup.parentOrder.createdAt || selectedOrderGroup.createdAt || new Date())}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Assigned Logistics</p>
                <p className="font-semibold text-foreground">
                  {selectedOrderGroup.logisticsCompany?.companyName || "Not assigned yet"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Delivery Region</p>
                <p className="font-semibold text-foreground">
                  {selectedOrderGroup.deliveryRegion || "Not set"}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <h3 className="mb-4 font-semibold text-foreground">
                Delivery Timeline
              </h3>
              {selectedOrderGroup.statusHistory.length > 0 ? (
                <div className="space-y-3">
                  {selectedOrderGroup.statusHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg bg-muted/30 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {entry.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(entry.updatedByUser?.fullName || "System")}{" "}
                            {entry.updatedByRole ? `(${entry.updatedByRole})` : ""}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTimelineDate(entry.createdAt)}
                        </p>
                      </div>
                      {entry.description ? (
                        <p className="mt-2 text-sm text-foreground">{entry.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No delivery timeline updates recorded yet.
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <h3 className="mb-4 font-semibold text-foreground">
                Items
              </h3>
              <div className="space-y-3">
                {selectedOrderGroup.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-lg bg-muted/30 p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.productTitleSnapshot}
                      </p>
                      {item.variantTitleSnapshot ? (
                        <p className="text-sm text-muted-foreground">
                          {item.variantTitleSnapshot}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.salesUnitSnapshot || "unit"}
                      </p>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Product subtotal</span>
                  <span>{formatCurrency(selectedOrderGroup.productSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span>{formatCurrency(selectedOrderGroup.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span>-{formatCurrency(selectedOrderGroup.discountTotal)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
                  <span>Group total</span>
                  <span className="text-primary">{formatCurrency(selectedOrderGroup.groupTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border pt-4 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedOrderGroup(null)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
