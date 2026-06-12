"use client";

import { useEffect, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CreditCard,
  MessageCircle,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAdminBuyersStore } from "@/stores/admin-buyers-store";
import { useAdminMessagesStore } from "@/stores/admin-messages-store";
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

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-card p-2">
      <p className="text-sm font-medium text-foreground">
        {payload[0].payload.month}
      </p>
      <p className="text-sm text-primary">
        {formatCurrency(Number(payload[0].value || 0))}
      </p>
    </div>
  );
};

export default function DashboardPage() {
  const sellers = useAdminSellersStore((state) => state.sellers);
  const buyers = useAdminBuyersStore((state) => state.buyers);
  const orders = useAdminOrdersStore((state) => state.orders);
  const payouts = useAdminPayoutsStore((state) => state.payouts);
  const conversations = useAdminMessagesStore((state) => state.conversations);
  const settings = useAdminSettingsStore((state) => state.settings);

  const fetchSellers = useAdminSellersStore((state) => state.fetchSellers);
  const fetchBuyers = useAdminBuyersStore((state) => state.fetchBuyers);
  const fetchOrders = useAdminOrdersStore((state) => state.fetchOrders);
  const fetchPayouts = useAdminPayoutsStore((state) => state.fetchPayouts);
  const fetchConversations = useAdminMessagesStore((state) => state.fetchConversations);
  const fetchSettings = useAdminSettingsStore((state) => state.fetchSettings);
  const isSellersLoading = useAdminSellersStore((state) => state.isLoading);
  const isBuyersLoading = useAdminBuyersStore((state) => state.isLoading);
  const isOrdersLoading = useAdminOrdersStore((state) => state.isLoading);
  const isPayoutsLoading = useAdminPayoutsStore((state) => state.isLoading);
  const isMessagesLoading = useAdminMessagesStore((state) => state.isLoading);
  const isSettingsLoading = useAdminSettingsStore((state) => state.isLoading);

  const isLoading =
    isSellersLoading ||
    isBuyersLoading ||
    isOrdersLoading ||
    isPayoutsLoading ||
    isMessagesLoading ||
    isSettingsLoading;

  useEffect(() => {
    void fetchSellers();
    void fetchBuyers();
    void fetchOrders();
    void fetchPayouts();
    void fetchConversations();
    void fetchSettings();
  }, [
    fetchBuyers,
    fetchConversations,
    fetchOrders,
    fetchPayouts,
    fetchSellers,
    fetchSettings,
  ]);

  const totalGMV = useMemo(
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
  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === "PENDING"),
    [payouts],
  );
  const unreadConversations = useMemo(
    () =>
      conversations.filter((conversation) => conversation.unreadCount > 0),
    [conversations],
  );

  const monthlyVolume = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-NG", { month: "short" });
    const buckets = new Map<string, number>();
    orders.forEach((order) => {
      const month = formatter.format(new Date(order.createdAt));
      buckets.set(month, (buckets.get(month) || 0) + order.grandTotal);
    });
    return Array.from(buckets.entries()).map(([month, revenue]) => ({
      month,
      revenue,
    }));
  }, [orders]);

  const statCards = [
    {
      title: "Marketplace Volume",
      value: formatCurrency(totalGMV),
      icon: CreditCard,
      subtitle: "Combined buyer payments",
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Commission Earned",
      value: formatCurrency(totalCommission),
      icon: TrendingUp,
      subtitle: settings
        ? `${settings.commission.commissionRatePercent}% commission`
        : "Platform commission",
      color: "bg-secondary/10 text-secondary",
    },
    {
      title: "Pending Payout Reviews",
      value: String(pendingPayouts.length),
      icon: CreditCard,
      subtitle: "Awaiting admin action",
      color: "bg-accent/10 text-accent",
    },
    {
      title: "Total Sellers",
      value: String(sellers.length),
      icon: Users,
      subtitle: `${sellers.filter((seller) => seller.isActive).length} active`,
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Total Buyers",
      value: String(buyers.length),
      icon: Users,
      subtitle: `${buyers.filter((buyer) => buyer.isActive).length} active`,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Parent Orders",
      value: String(orders.length),
      icon: ShoppingCart,
      subtitle: `${orders.filter((order) => order.paymentStatus === "PAID").length} paid`,
      color: "bg-purple-500/10 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="mt-1 text-muted-foreground">
          Platform overview and live marketplace metrics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Monthly Marketplace Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={monthlyVolume}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="natural"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ fill: "var(--primary)", r: 5 }}
                  activeDot={{ r: 7 }}
                  name="GMV"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              {isLoading ? <Spinner className="size-4" /> : null}
              <span>{isLoading ? "Loading chart..." : "No order data yet"}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Admin Attention Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingPayouts.slice(0, 5).map((payout) => (
              <div
                key={payout.id}
                className="min-w-0 overflow-hidden rounded-md border border-border/50 p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <CreditCard className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="wrap-break-word font-medium text-foreground">
                      {payout.sellerName}
                    </p>
                    <p className="wrap-break-word text-sm text-muted-foreground">
                      Pending payout of {formatCurrency(payout.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {unreadConversations.slice(0, 5).map((conversation) => {
              const otherParticipant = conversation.participants.find(
                (participant) => !participant.isCurrentUser,
              );
              return (
                <div
                  key={conversation.id}
                  className="min-w-0 overflow-hidden rounded-md border border-border/50 p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <MessageCircle className="h-4 w-4 shrink-0 text-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="wrap-break-word font-medium text-foreground">
                        {otherParticipant?.fullName || "Conversation"}
                      </p>
                      <p className="wrap-break-word text-sm text-muted-foreground">
                        {conversation.latestMessage?.body || "Unread conversation"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {pendingPayouts.length === 0 && unreadConversations.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground md:col-span-2">
                No pending payout reviews or unread conversations right now.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
