"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { unitChargeableWeightKg } from "@/lib/mock-data";
import {
  type SellerProductRecord,
  type SellerProductVariantRecord,
} from "@/stores/seller-products-store";

type Product = SellerProductRecord;
type Variant = SellerProductVariantRecord;

interface ViewProductModalProps {
  isOpen: boolean;
  product: Product | null;
  imageIndex: number;
  onImageIndexChange: (index: number) => void;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  getTotalInventory: (product: Product) => number;
  getProductStatus: (product: Product) => string;
}

export function ViewProductModal({
  isOpen,
  product,
  imageIndex,
  onImageIndexChange,
  onClose,
  onEdit,
  onDelete,
  getTotalInventory,
  getProductStatus,
}: ViewProductModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-border bg-card">
          <h2 className="text-xl font-bold text-foreground">View Product</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
              <img
                src={
                  product.images?.[imageIndex]?.secureUrl ||
                  product.images?.[0]?.secureUrl
                }
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => onImageIndexChange(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      imageIndex === idx
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={img.secureUrl}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="font-semibold text-foreground">{product.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Category</p>
              <p className="font-semibold text-foreground">
                {product.category}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Price</p>
              <p className="font-semibold text-primary">
                {formatCurrency(product.price)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inventory</p>
              <p className="font-semibold text-foreground">
                {getTotalInventory(product)} units
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="font-semibold text-foreground">
                {getProductStatus(product)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Sales Unit</p>
              <p className="font-semibold text-foreground">
                {product.salesUnit}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Chargeable Weight
              </p>
              <p className="font-semibold text-foreground">
                {unitChargeableWeightKg(product).toFixed(1)} kg/unit
              </p>
            </div>
          </div>

          {product.description ? (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {product.description}
              </p>
            </div>
          ) : null}

          {product.variants && product.variants.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">
                Variants
              </p>
              <div className="space-y-2">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id || variant.name}
                    className="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="text-foreground">{variant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {variant.inventory} in stock
                      </p>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(variant.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => onEdit(product)}
            >
              Edit Product
            </Button>
            <Button
              className="flex-1 border bg-red-100 border-red-200 text-red-700 hover:bg-red-200 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/50"
              onClick={() => onDelete(product.id)}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
