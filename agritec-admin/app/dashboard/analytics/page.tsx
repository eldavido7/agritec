"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  settings,
  orders,
  farmers,
  buyers,
  listings,
  payouts,
  platformCategories,
} from "@/lib/mock-data";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analytics } from "@/lib/mock-data";
import { TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `₦${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₦${(value / 1000).toFixed(0)}K`;
  }
  return `₦${value}`;
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded p-2">
        <p className="text-sm font-medium text-foreground">
          {payload[0].payload.month || payload[0].payload.name}
        </p>
        <p className="text-sm text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const CustomCurrencyTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded p-2">
        <p className="text-sm font-medium text-foreground">
          {payload[0].payload.name}
        </p>
        <p className="text-sm text-primary">
          ₦{(payload[0].value / 1000000).toFixed(1)}M
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  // Calculate key metrics
  const totalRevenue = orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );
  const commissionEarned = totalRevenue * (settings.commissionRate / 100);
  const platformFees = totalRevenue * (settings.platformFee / 100);
  const totalEarnings = commissionEarned + platformFees;
  const sellerSettlements = totalRevenue - totalEarnings;
  const avgOrderValue = totalRevenue / orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const inTransitOrders = orders.filter(
    (o) => o.status === "in_transit",
  ).length;

  // Payout analytics
  const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
  const completedPayouts = payouts.filter(
    (p) => p.status === "completed",
  ).length;
  const pendingPayouts = payouts.filter((p) => p.status === "pending").length;
  const inProgressPayouts = payouts.filter(
    (p) => p.status === "in_progress",
  ).length;

  // Seller analytics
  const topSellers = [...farmers]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5)
    .map((farmer) => ({
      name: farmer.name,
      sales: farmer.totalSales,
      orders: farmer.ordersCompleted,
      location: farmer.location,
    }));

  // Buyer analytics
  const topBuyers = [...buyers]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5)
    .map((buyer) => ({
      name: buyer.name,
      purchases: buyer.totalPurchases,
      orders: buyer.orderCount,
    }));

  // Product category breakdown
  const categoryBreakdown = platformCategories.map((category) => {
    const categoryListings = listings.filter(
      (listing) => listing.category === category.label,
    );
    return {
      name: category.label,
      count: categoryListings.length,
      value: categoryListings.reduce(
        (sum, listing) => sum + listing.pricePerUnit * listing.quantity,
        0,
      ),
    };
  });

  // Regional sales breakdown
  const regionSales = farmers.reduce(
    (acc, farmer) => {
      const existing = acc.find((r) => r.region === farmer.location);
      if (existing) {
        existing.sales += farmer.totalSales;
      } else {
        acc.push({ region: farmer.location, sales: farmer.totalSales });
      }
      return acc;
    },
    [] as Array<{ region: string; sales: number }>,
  ).sort((a, b) => b.sales - a.sales).slice(0, 10);

  // Order status distribution
  const orderStatusData = [
    { name: "Completed", value: completedOrders, color: "#10b981" },
    { name: "In Transit", value: inTransitOrders, color: "#3b82f6" },
    { name: "Pending", value: pendingOrders, color: "#f59e0b" },
  ];

  // Payout status distribution
  const payoutStatusData = [
    { name: "Completed", value: completedPayouts, color: "#10b981" },
    { name: "In Progress", value: inProgressPayouts, color: "#3b82f6" },
    { name: "Pending", value: pendingPayouts, color: "#f59e0b" },
  ];

  // Repeat customer analysis
  const repeatCustomers = buyers.filter((b) => b.orderCount > 1).length;
  const repeatRate = ((repeatCustomers / buyers.length) * 100).toFixed(1);

  // Active sellers
  const activeSellers = farmers.filter((f) => f.isActive).length;
  const activeBuyers = buyers.filter((b) => b.isActive).length;

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Marketplace insights and performance metrics
          </p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-linear-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalEarnings)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Commission + fees completed
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-green-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Processed
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes seller settlements
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-blue-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Active Sellers
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {activeSellers}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Total: {farmers.length} sellers
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-purple-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Active Buyers
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {activeBuyers}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Total: {buyers.length} buyers
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Commission Payments
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(commissionEarned)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">10% completed</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">Fee Payments</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(platformFees)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">2.5% completed</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Seller Settlements
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(sellerSettlements)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">87.5% of gross</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Avg Order Value
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(avgOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Completion Rate
            </p>
            <p className="text-lg font-bold text-green-600">
              {((completedOrders / orders.length) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Repeat Customers
            </p>
            <p className="text-lg font-bold text-blue-600">{repeatRate}%</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Pending Payouts
            </p>
            <p className="text-lg font-bold text-yellow-600">
              {formatShortCurrency(
                payouts
                  .filter((p) => p.status === "pending")
                  .reduce((sum, p) => sum + p.amount, 0),
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              Commission Rate
            </p>
            <p className="text-lg font-bold text-foreground">
              {settings.commissionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={analytics.monthlyRevenue}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `${formatShortCurrency(value)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: "var(--primary)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {orderStatusData.map((status) => (
                <div
                  key={status.name}
                  className="text-center p-2 border border-border/50 rounded"
                >
                  <p className="text-xs text-muted-foreground">{status.name}</p>
                  <p className="text-sm font-bold text-foreground">
                    {status.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers by Revenue */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Top Selling Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topSellers}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickFormatter={(value) => `${formatShortCurrency(value)}`}
                />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Bar dataKey="sales" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Categories */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Product Categories by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={categoryBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={95}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Sales Breakdown */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Sales by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={regionSales}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="region"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickFormatter={(value) => `${formatShortCurrency(value)}`}
                />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Bar dataKey="sales" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payout Status */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Payout Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payoutStatusData.map((status) => (
                <div key={status.name}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-foreground">
                      {status.name}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {status.value}
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(status.value / payouts.length) * 100}%`,
                        backgroundColor: status.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="border-t border-border/50 pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Disbursed
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(totalPayouts)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Pending Amount
                    </p>
                    <p className="text-lg font-bold text-yellow-600">
                      {formatCurrency(
                        payouts
                          .filter((p) => p.status === "pending")
                          .reduce((sum, p) => sum + p.amount, 0),
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Buyers */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Top Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50">
                  <tr className="text-muted-foreground">
                    <th className="text-left py-2 px-2">Buyer Name</th>
                    <th className="text-right py-2 px-2">Total Purchases</th>
                    <th className="text-right py-2 px-2">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {topBuyers.map((buyer, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <p className="font-medium text-foreground">
                          {buyer.name}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-foreground">
                        {formatCurrency(buyer.purchases)}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {buyer.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Seller Performance Rankings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Seller Performance Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellers.map((seller, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {seller.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {seller.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(seller.sales)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {seller.orders} orders
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{
                        width: `${(seller.sales / topSellers[0].sales) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Commission Rate",
                value: `${settings.commissionRate}%`,
                sublabel: "of transaction value",
              },
              {
                label: "Platform Fee",
                value: `${settings.platformFee}%`,
                sublabel: "transaction fee",
              },
              {
                label: "Total Commission",
                value: formatCurrency(commissionEarned),
                sublabel: "earned this period",
              },
              {
                label: "Total Payouts",
                value: formatCurrency(totalPayouts),
                sublabel: "to sellers",
              },
              {
                label: "Avg Seller Sales",
                value: formatCurrency(totalRevenue / farmers.length),
                sublabel: "per seller",
              },
              {
                label: "Avg Buyer Spend",
                value: formatCurrency(totalRevenue / buyers.length),
                sublabel: "per buyer",
              },
              {
                label: "Orders This Period",
                value: orders.length,
                sublabel: `${completedOrders} completed`,
              },
              {
                label: "Active Marketplace",
                value: `${activeSellers}/${farmers.length}`,
                sublabel: "sellers active",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="p-4 border border-border/50 rounded-lg bg-muted/30"
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.sublabel}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
