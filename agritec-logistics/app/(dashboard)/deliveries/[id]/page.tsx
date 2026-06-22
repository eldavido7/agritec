'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { StatusUpdateModal } from '@/components/modals/status-update-modal';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, MapPin, Phone, Calendar, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';

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

const statusIcons: Record<string, typeof CheckCircle> = {
  delivered: CheckCircle,
  in_transit: Truck,
  pending: Clock,
  assigned: Package,
  failed: AlertCircle,
  picked_up: Package,
  cancelled: AlertCircle,
};

interface DeliveryDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function DeliveryDetailsPage({ params }: DeliveryDetailsPageProps) {
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  React.useEffect(() => {
    params.then(({ id }) => {
      const foundDelivery = useLogisticsStore.getState().getDelivery(id);
      setDelivery(foundDelivery);
      setLoading(false);
    });
  }, [params]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/deliveries" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Deliveries
        </Link>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading delivery details...</p>
        </Card>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-6">
        <Link href="/deliveries" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Deliveries
        </Link>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Delivery not found</p>
        </Card>
      </div>
    );
  }

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
        <Link href="/deliveries" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Deliveries
        </Link>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{delivery.id}</h1>
            <p className="text-muted-foreground mt-1">Order: {delivery.parentOrderId}</p>
          </div>
          <Button
            onClick={() => setStatusModalOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            Update Status
          </Button>
        </div>
      </motion.div>

      {/* Status and Overview */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Status</p>
              <Badge className={statusColors[delivery.currentStatus]}>
                {statusLabels[delivery.currentStatus]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Weight</p>
              <p className="text-lg font-semibold text-foreground">{delivery.totalChargeableWeightKg} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Delivery Fee</p>
              <p className="text-lg font-semibold text-foreground">₦{delivery.deliveryFee.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Assigned Date</p>
              <p className="text-lg font-semibold text-foreground">
                {new Date(delivery.assignedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Seller & Buyer Info */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Pickup Information
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Seller</p>
              <p className="font-medium text-foreground">{delivery.sellerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">{delivery.sellerPhone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">{delivery.pickupAddress}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-secondary" />
            Delivery Information
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Buyer</p>
              <p className="font-medium text-foreground">{delivery.buyerDisplayName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">{delivery.buyerPhone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">{delivery.deliveryAddress}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Products */}
      {delivery.products && delivery.products.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Products
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Product</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Quantity</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.products.map((product) => (
                    <tr key={product.id} className="border-b border-border">
                      <td className="py-3 px-4 text-foreground">{product.name}</td>
                      <td className="py-3 px-4 text-foreground">{product.quantity}</td>
                      <td className="py-3 px-4 text-foreground">{product.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Status Timeline */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Delivery Timeline
          </h3>

          <div className="space-y-6">
            {delivery.statusHistory.map((entry, i) => {
              const Icon = statusIcons[entry.status] || CheckCircle;
              return (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    {i < delivery.statusHistory.length - 1 && (
                      <div className="w-0.5 h-12 bg-border mt-2" />
                    )}
                  </div>

                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {statusLabels[entry.status as keyof typeof statusLabels]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">by {entry.updatedByName}</p>
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
        currentStatus={delivery.currentStatus}
      />
    </motion.div>
  );
}
