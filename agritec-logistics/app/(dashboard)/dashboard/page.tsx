'use client';

import { useEffect } from 'react';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { ChartsGrid, StatusBreakdownChart } from '@/components/dashboard/charts';
import { RecentDeliveriesTable } from '@/components/dashboard/recent-deliveries-table';
import { motion } from 'framer-motion';
import { useLogisticsStore } from '@/lib/store/logistics-store';

export default function DashboardPage() {
  const fetchDeliveries = useLogisticsStore((state) => state.fetchDeliveries);

  useEffect(() => {
    void fetchDeliveries().catch(() => undefined);
  }, [fetchDeliveries]);

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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back to your logistics operations center</p>
      </motion.div>

      <KPICards />

      <ChartsGrid />

      <motion.div variants={itemVariants}>
        <StatusBreakdownChart />
      </motion.div>

      <RecentDeliveriesTable />
    </motion.div>
  );
}
