'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
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

const deliveryStatuses: DeliveryStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export default function DeliveriesPage() {
  const deliveries = useLogisticsStore((state) => state.deliveries);
  const fetchDeliveries = useLogisticsStore((state) => state.fetchDeliveries);
  const isLoadingDeliveries = useLogisticsStore((state) => state.isLoadingDeliveries);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeliveryStatus>('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');

  useEffect(() => {
    void fetchDeliveries().catch(() => undefined);
  }, [fetchDeliveries]);

  const states = useMemo(
    () =>
      Array.from(
        new Set(
          deliveries
            .map((delivery) => delivery.buyerDeliveryStateSnapshot)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [deliveries]
  );

  const filtered = useMemo(() => {
    return deliveries.filter((delivery) => {
      const matchesSearch =
        delivery.id.toLowerCase().includes(search.toLowerCase()) ||
        delivery.farmNameSnapshot.toLowerCase().includes(search.toLowerCase()) ||
        delivery.parentOrder?.buyerNameSnapshot.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || delivery.status === statusFilter;
      const matchesState =
        stateFilter === 'ALL' || delivery.buyerDeliveryStateSnapshot === stateFilter;

      return matchesSearch && matchesStatus && matchesState;
    });
  }, [deliveries, search, stateFilter, statusFilter]);

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

  if (isLoadingDeliveries && deliveries.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground">Deliveries</h1>
        <p className="mt-2 text-muted-foreground">Manage assigned seller groups and delivery progression</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by delivery ID, farm, or buyer..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Filter className="h-4 w-4" />
                  Status
                </label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | DeliveryStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {deliveryStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Filter className="h-4 w-4" />
                  Destination State
                </label>
                <Select value={stateFilter} onValueChange={(value) => setStateFilter(value ?? 'ALL')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All states</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Farm</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Buyer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Weight (kg)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((delivery) => (
                    <tr key={delivery.id} className="border-b border-border transition hover:bg-muted/50">
                      <td className="px-4 py-4 font-medium text-foreground">{delivery.id}</td>
                      <td className="px-4 py-4 text-foreground">{delivery.farmNameSnapshot}</td>
                      <td className="px-4 py-4 text-foreground">
                        {delivery.parentOrder?.buyerNameSnapshot || 'Buyer'}
                      </td>
                      <td className="px-4 py-4 text-foreground">
                        {[delivery.buyerDeliveryCitySnapshot, delivery.buyerDeliveryStateSnapshot]
                          .filter(Boolean)
                          .join(', ') || 'Unspecified'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={statusColors[delivery.status]}>
                          {delivery.status.replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-foreground">
                        {delivery.totalChargeableWeightKg ?? '-'}
                      </td>
                      <td className="px-4 py-4 font-medium text-foreground">
                        NGN {delivery.shippingFee.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/deliveries/${delivery.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {isLoadingDeliveries ? 'Loading deliveries...' : 'No deliveries found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filtered.length} of {deliveries.length} deliveries
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
