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
import type { SellerDiscount } from "@/lib/mock-data";

type DeleteDiscountModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: SellerDiscount | null;
  onDelete: (id: string) => void;
};

export function DeleteDiscountModal({
  open,
  onOpenChange,
  discount,
  onDelete,
}: DeleteDiscountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Discount</DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            <span className="font-semibold">{discount?.code}</span> from this
            seller&apos;s discounts.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (discount) onDelete(discount.id);
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
