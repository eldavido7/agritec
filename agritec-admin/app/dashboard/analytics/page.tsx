"use client";

import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminBuyersStore } from "@/stores/admin-buyers-store";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { useAdminPayoutsStore } from "@/stores/admin-payouts-store";
import { useAdminSellersStore } from "@/stores/admin-sellers-store";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";

function formatCurrency(value: number) {
  if (value >= 1000000) {
    return `₦${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₦${(value / 1000).toFixed(0)}K`;
  }
  return `₦${value}`;
}

function formatShortCurrency(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return String(value);
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-card p-2">
      <p className="text-sm font-medium text-foreground">
        {payload[0].payload.month || payload[0].payload.name}
      </p>
      <p className="text-sm text-primary">
        {formatCurrency(Number(payload[0].value || 0))}
      </p>
    </div>
  );
};

export default function AnalyticsPage() {
  const sellers = useAdminSellersStore((state) => state.sellers);
  const buyers = useAdminBuyersStore((state) => state.buyers);
  const orders = useAdminOrdersStore((state) => state.orders);
  const payouts = useAdminPayoutsStore((state) => state.payouts);
  const settings = useAdminSettingsStore((state) => state.settings);

  const fetchSellers = useAdminSellersStore((state) => state.fetchSellers);
  const fetchBuyers = useAdminBuyersStore((state) => state.fetchBuyers);
  const fetchOrders = useAdminOrdersStore((state) => state.fetchOrders);
  const fetchPayouts = useAdminPayoutsStore((state) => state.fetchPayouts);
  const fetchSettings = useAdminSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    void fetchSellers();
    void fetchBuyers();
    void fetchOrders();
    void fetchPayouts();
    void fetchSettings();
  }, [fetchBuyers, fetchOrders, fetchPayouts, fetchSellers, fetchSettings]);

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.grandTotal, 0),
    [orders],
  );
  const totalCommission = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          order.sellerGroups.reduce(
            (groupSum, group) => groupSum + group.platformCommissionAmount,
            0,
          ),
        0,
      ),
    [orders],
  );
  const sellerSettlements = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          order.sellerGroups.reduce(
            (groupSum, group) => groupSum + group.sellerEarningsAmount,
            0,
          ),
        0,
      ),
    [orders],
  );
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const orderStatusData = useMemo(() => {
    const groups = orders.flatMap((order) => order.sellerGroups);
    const pending = groups.filter((group) => group.status === "PENDING").length;
    const inProgress = groups.filter((group) =>
      ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(group.status),
    ).length;
    const delivered = groups.filter((group) => group.status === "DELIVERED").length;
    const cancelled = groups.filter((group) =>
      ["CANCELLED", "REFUNDED"].includes(group.status),
    ).length;
    return [
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Delivered", value: delivered, color: "#10b981" },
      { name: "Cancelled", value: cancelled, color: "#ef4444" },
    ];
  }, [orders]);

  const payoutStatusData = useMemo(() => {
    const statuses = [
      { name: "Pending", key: "PENDING", color: "#f59e0b" },
      { name: "Processing", key: "PROCESSING", color: "#3b82f6" },
      { name: "Completed", key: "COMPLETED", color: "#10b981" },
      { name: "Failed", key: "FAILED", color: "#ef4444" },
    ] as const;

    return statuses.map((status) => ({
      name: status.name,
      color: status.color,
      value: payouts.filter((payout) => payout.status === status.key).length,
    }));
  }, [payouts]);

  const monthlyRevenue = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat("en-NG", { month: "short" });
    const buckets = new Map<string, { revenue: number; commission: number }>();
    orders.forEach((order) => {
      const month = monthFormatter.format(new Date(order.createdAt));
      const current = buckets.get(month) || { revenue: 0, commission: 0 };
      current.revenue += order.grandTotal;
      current.commission += order.sellerGroups.reduce(
        (sum, group) => sum + group.platformCommissionAmount,
        0,
      );
      buckets.set(month, current);
    });

    return Array.from(buckets.entries()).map(([month, values]) => ({
      month,
      revenue: values.revenue,
      commission: values.commission,
    }));
  }, [orders]);

  const topSellers = useMemo(() => {
    const sellerTotals = new Map<
      string,
      { name: string; location: string; sales: number; groups: number }
    >();

    orders.flatMap((order) => order.sellerGroups).forEach((group) => {
      const existing = sellerTotals.get(group.sellerId) || {
        name: group.sellerNameSnapshot,
        location:
          sellers.find((seller) => seller.id === group.sellerId)?.state || "N/A",
        sales: 0,
        groups: 0,
      };
      existing.sales += group.groupTotal;
      existing.groups += 1;
      sellerTotals.set(group.sellerId, existing);
    });

    return Array.from(sellerTotals.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [orders, sellers]);

  const topBuyers = useMemo(() => {
    const buyerTotals = new Map<string, { name: string; spend: number; orders: number }>();
    orders.forEach((order) => {
      const existing = buyerTotals.get(order.buyerId) || {
        name: order.buyerNameSnapshot,
        spend: 0,
        orders: 0,
      };
      existing.spend += order.grandTotal;
      existing.orders += 1;
      buyerTotals.set(order.buyerId, existing);
    });

    return Array.from(buyerTotals.values())
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [orders]);

  const sellerRegions = useMemo(() => {
    const buckets = new Map<string, number>();
    sellers.forEach((seller) => {
      const region = seller.state || seller.city || "Unspecified";
      buckets.set(region, (buckets.get(region) || 0) + 1);
    });
    return Array.from(buckets.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [sellers]);

  const repeatCustomers = useMemo(() => {
    const buyersWithRepeatOrders = topBuyers.filter((buyer) => buyer.orders > 1).length;
    return buyers.length > 0 ? (buyersWithRepeatOrders / buyers.length) * 100 : 0;
  }, [buyers.length, topBuyers]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mt-1 text-muted-foreground">
          Marketplace insights from live sellers, buyers, orders, payouts, and settings data
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-linear-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Combined buyer payments</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-green-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Commission Earned</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalCommission)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {settings ? `${settings.commission.commissionRatePercent}% server-side rate` : "Platform commission"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-blue-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Active Sellers</p>
                <p className="text-2xl font-bold text-foreground">
                  {sellers.filter((seller) => seller.isActive).length}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Total: {sellers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-linear-to-br from-purple-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Active Buyers</p>
                <p className="text-2xl font-bold text-foreground">
                  {buyers.filter((buyer) => buyer.isActive).length}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Total: {buyers.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-xs text-muted-foreground">Seller Settlements</p><p className="text-lg font-bold text-foreground">{formatCurrency(sellerSettlements)}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-xs text-muted-foreground">Average Order Value</p><p className="text-lg font-bold text-foreground">{formatCurrency(averageOrderValue)}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-xs text-muted-foreground">Pending Payouts</p><p className="text-lg font-bold text-yellow-600">{payouts.filter((payout) => payout.status === "PENDING").length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-xs text-muted-foreground">Repeat Buyers</p><p className="text-lg font-bold text-blue-600">{repeatCustomers.toFixed(1)}%</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><p className="mb-1 text-xs text-muted-foreground">Auto Payout Threshold</p><p className="text-lg font-bold text-foreground">{formatCurrency(settings?.payout.autoPayoutThreshold || 0)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} tickFormatter={(value) => formatShortCurrency(Number(value))} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} name="GMV" />
                <Line type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2} name="Commission" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Seller Group Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {orderStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Top Sellers By Fulfilled Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSellers} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--muted-foreground)" tickFormatter={(value) => formatShortCurrency(Number(value))} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Seller Location Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sellerRegions} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--muted-foreground)" />
                <YAxis dataKey="region" type="category" width={75} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Top Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50">
                  <tr className="text-muted-foreground">
                    <th className="px-2 py-2 text-left">Buyer Name</th>
                    <th className="px-2 py-2 text-right">Spend</th>
                    <th className="px-2 py-2 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {topBuyers.map((buyer) => (
                    <tr key={buyer.name} className="hover:bg-muted/30">
                      <td className="px-2 py-2 font-medium text-foreground">{buyer.name}</td>
                      <td className="px-2 py-2 text-right font-semibold text-foreground">{formatCurrency(buyer.spend)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{buyer.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Payout Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payoutStatusData.map((status) => (
                <div key={status.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{status.name}</p>
                    <p className="text-sm text-muted-foreground">{status.value}</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${payouts.length > 0 ? (status.value / payouts.length) * 100 : 0}%`,
                        backgroundColor: status.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
