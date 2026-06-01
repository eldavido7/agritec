'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analytics, orders, farmers, buyers, settings, payouts, messages } from '@/lib/mock-data';
import { DollarSign, Users, ShoppingCart, TrendingUp, CreditCard, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `₦${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₦${(value / 1000).toFixed(0)}K`;
  }
  return `₦${value}`;
};

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded p-2">
        <p className="text-sm font-medium">{payload[0].payload.month}</p>
        <p className="text-sm text-primary">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const commissionEarned = totalRevenue * (settings.commissionRate / 100);
  const platformFeesEarned = totalRevenue * (settings.platformFee / 100);
  const platformRevenue = commissionEarned + platformFeesEarned;
  const pendingPayouts = payouts.filter((payout) => payout.status === 'pending');
  const unreadMessages = messages.filter((message) => !message.read);

  const statCards = [
    {
      title: 'Gross Revenue',
      value: formatCurrency(platformRevenue),
      icon: DollarSign,
      subtitle: 'Commission + fees',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Commission Earned',
      value: formatCurrency(commissionEarned),
      icon: TrendingUp,
      subtitle: `${settings.commissionRate}% of revenue`,
      color: 'bg-secondary/10 text-secondary',
    },
    {
      title: 'Platform Fees',
      value: formatCurrency(platformFeesEarned),
      icon: DollarSign,
      subtitle: `${settings.platformFee}% of revenue`,
      color: 'bg-accent/10 text-accent',
    },
    {
      title: 'Total Sellers',
      value: farmers.length.toString(),
      icon: Users,
      subtitle: 'Registered',
      color: 'bg-green-500/10 text-green-600',
    },
    {
      title: 'Total Buyers',
      value: buyers.length.toString(),
      icon: Users,
      subtitle: 'Registered',
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Total Orders',
      value: orders.length.toString(),
      icon: ShoppingCart,
      subtitle: `${orders.filter(o => o.status === 'completed').length} completed`,
      color: 'bg-purple-500/10 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analytics.monthlyRevenue} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--muted-foreground)"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="var(--muted-foreground)"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="natural"
                dataKey="revenue" 
                stroke="var(--primary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--primary)', r: 5 }}
                activeDot={{ r: 7 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendor Management Queue */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Vendor Management Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingPayouts.slice(0, 5).map((payout) => (
              <div key={payout.id} className="rounded-md border border-border/50 p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{payout.farmerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Pending payout of {formatCurrency(payout.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {unreadMessages.slice(0, 5).map((message) => (
              <div key={message.id} className="rounded-md border border-border/50 p-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-secondary" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{message.senderName}</p>
                    <p className="truncate text-sm text-muted-foreground">{message.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
