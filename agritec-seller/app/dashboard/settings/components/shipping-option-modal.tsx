"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SellerShippingOption } from "@/lib/mock-data";

type ShippingDraft = Omit<SellerShippingOption, "id" | "sellerId">;

type ShippingOptionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sellerId: string;
  shippingOption?: SellerShippingOption | null;
  onSubmit: (shippingOption: SellerShippingOption) => void;
};

const emptyDraft: ShippingDraft = {
  name: "",
  price: 0,
  deliveryEstimate: "",
  coverageArea: "",
  enabled: true,
};

export function ShippingOptionModal({
  open,
  onOpenChange,
  mode,
  sellerId,
  shippingOption,
  onSubmit,
}: ShippingOptionModalProps) {
  const [draft, setDraft] = useState<ShippingDraft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(
      mode === "edit" && shippingOption
        ? {
            name: shippingOption.name,
            price: shippingOption.price,
            deliveryEstimate: shippingOption.deliveryEstimate,
            coverageArea: shippingOption.coverageArea,
            enabled: shippingOption.enabled,
          }
        : emptyDraft,
    );
  }, [mode, open, shippingOption]);

  const submit = () => {
    if (!draft.name.trim() || !draft.deliveryEstimate.trim()) return;
    if (!draft.coverageArea.trim() || draft.price < 0) return;

    onSubmit({
      ...draft,
      id:
        mode === "edit" && shippingOption
          ? shippingOption.id
          : `ship-${sellerId}-${Date.now()}`,
      sellerId,
      name: draft.name.trim(),
      deliveryEstimate: draft.deliveryEstimate.trim(),
      coverageArea: draft.coverageArea.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Shipping Option" : "Edit Shipping Option"}
          </DialogTitle>
          <DialogDescription>
            Shipping options are scoped to this seller only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="shipping-name">Delivery name</Label>
            <Input
              id="shipping-name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Lagos same day"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipping-price">Price (NGN)</Label>
              <Input
                id="shipping-price"
                type="number"
                min={0}
                value={draft.price}
                onChange={(event) =>
                  setDraft({ ...draft, price: Number(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-estimate">Delivery estimate</Label>
              <Input
                id="shipping-estimate"
                value={draft.deliveryEstimate}
                onChange={(event) =>
                  setDraft({ ...draft, deliveryEstimate: event.target.value })
                }
                placeholder="2-4 business days"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping-coverage">Coverage area</Label>
            <Input
              id="shipping-coverage"
              value={draft.coverageArea}
              onChange={(event) =>
                setDraft({ ...draft, coverageArea: event.target.value })
              }
              placeholder="Lagos, Ogun, Oyo"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">
                Disabled options are hidden from buyer checkout.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, enabled: checked })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {mode === "create" ? "Add Option" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
