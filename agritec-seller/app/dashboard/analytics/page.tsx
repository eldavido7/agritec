"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency, formatCompactNumber } from "@/lib/formatting";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { useSellerProductsStore } from "@/stores/seller-products-store";
import { useSellerOrdersStore } from "@/stores/seller-orders-store";
import { buildSellerDashboardSummary } from "@/lib/seller-reporting";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AnalyticsPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
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

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="mt-2 text-muted-foreground">
            Detailed insights into {sellerProfile?.farmName ?? "your farm"}&apos;s marketplace performance.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid w-full grid-cols-1 gap-6 md:grid-cols-4"
      >
        {[
          {
            label: "Total Revenue",
            value: formatCompactNumber(summary.totalRevenue),
            color: "text-primary",
          },
          {
            label: "Avg Order Value",
            value: formatCompactNumber(summary.avgOrderValue),
            color: "text-secondary",
          },
          {
            label: "Revenue Growth",
            value: `${summary.revenueGrowth}%`,
            color: summary.revenueGrowth >= 0 ? "text-green-600" : "text-red-600",
          },
          {
            label: "Order Growth",
            value: `${summary.orderGrowth}%`,
            color: summary.orderGrowth >= 0 ? "text-blue-600" : "text-red-600",
          },
        ].map((metric) => (
          <motion.div key={metric.label} variants={itemVariants}>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className={`mt-2 text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Monthly Revenue Trend
            </h3>
            {isLoading ? (
              <div className="flex h-87.5 items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
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
                    strokeWidth={3}
                    dot={{ fill: "var(--primary)", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Sales by Product
            </h3>
            {isLoading ? (
              <div className="flex h-87.5 items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={summary.productSales.slice(0, 8)}>
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

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="mb-6 text-lg font-semibold text-foreground">
            Product Performance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Total Sales
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Avg Order Value
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.productSales.map((product) => {
                  const percentage = summary.totalRevenue > 0
                    ? ((product.sales / summary.totalRevenue) * 100).toFixed(1)
                    : "0.0";
                  const avgValue = product.orders > 0
                    ? Math.round(product.sales / product.orders)
                    : 0;
                  return (
                    <tr
                      key={product.name}
                      className="border-b border-border transition-colors hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatCurrency(product.sales)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{product.orders}</td>
                      <td className="px-4 py-3 text-foreground">
                        {formatCurrency(avgValue)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
                {summary.productSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No analytics data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Top Products by Units Sold
          </h3>
          {isLoading ? (
            <div className="flex h-87.5 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => `${value} units`}
                />
                <Bar dataKey="units" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
