'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { DeliveryStatus } from '@/lib/types';

const statusColors: Record<DeliveryStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  CONFIRMED: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  SHIPPED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function RecentDeliveriesTable() {
  const deliveries = useLogisticsStore((state) => state.deliveries).slice(0, 5);

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
    <motion.div variants={itemVariants}>
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Deliveries</h3>
          <Link href="/deliveries">
            <Button variant="outline" size="sm">
              View All
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Delivery ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seller</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-border transition hover:bg-muted/50">
                  <td className="px-4 py-4 font-medium text-foreground">{delivery.id}</td>
                  <td className="px-4 py-4 text-foreground">{delivery.farmNameSnapshot}</td>
                  <td className="px-4 py-4 text-foreground">
                    {delivery.buyerDeliveryCitySnapshot || delivery.buyerDeliveryStateSnapshot || 'Unspecified'}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={statusColors[delivery.status]}>
                      {delivery.status.replaceAll('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 font-medium text-foreground">
                    NGN {delivery.shippingFee.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link href={`/deliveries/${delivery.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deliveries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No assigned deliveries yet.
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
