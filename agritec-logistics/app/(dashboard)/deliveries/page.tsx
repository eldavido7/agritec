'use client';

import { useState, useMemo } from 'react';
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
import { Search, Filter } from 'lucide-react';

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

export default function DeliveriesPage() {
  const deliveries = useLogisticsStore((state) => state.deliveries);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const states = ['Lagos', 'Oyo', 'Ondo', 'Ogun', 'Edo'];

  const filtered = useMemo(() => {
    return deliveries.filter((delivery) => {
      const matchesSearch =
        delivery.id.toLowerCase().includes(search.toLowerCase()) ||
        delivery.sellerName.toLowerCase().includes(search.toLowerCase()) ||
        delivery.buyerDisplayName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || delivery.currentStatus === statusFilter;
      const matchesState = !stateFilter || delivery.deliveryState === stateFilter;

      return matchesSearch && matchesStatus && matchesState;
    });
  }, [deliveries, search, statusFilter, stateFilter]);

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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground">Deliveries</h1>
        <p className="text-muted-foreground mt-2">Manage all your deliveries in one place</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by ID, seller, or buyer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  State
                </label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All states</SelectItem>
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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Seller</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Buyer</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Destination</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Weight (kg)</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fee</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((delivery) => (
                    <tr key={delivery.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-4 px-4 font-medium text-foreground">{delivery.id}</td>
                      <td className="py-4 px-4 text-foreground">{delivery.sellerName}</td>
                      <td className="py-4 px-4 text-foreground">{delivery.buyerDisplayName}</td>
                      <td className="py-4 px-4 text-foreground">{delivery.deliveryCity}</td>
                      <td className="py-4 px-4">
                        <Badge className={statusColors[delivery.currentStatus]}>
                          {statusLabels[delivery.currentStatus]}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-foreground">{delivery.totalChargeableWeightKg}</td>
                      <td className="py-4 px-4 font-medium text-foreground">₦{delivery.deliveryFee.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">
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
                    <td colSpan={8} className="py-8 px-4 text-center text-muted-foreground">
                      No deliveries found
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
