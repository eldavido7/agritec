'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusUpdateModal } from '@/components/modals/status-update-modal';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import type { AssignedDelivery, DeliveryStatus } from '@/lib/types';

const statusColors: Record<DeliveryStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  CONFIRMED: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  SHIPPED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const statusIcons: Record<DeliveryStatus, typeof CheckCircle> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: AlertCircle,
  REFUNDED: AlertCircle,
};

interface DeliveryDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function DeliveryDetailsPage({ params }: DeliveryDetailsPageProps) {
  const fetchDelivery = useLogisticsStore((state) => state.fetchDelivery);
  const deliveries = useLogisticsStore((state) => state.deliveries);
  const isLoading = useLogisticsStore((state) => state.isLoadingDeliveryDetail);
  const [deliveryId, setDeliveryId] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  useEffect(() => {
    void params.then(async ({ id }) => {
      setDeliveryId(id);
      await fetchDelivery(id, { force: true }).catch(() => undefined);
    });
  }, [fetchDelivery, params]);

  const delivery = useMemo<AssignedDelivery | null>(
    () => deliveries.find((entry) => entry.id === deliveryId) ?? null,
    [deliveries, deliveryId]
  );

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

  if (isLoading && !delivery) {
    return (
      <div className="space-y-6">
        <Link href="/deliveries" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Deliveries
        </Link>
        <Card className="p-8 text-center text-muted-foreground">Loading delivery details...</Card>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-6">
        <Link href="/deliveries" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Deliveries
        </Link>
        <Card className="p-8 text-center text-muted-foreground">Delivery not found</Card>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Link href="/deliveries" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Deliveries
        </Link>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{delivery.id}</h1>
            <p className="mt-1 text-muted-foreground">Parent order: {delivery.parentOrderId}</p>
          </div>
          <Button onClick={() => setStatusModalOpen(true)}>
            Update Status
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Current Status</p>
              <Badge className={statusColors[delivery.status]}>
                {delivery.status.replaceAll('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total Weight</p>
              <p className="text-lg font-semibold text-foreground">
                {delivery.totalChargeableWeightKg ?? '-'} kg
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Delivery Fee</p>
              <p className="text-lg font-semibold text-foreground">
                NGN {delivery.shippingFee.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Assigned Date</p>
              <p className="text-lg font-semibold text-foreground">
                {new Date(delivery.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <MapPin className="h-5 w-5 text-primary" />
            Pickup Information
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Farm</p>
              <p className="font-medium text-foreground">{delivery.farmNameSnapshot}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Seller</p>
              <p className="font-medium text-foreground">
                {delivery.seller?.user?.fullName || delivery.sellerNameSnapshot}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">
                {delivery.seller?.user?.phone || 'Not available'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Region</p>
              <p className="font-medium text-foreground">
                {[delivery.sellerPickupCitySnapshot, delivery.sellerPickupStateSnapshot]
                  .filter(Boolean)
                  .join(', ') || 'Not captured'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Truck className="h-5 w-5 text-primary" />
            Delivery Information
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Buyer</p>
              <p className="font-medium text-foreground">
                {delivery.parentOrder?.buyerNameSnapshot || 'Buyer'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">
                {delivery.parentOrder?.buyerPhoneSnapshot || 'Not available'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">
                {delivery.parentOrder?.addressSnapshot?.fullAddress || 'Not available'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Landmark</p>
              <p className="font-medium text-foreground">
                {delivery.parentOrder?.addressSnapshot?.landmark || 'Not provided'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Package className="h-5 w-5 text-primary" />
            Products
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Variant</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {delivery.items.map((product) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="px-4 py-3 text-foreground">{product.productTitleSnapshot}</td>
                    <td className="px-4 py-3 text-foreground">{product.variantTitleSnapshot || '-'}</td>
                    <td className="px-4 py-3 text-foreground">{product.quantity}</td>
                    <td className="px-4 py-3 text-foreground">{product.unitWeightKgSnapshot ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="mb-6 flex items-center gap-2 font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Delivery Timeline
          </h3>

          <div className="space-y-6">
            {delivery.statusHistory.map((entry, index) => {
              const Icon = statusIcons[entry.status] || CheckCircle;
              return (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {index < delivery.statusHistory.length - 1 ? (
                      <div className="mt-2 h-12 w-0.5 bg-border" />
                    ) : null}
                  </div>

                  <div className="flex-1 pt-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {entry.status.replaceAll('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.description ? (
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      by {entry.updatedByUser?.fullName || entry.updatedByRole || 'System'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      <StatusUpdateModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        deliveryId={delivery.id}
        currentStatus={delivery.status}
      />
    </motion.div>
  );
}
