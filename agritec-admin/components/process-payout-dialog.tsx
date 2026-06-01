"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const PAYOUT_STATUSES = ["pending", "in_progress", "completed"] as const;

interface ProcessPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payoutId: string;
  farmerName: string;
  amount: number;
  currentStatus: string;
  onConfirm: (newStatus: string) => void;
  isLoading?: boolean;
}

export function ProcessPayoutDialog({
  open,
  onOpenChange,
  payoutId,
  farmerName,
  amount,
  currentStatus,
  onConfirm,
  isLoading,
}: ProcessPayoutDialogProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);

  const handleSubmit = () => {
    if (newStatus !== currentStatus) {
      onConfirm(newStatus);
      setNewStatus(currentStatus);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Payout</DialogTitle>
          <DialogDescription>
            Update payout status for{" "}
            <span className="font-semibold">{farmerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Payout ID</p>
                <p className="font-mono font-semibold">{payoutId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold">
                  ₦{(amount / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() +
                      status.slice(1).replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || newStatus === currentStatus}
          >
            {isLoading ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
