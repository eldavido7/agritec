"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SellerDiscount, SellerProduct } from "@/lib/mock-data";
import { X } from "lucide-react";

type DiscountDraft = Omit<
  SellerDiscount,
  "id" | "sellerId" | "createdAt" | "updatedAt"
>;

type DiscountFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sellerId: string;
  products: SellerProduct[];
  discount?: SellerDiscount | null;
  onSubmit: (discount: SellerDiscount) => void;
};

const toInputDateTime = (date?: Date) =>
  date ? new Date(date).toISOString().slice(0, 16) : "";

const defaultDraft = (): DiscountDraft => ({
  code: "",
  description: "",
  type: "percentage",
  value: 10,
  productIds: [],
  variantIds: [],
  startsAt: new Date(),
  endsAt: undefined,
  isActive: true,
  usageLimit: undefined,
  usageCount: 0,
});

export function DiscountFormModal({
  open,
  onOpenChange,
  mode,
  sellerId,
  products,
  discount,
  onSubmit,
}: DiscountFormModalProps) {
  const [draft, setDraft] = useState<DiscountDraft>(defaultDraft);
  const [productSearch, setProductSearch] = useState("");
  const [variantSearch, setVariantSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && discount) {
      setDraft({
        code: discount.code,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        productIds: discount.productIds,
        variantIds: discount.variantIds,
        startsAt: new Date(discount.startsAt),
        endsAt: discount.endsAt ? new Date(discount.endsAt) : undefined,
        isActive: discount.isActive,
        usageLimit: discount.usageLimit,
        usageCount: discount.usageCount,
      });
    } else {
      setDraft(defaultDraft());
    }
    setProductSearch("");
    setVariantSearch("");
  }, [discount, mode, open]);

  const allVariants = useMemo(
    () =>
      products.flatMap((product) =>
        (product.variants || []).map((variant) => ({
          ...variant,
          key: variant.id,
          productId: product.id,
          productName: product.name,
        })),
      ),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    return products.filter((product) => {
      const hasSelectedVariant = product.variants?.some((variant) =>
        draft.variantIds.includes(variant.id),
      );
      return (
        !hasSelectedVariant &&
        (product.name.toLowerCase().includes(query) ||
          String(product.id).includes(query))
      );
    });
  }, [draft.variantIds, productSearch, products]);

  const filteredVariants = useMemo(() => {
    const query = variantSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    return allVariants.filter(
      (variant) =>
        !draft.productIds.includes(variant.productId) &&
        (variant.name.toLowerCase().includes(query) ||
          variant.productName.toLowerCase().includes(query) ||
          variant.key.toLowerCase().includes(query) ||
          variant.sku?.toLowerCase().includes(query)),
    );
  }, [allVariants, draft.productIds, variantSearch]);

  const addProduct = (productId: number) => {
    const product = products.find((item) => item.id === productId);
    const variantKeys = (product?.variants || []).map(
      (variant) => variant.id,
    );
    setDraft((current) => ({
      ...current,
      productIds: current.productIds.includes(productId)
        ? current.productIds
        : [...current.productIds, productId],
      variantIds: current.variantIds.filter((id) => !variantKeys.includes(id)),
    }));
  };

  const addVariant = (variantKey: string) => {
    const variant = allVariants.find((item) => item.key === variantKey);
    setDraft((current) => ({
      ...current,
      productIds: variant
        ? current.productIds.filter((id) => id !== variant.productId)
        : current.productIds,
      variantIds: current.variantIds.includes(variantKey)
        ? current.variantIds
        : [...current.variantIds, variantKey],
    }));
  };

  const submit = () => {
    if (!draft.code.trim()) return;
    if (draft.type === "percentage" && (draft.value < 1 || draft.value > 100)) {
      return;
    }
    if (draft.type === "fixed" && draft.value <= 0) return;

    onSubmit({
      ...draft,
      id:
        mode === "edit" && discount
          ? discount.id
          : `disc-${sellerId}-${Date.now()}`,
      sellerId,
      code: draft.code.trim().toUpperCase(),
      createdAt:
        mode === "edit" && discount ? discount.createdAt : new Date(),
      updatedAt: new Date(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Discount" : "Edit Discount"}
          </DialogTitle>
          <DialogDescription>
            Discounts apply only to products and variants owned by this seller.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discount-code">Code</Label>
              <Input
                id="discount-code"
                value={draft.code}
                onChange={(event) =>
                  setDraft({ ...draft, code: event.target.value.toUpperCase() })
                }
                placeholder="HARVEST20"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value: "percentage" | "fixed") =>
                  setDraft({ ...draft, type: value, value: value === "percentage" ? 10 : 500 })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount-description">Description</Label>
            <Textarea
              id="discount-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Describe where this discount should appear."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="discount-value">
                Value {draft.type === "percentage" ? "(%)" : "(NGN)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min={draft.type === "percentage" ? 1 : 0}
                max={draft.type === "percentage" ? 100 : undefined}
                value={draft.value}
                onChange={(event) =>
                  setDraft({ ...draft, value: Number(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-usage-limit">Usage limit</Label>
              <Input
                id="discount-usage-limit"
                type="number"
                min={0}
                value={draft.usageLimit ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    usageLimit: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                <Switch
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, isActive: checked })
                  }
                />
                <span className="text-sm">
                  {draft.isActive ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discount-start">Start date</Label>
              <Input
                id="discount-start"
                type="datetime-local"
                value={toInputDateTime(draft.startsAt)}
                onChange={(event) =>
                  setDraft({ ...draft, startsAt: new Date(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-end">End date</Label>
              <Input
                id="discount-end"
                type="datetime-local"
                value={toInputDateTime(draft.endsAt)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    endsAt: event.target.value
                      ? new Date(event.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-search">Products</Label>
            <Input
              id="product-search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search this seller's products"
            />
            {filteredProducts.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-md border p-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product.id)}
                    className="block w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-muted"
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {draft.productIds.map((id) => {
                const product = products.find((item) => item.id === id);
                return (
                  <Badge key={id} variant="secondary">
                    {product?.name || id}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          productIds: draft.productIds.filter(
                            (productId) => productId !== id,
                          ),
                        })
                      }
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variant-search">Variants</Label>
            <Input
              id="variant-search"
              value={variantSearch}
              onChange={(event) => setVariantSearch(event.target.value)}
              placeholder="Search variants by product, name, SKU, or ID"
            />
            {filteredVariants.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-md border p-2">
                {filteredVariants.map((variant) => (
                  <button
                    key={variant.key}
                    type="button"
                    onClick={() => addVariant(variant.key)}
                    className="block w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{variant.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {variant.productName} / {variant.sku || variant.key}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {draft.variantIds.map((id) => {
                const variant = allVariants.find((item) => item.key === id);
                return (
                  <Badge key={id} variant="secondary">
                    {variant ? `${variant.productName}: ${variant.name}` : id}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          variantIds: draft.variantIds.filter(
                            (variantId) => variantId !== id,
                          ),
                        })
                      }
                    />
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {mode === "create" ? "Create Discount" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

