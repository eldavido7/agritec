"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import {
  ProductForm,
  defaultLogistics,
  parseOptionalNumber,
  type ProductFormDraft,
} from "./product-form";
import { type ProductLogistics } from "@/lib/mock-data";
import { toast } from "sonner";
import { type SellerProductRecord } from "@/stores/seller-products-store";

type Product = SellerProductRecord;
type ProductDraft = ProductFormDraft;

interface EditProductModalProps {
  isOpen: boolean;
  sellerLocationComplete: boolean;
  formData: ProductDraft;
  onFormDataChange: (data: ProductDraft) => void;
  categories: readonly string[];
  uploadingImageIndex: number | null;
  isSaving: boolean;
  isImageUploading: boolean;
  onClose: () => void;
  onSave: (productId: string, payload: ProductDraft) => Promise<void>;
  onSelectImage: (file: File, index: number) => void;
  onRemoveImage: (index: number) => void;
  selectedProductId: string | null;
}

const normalizeVariantLogistics = (
  product: Partial<Product>,
  logistics?: Partial<ProductLogistics>,
): ProductLogistics | undefined => {
  if (!logistics) return undefined;
  const unitWeightKg = parseOptionalNumber(logistics.unitWeightKg);
  if (unitWeightKg == null) return undefined;
  return {
    salesUnit: logistics.salesUnit || defaultLogistics.salesUnit,
    unitWeightKg,
    unitLengthCm: parseOptionalNumber(logistics.unitLengthCm),
    unitWidthCm: parseOptionalNumber(logistics.unitWidthCm),
    unitHeightCm: parseOptionalNumber(logistics.unitHeightCm),
    packageType: logistics.packageType || defaultLogistics.packageType,
  };
};

export function EditProductModal({
  isOpen,
  sellerLocationComplete,
  formData,
  onFormDataChange,
  categories,
  uploadingImageIndex,
  isSaving,
  isImageUploading,
  onClose,
  onSave,
  onSelectImage,
  onRemoveImage,
  selectedProductId,
}: EditProductModalProps) {
  if (!isOpen || !selectedProductId) return null;

  const isFormBusy = isSaving || isImageUploading;
  const hasVariants =
    (formData.variants && formData.variants.length > 0) || false;

  const handleSave = async () => {
    if (!sellerLocationComplete && (formData.status || "Active") === "Active") {
      toast.error("Please add your farm/pickup location before listing products.");
      return;
    }

    if (!formData.name || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!hasVariants && !formData.price) {
      toast.error("Please enter price (no variants) or add variants");
      return;
    }

    if (hasVariants && (!formData.variants || formData.variants.length === 0)) {
      toast.error("Please add at least one variant");
      return;
    }

    const unitWeightKg = parseOptionalNumber(formData.unitWeightKg);
    const unitLengthCm = parseOptionalNumber(formData.unitLengthCm);
    const unitWidthCm = parseOptionalNumber(formData.unitWidthCm);
    const unitHeightCm = parseOptionalNumber(formData.unitHeightCm);

    if (unitWeightKg == null) {
      toast.error("Unit weight is required for shipping calculation");
      return;
    }

    const draftImages = (formData.images || [])
      .map((image, index) => {
        if (!image) return null;
        return {
          ...image,
          secureUrl: image.secureUrl?.trim() || image.previewUrl || "",
          altText:
            image.altText ?? `${formData.name || "Product"} image ${index + 1}`,
          displayOrder: image.displayOrder ?? index,
        };
      })
      .filter(Boolean) as NonNullable<ProductDraft["images"]>;

    if (draftImages.length === 0) {
      toast.error("Add at least one product image before saving");
      return;
    }

    const normalizedVariants = hasVariants
      ? (formData.variants || []).map((variant: any) => ({
          ...variant,
          id:
            typeof variant.id === "string" && variant.id.trim().length > 0
              ? variant.id
              : undefined,
          logistics: normalizeVariantLogistics(formData, variant.logistics),
        }))
      : undefined;

    const basePrice = hasVariants
      ? formData.variants?.[0]?.price || 0
      : formData.price || 0;
    const totalInventory = hasVariants
      ? formData.variants?.reduce(
          (sum: number, v: any) => sum + (v.inventory || 0),
          0,
        ) || 0
      : formData.inventory || 0;

    const payload: Partial<Product> = {
      ...formData,
      price: basePrice,
      inventory: totalInventory,
      status: formData.status || "Active",
      variants: normalizedVariants,
      salesUnit: formData.salesUnit || defaultLogistics.salesUnit,
      unitWeightKg,
      unitLengthCm,
      unitWidthCm,
      unitHeightCm,
      packageType: formData.packageType || defaultLogistics.packageType,
      images: draftImages,
    };

    try {
      await onSave(selectedProductId, payload);
      toast.success(`${payload.name} has been updated`);
      onClose();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save product",
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-border bg-card">
          <h2 className="text-xl font-bold text-foreground">Edit Product</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <ProductForm
            formData={formData}
            onFormDataChange={onFormDataChange}
            categories={categories}
            uploadingImageIndex={uploadingImageIndex}
            isFormBusy={isFormBusy}
            sellerLocationComplete={sellerLocationComplete}
            onSelectImage={onSelectImage}
            onRemoveImage={onRemoveImage}
          />

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSave}
              disabled={
                isFormBusy ||
                (!sellerLocationComplete && (formData.status || "Active") === "Active")
              }
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving
                ? "Saving Changes..."
                : isImageUploading
                  ? "Uploading Image..."
                  : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              onClick={onClose}
              disabled={isFormBusy}
            >
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


