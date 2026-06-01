"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { getSellerMockData } from "@/lib/mock-data";
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
  Legend,
  ResponsiveContainer,
} from "recharts";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const COLORS = ["#15803D", "#EA580C"];

export default function AnalyticsPage() {
  const seller = getSellerMockData();
  const sellerAnalytics = seller.analytics;
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="text-muted-foreground mt-2">
            Detailed insights into {seller.farmName}&apos;s performance
          </p>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full"
      >
        {[
          {
            label: "Total Revenue",
            value: formatCompactNumber(sellerAnalytics.totalRevenue),
            color: "text-primary",
          },
          {
            label: "Avg Order Value",
            value: formatCompactNumber(sellerAnalytics.avgOrderValue),
            color: "text-secondary",
          },
          {
            label: "Revenue Growth",
            value: `${sellerAnalytics.revenueGrowth}%`,
            color: "text-green-600",
          },
          {
            label: "Order Growth",
            value: `${sellerAnalytics.orderGrowth}%`,
            color: "text-blue-600",
          },
        ].map((metric, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className={`text-2xl font-bold ${metric.color} mt-2`}>
                {metric.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full"
      >
        {/* Monthly Revenue Trend */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Monthly Revenue Trend
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={sellerAnalytics.monthlyRevenue}>
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
                  formatter={(value) => formatCurrency(value as number)}
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
          </Card>
        </motion.div>

        {/* Product Sales Breakdown */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Sales by Product
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sellerAnalytics.productSales}>
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
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar
                  dataKey="sales"
                  fill="var(--secondary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </motion.div>

      {/* Detailed Product Analysis */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Product Performance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Product Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Total Sales
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Orders
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Avg Order Value
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {sellerAnalytics.productSales.map((product) => {
                  const percentage = (
                    (product.sales / sellerAnalytics.totalRevenue) *
                    100
                  ).toFixed(1);
                  const avgValue = Math.round(product.sales / product.orders);
                  return (
                    <tr
                      key={product.name}
                      className="border-b border-border hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {product.name}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatCurrency(product.sales)}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {product.orders}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatCurrency(avgValue)}
                      </td>
                      <td className="py-3 px-4 text-foreground font-semibold">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Top Products by Units */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Top Products by Units Sold
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sellerAnalytics.topProducts}>
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
              <Bar
                dataKey="units"
                fill="var(--primary)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>
    </div>
  );
}
