'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface StatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  currentStatus: string;
}

export function StatusUpdateModal({
  open,
  onOpenChange,
  deliveryId,
  currentStatus,
}: StatusUpdateModalProps) {
  const updateDeliveryStatus = useLogisticsStore((state) => state.updateDeliveryStatus);
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;

    setLoading(true);
    updateDeliveryStatus(deliveryId, status, description, 'Current User');
    
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      setStatus('');
      setDescription('');
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Delivery Status</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">New Status *</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Description (Optional)
            </label>
            <Textarea
              placeholder="Add any notes about this status update..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={loading || !status}
            >
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
