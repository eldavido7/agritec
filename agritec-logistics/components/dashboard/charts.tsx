'use client';

import { Card } from '@/components/ui/card';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
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
} from 'recharts';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

const COLORS = ['#047857', '#ea580c', '#0891b2', '#8b5cf6', '#d946ef'];

export function DeliveriesChart() {
  const analytics = useLogisticsStore((state) => state.analytics);

  return (
    <motion.div variants={itemVariants}>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Deliveries Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.deliveriesByDate}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
            <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
            />
            <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ fill: 'var(--primary)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Deliveries"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>
  );
}

export function RevenueChart() {
  const analytics = useLogisticsStore((state) => state.analytics);

  return (
    <motion.div variants={itemVariants}>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.revenueByDate}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
            <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              formatter={(value) => `NGN ${Number(value ?? 0).toLocaleString()}`}
            />
            <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
            <Area
              type="monotone"
              dataKey="revenue"
              fill="var(--secondary)"
              stroke="var(--secondary)"
              strokeWidth={2}
              name="Revenue"
              opacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>
  );
}

export function StatusBreakdownChart() {
  const analytics = useLogisticsStore((state) => state.analytics);

  const data = Object.entries(analytics.statusBreakdown)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
    }));

  return (
    <motion.div variants={itemVariants}>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>
  );
}

export function ChartsGrid() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      <DeliveriesChart />
      <RevenueChart />
    </motion.div>
  );
}
