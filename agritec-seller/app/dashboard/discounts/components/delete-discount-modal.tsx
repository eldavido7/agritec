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
import { Loader2 } from "lucide-react";
import type { SellerDiscountRecord } from "@/stores/seller-discounts-store";

type DeleteDiscountModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: SellerDiscountRecord | null;
  isDeleting: boolean;
  onDelete: (id: string) => Promise<void>;
};

export function DeleteDiscountModal({
  open,
  onOpenChange,
  discount,
  isDeleting,
  onDelete,
}: DeleteDiscountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle>Delete Discount</DialogTitle>
          <DialogDescription>
            This will permanently remove {" "}
            <span className="font-semibold">{discount?.code}</span> from this
            seller&apos;s discounts.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={async () => {
              if (!discount) return;
              await onDelete(discount.id);
              onOpenChange(false);
            }}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
