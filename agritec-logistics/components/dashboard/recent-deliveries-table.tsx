'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  in_transit: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  picked_up: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const statusLabels: Record<string, string> = {
  delivered: 'Delivered',
  in_transit: 'In Transit',
  pending: 'Pending',
  assigned: 'Assigned',
  failed: 'Failed',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recent Deliveries</h3>
          <Link href="/deliveries">
            <Button variant="outline" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Delivery ID</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Seller</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Destination</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fee</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-border hover:bg-muted/50 transition">
                  <td className="py-4 px-4 font-medium text-foreground">{delivery.id}</td>
                  <td className="py-4 px-4 text-foreground">{delivery.sellerName}</td>
                  <td className="py-4 px-4 text-foreground">{delivery.deliveryCity}</td>
                  <td className="py-4 px-4">
                    <Badge className={statusColors[delivery.currentStatus]}>
                      {statusLabels[delivery.currentStatus]}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-foreground font-medium">₦{delivery.deliveryFee.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right">
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
      </Card>
    </motion.div>
  );
}
