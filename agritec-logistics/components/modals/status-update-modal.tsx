'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const availableStatuses = useMemo(
    () => statusOptions.filter((option) => option.value !== currentStatus),
    [currentStatus]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!status) {
      setError('Select a status to continue.');
      return;
    }

    setError('');

    try {
      await updateDeliveryStatus(deliveryId, status, description);
      setStatus('');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Delivery Status</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">New Status</label>
            <Select value={status} onValueChange={(value) => setStatus(value as DeliveryStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select delivery status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={isUpdating || !status}>
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
