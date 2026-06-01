"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import KPICard from "@/components/dashboard/kpi-card";
import { getSellerMockData, mockOrders } from "@/lib/mock-data";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Eye,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatCompactNumber,
  formatDate,
} from "@/lib/formatting";

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
  const colors: Record<string, string> = {
    Delivered:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    "In Transit":
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    Processing:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    Pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  };
  return colors[status] || colors.Pending;
};

type Order = (typeof mockOrders)[0];
type LowStockItem = {
  id: string | number;
  productName: string;
  variantName: string | null;
  inventory: number;
  category: string;
};

export default function DashboardPage() {
  const seller = getSellerMockData();
  const sellerAnalytics = seller.analytics;
  const sellerProducts = seller.products;
  const sellerOrders = seller.orders;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const getLowStockItems = () => {
    const lowStock: LowStockItem[] = [];
    sellerProducts.forEach((product: any) => {
      if (product.variants) {
        product.variants.forEach((variant: any) => {
          if (variant.inventory <= 10) {
            lowStock.push({
              id: `${product.id}-${variant.id}`,
              productName: product.name,
              variantName: variant.name,
              inventory: variant.inventory,
              category: product.category,
            });
          }
        });
      } else if (product.inventory <= 10) {
        lowStock.push({
          id: product.id,
          productName: product.name,
          variantName: null,
          inventory: product.inventory,
          category: product.category,
        });
      }
    });
    return lowStock;
  };

  const lowStockItems = getLowStockItems();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here&apos;s your farm&apos;s performance overview.
          {" "}Viewing {seller.farmName}.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants}>
          <KPICard
            label="Total Revenue"
            value={formatCompactNumber(sellerAnalytics.totalRevenue)}
            icon={TrendingUp}
            trend={{ value: sellerAnalytics.revenueGrowth, isPositive: true }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            label="Total Orders"
            value={sellerAnalytics.totalOrders}
            icon={ShoppingCart}
            trend={{ value: sellerAnalytics.orderGrowth, isPositive: true }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            label="Active Products"
            value={sellerAnalytics.totalProducts}
            icon={Package}
            trend={{ value: 0, isPositive: true }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            label="Active Customers"
            value={sellerAnalytics.activeCustomers}
            icon={Users}
            trend={{ value: 15, isPositive: true }}
          />
        </motion.div>
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Revenue Trend */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Revenue Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
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
                  strokeWidth={2}
                  dot={{ fill: "var(--primary)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Product Sales */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Product Sales
            </h3>
            <ResponsiveContainer width="100%" height={300}>
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

      {/* Charts Row 2 */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Top Products */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Top Performing Products
            </h3>
            <div className="space-y-3">
              {sellerAnalytics.productSales.slice(0, 4).map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(product.sales / sellerAnalytics.totalRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary ml-2 whitespace-nowrap">
                    {formatCompactNumber(product.sales)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="p-6 h-full">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg font-semibold text-foreground">
                Low Stock Alerts
              </h3>
              {lowStockItems.length > 0 && (
                <span className="ml-auto text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full font-medium">
                  {lowStockItems.length} items
                </span>
              )}
            </div>
            {lowStockItems.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.productName}
                        </p>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">
                            {item.variantName}
                          </p>
                        )}
                        <p className="text-xs text-yellow-700 dark:text-yellow-200 mt-1">
                          {item.inventory} units remaining
                        </p>
                      </div>
                      <span className="text-xs bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 px-2 py-1 rounded font-medium whitespace-nowrap ml-2">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  All products have sufficient inventory
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Orders Table */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Orders
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Order ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Buyer
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sellerOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border hover:bg-secondary/50 hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedOrder(order);
                      setImageIndex(0);
                    }}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {order.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {order.buyer}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {order.product}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-foreground">
                Order Details
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                <p className="font-semibold text-foreground">
                  {selectedOrder.id}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                <p className="font-semibold text-foreground">
                  {formatDate(selectedOrder.date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Expected Delivery
                </p>
                <p className="font-semibold text-foreground">
                  {formatDate(selectedOrder.deliveryDate)}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4">
                Product Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-foreground">Product:</span>
                  <span className="font-medium text-foreground">
                    {selectedOrder.product}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Variant:</span>
                  <span className="font-medium text-foreground">
                    {selectedOrder.variant}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Quantity:</span>
                  <span className="font-medium text-foreground">
                    {selectedOrder.quantity} units
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-foreground font-semibold">Buyer:</span>
                  <span className="font-medium text-foreground">
                    {selectedOrder.buyer}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">
                  Total Amount:
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(selectedOrder.price)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
