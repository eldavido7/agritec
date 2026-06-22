'use client';

import { Card } from '@/components/ui/card';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import { TrendingUp, Package, AlertCircle, Clock } from 'lucide-react';

export function KPICards() {
  const analytics = useLogisticsStore((state) => state.analytics);

  const kpis = [
    {
      title: 'Total Deliveries',
      value: analytics.totalDeliveries,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Delivered',
      value: analytics.deliveredCount,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'In Transit',
      value: analytics.inTransitCount,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: 'Failed',
      value: analytics.failedCount,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: 'Pending',
      value: analytics.pendingCount,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Total Revenue',
      value: `₦${analytics.revenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
    >
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <motion.div key={i} variants={itemVariants}>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {typeof kpi.value === 'number' ? kpi.value : kpi.value}
                  </p>
                </div>
                <div className={`${kpi.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
