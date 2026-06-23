'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import type { DeliveryStatus } from '@/lib/types';

const statusOptions: Array<{ value: DeliveryStatus; label: string }> = [
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface StatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  currentStatus: DeliveryStatus;
}

export function StatusUpdateModal({
  open,
  onOpenChange,
  deliveryId,
  currentStatus,
}: StatusUpdateModalProps) {
  const updateDeliveryStatus = useLogisticsStore((state) => state.updateDeliveryStatus);
  const isUpdating = useLogisticsStore((state) => state.isUpdatingStatus);
  const [status, setStatus] = useState<DeliveryStatus>(currentStatus);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setStatus(currentStatus);
    setDescription('');
    setError('');
  }, [currentStatus, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === currentStatus) {
      setError('Select a different status to continue.');
      return;
    }

    setError('');

    try {
      await updateDeliveryStatus(deliveryId, status, description);
      setStatus(currentStatus);
      setDescription('');
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to update delivery status'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Delivery Status</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">New Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as DeliveryStatus)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={isUpdating}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.value === currentStatus ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Update Note
            </label>
            <Textarea
              placeholder="Add a delivery update or cancellation reason"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 resize-none"
              rows={4}
              disabled={isUpdating}
            />
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || status === currentStatus}
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
