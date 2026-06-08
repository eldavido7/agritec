"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  categorySlugFromLabel,
  hasCompleteDimensions,
  packageTypes,
  salesUnits,
  unitChargeableWeightKg,
  volumetricWeightKg,
  type ProductLogistics,
} from "@/lib/mock-data";
import { type SellerProductRecord } from "@/stores/seller-products-store";

const CLOUDINARY_FREE_IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;
const formatFileSize = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const defaultLogistics = {
  salesUnit: "PIECE" as const,
  unitWeightKg: undefined,
  unitLengthCm: undefined,
  unitWidthCm: undefined,
  unitHeightCm: undefined,
  packageType: "PIECE" as const,
};

const parseOptionalNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const buildVariantLogisticsDraft = (
  product: Partial<SellerProductRecord>,
  logistics?: Partial<ProductLogistics>,
): Partial<ProductLogistics> => ({
  salesUnit:
    logistics?.salesUnit || product.salesUnit || defaultLogistics.salesUnit,
  unitWeightKg:
    parseOptionalNumber(logistics?.unitWeightKg) ??
    parseOptionalNumber(product.unitWeightKg),
  unitLengthCm:
    parseOptionalNumber(logistics?.unitLengthCm) ??
    parseOptionalNumber(product.unitLengthCm),
  unitWidthCm:
    parseOptionalNumber(logistics?.unitWidthCm) ??
    parseOptionalNumber(product.unitWidthCm),
  unitHeightCm:
    parseOptionalNumber(logistics?.unitHeightCm) ??
    parseOptionalNumber(product.unitHeightCm),
  packageType:
    logistics?.packageType ||
    product.packageType ||
    defaultLogistics.packageType,
});

type Product = SellerProductRecord;

interface ProductFormProps {
  formData: Partial<Product>;
  onFormDataChange: (data: Partial<Product>) => void;
  categories: readonly string[];
  uploadingImageIndex: number | null;
  isFormBusy: boolean;
  onUploadImage: (
    file: File,
    index: number,
  ) => Promise<{
    secureUrl: string;
    publicId?: string | null;
    altText?: string;
    displayOrder?: number;
  }>;
}

export function ProductForm({
  formData,
  onFormDataChange,
  categories,
  uploadingImageIndex,
  isFormBusy,
  onUploadImage,
}: ProductFormProps) {
  const hasVariants =
    (formData.variants && formData.variants.length > 0) || false;

  return (
    <fieldset
      disabled={isFormBusy}
      className="space-y-4 disabled:pointer-events-none disabled:opacity-70"
    >
      {/* Image Upload Section */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Product Images (1-4)
        </label>
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const image = formData.images?.[idx];
            return (
              <div key={idx}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (!file.type.startsWith("image/")) {
                      toast.error("Only image files can be uploaded");
                      e.target.value = "";
                      return;
                    }

                    if (file.size > CLOUDINARY_FREE_IMAGE_LIMIT_BYTES) {
                      toast.error(
                        `Image is too large. Cloudinary free plan supports up to ${formatFileSize(CLOUDINARY_FREE_IMAGE_LIMIT_BYTES)} per image.`,
                      );
                      e.target.value = "";
                      return;
                    }

                    try {
                      const uploadedImage = await onUploadImage(file, idx);
                      const newImages = [...(formData.images || [])];
                      newImages[idx] = uploadedImage;
                      onFormDataChange({
                        ...formData,
                        images: newImages.filter(Boolean),
                      });
                      toast.success("Image uploaded successfully");
                    } catch (uploadError) {
                      toast.error(
                        uploadError instanceof Error
                          ? uploadError.message
                          : "Unable to upload image",
                      );
                    } finally {
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                  id={`image-upload-${idx}`}
                  disabled={Boolean(image) || isFormBusy}
                />
                <label
                  htmlFor={
                    !image && !isFormBusy ? `image-upload-${idx}` : undefined
                  }
                  className={`block ${
                    !image && !isFormBusy ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {image ? (
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border group bg-muted/20">
                      <img
                        src={
                          typeof image === "object" && "secureUrl" in image
                            ? image.secureUrl
                            : ""
                        }
                        alt={`preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        disabled={isFormBusy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newImages =
                            formData.images?.filter(
                              (_: any, i: number) => i !== idx,
                            ) || [];
                          onFormDataChange({
                            ...formData,
                            images: newImages,
                          });
                        }}
                        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-100 shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {uploadingImageIndex === idx && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                          <Spinner className="size-5 text-white" />
                          <span className="text-xs font-medium">
                            Uploading...
                          </span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center bg-muted/20">
                      {uploadingImageIndex === idx ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Spinner className="size-5" />
                          <span className="text-[11px] font-medium">
                            Uploading...
                          </span>
                        </div>
                      ) : (
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </label>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          PNG, JPG, WEBP - Click on any box to upload or replace
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Cloudinary free plan supports up to{" "}
          {formatFileSize(CLOUDINARY_FREE_IMAGE_LIMIT_BYTES)} per image. Uploads
          now go directly to Cloudinary using a signed backend payload.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Product Name *
        </label>
        <Input
          value={formData.name || ""}
          onChange={(e) =>
            onFormDataChange({ ...formData, name: e.target.value })
          }
          placeholder="Enter product name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            Category *
          </label>
          <select
            value={formData.category || ""}
            onChange={(e) =>
              onFormDataChange({
                ...formData,
                category: e.target.value,
                categorySlug: categorySlugFromLabel(e.target.value),
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" className="bg-background text-foreground">
              Select a category
            </option>
            {categories.map((cat) => (
              <option
                key={cat}
                value={cat}
                className="bg-background text-foreground"
              >
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Status</label>
          <select
            value={formData.status || "Active"}
            onChange={(e) =>
              onFormDataChange({
                ...formData,
                status: e.target.value as SellerProductRecord["status"],
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option className="bg-background text-foreground">Active</option>
            <option className="bg-background text-foreground">Inactive</option>
          </select>
        </div>
      </div>
      {formData.category === "Other" && (
        <div>
          <label className="text-sm font-medium text-foreground">
            Category Note (Optional)
          </label>
          <Input
            value={(formData as any).categoryNote || ""}
            onChange={(e) =>
              onFormDataChange({
                ...(formData as any),
                categoryNote: e.target.value,
              })
            }
            placeholder="e.g. Natural Sweeteners"
          />
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Sales unit and logistics
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Buyers purchase by sales unit. Weight and dimensions are used only
            by platform delivery pricing.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dimensions are optional. If left empty, shipping will be calculated
            using the product&apos;s weight only.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground">
              Sales Unit
            </label>
            <select
              value={formData.salesUnit || defaultLogistics.salesUnit}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  salesUnit: e.target.value as SellerProductRecord["salesUnit"],
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {salesUnits.map((unit) => (
                <option
                  key={unit}
                  value={unit}
                  className="bg-background text-foreground"
                >
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Package Type
            </label>
            <select
              value={formData.packageType || defaultLogistics.packageType}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  packageType: e.target
                    .value as SellerProductRecord["packageType"],
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {packageTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                  className="bg-background text-foreground"
                >
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Unit Weight (kg)
            </label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 2.5"
              value={formData.unitWeightKg ?? ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  unitWeightKg:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Length (cm)
            </label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 30"
              value={formData.unitLengthCm ?? ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  unitLengthCm:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Width (cm)
            </label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 20"
              value={formData.unitWidthCm ?? ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  unitWidthCm:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Height (cm)
            </label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 15"
              value={formData.unitHeightCm ?? ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  unitHeightCm:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        {(() => {
          const logisticsPreview = {
            salesUnit: formData.salesUnit || defaultLogistics.salesUnit,
            unitWeightKg: parseOptionalNumber(formData.unitWeightKg) || 0,
            unitLengthCm: parseOptionalNumber(formData.unitLengthCm),
            unitWidthCm: parseOptionalNumber(formData.unitWidthCm),
            unitHeightCm: parseOptionalNumber(formData.unitHeightCm),
            packageType: formData.packageType || defaultLogistics.packageType,
          } satisfies ProductLogistics;
          const volumetric = volumetricWeightKg(logisticsPreview);
          const chargeable = unitChargeableWeightKg(logisticsPreview);
          return (
            <div className="space-y-1 text-xs font-medium text-primary">
              <p>
                Actual weight:{" "}
                {logisticsPreview.unitWeightKg > 0
                  ? `${logisticsPreview.unitWeightKg.toFixed(1)} kg`
                  : "Enter unit weight to preview shipping."}
              </p>
              {hasCompleteDimensions(logisticsPreview) && volumetric != null ? (
                <>
                  <p>Volumetric weight: {volumetric.toFixed(1)} kg</p>
                  <p>
                    Chargeable weight preview: {chargeable.toFixed(1)} kg per
                    sales unit
                  </p>
                </>
              ) : logisticsPreview.unitWeightKg > 0 ? (
                <>
                  <p>Using actual weight only</p>
                  <p>
                    Chargeable weight preview: {chargeable.toFixed(1)} kg per
                    sales unit
                  </p>
                </>
              ) : null}
            </div>
          );
        })()}
      </div>

      {/* Variant Toggle */}
      <div className="border-t border-border pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => {
              if (e.target.checked) {
                onFormDataChange({
                  ...formData,
                  variants: [
                    {
                      id: `${formData.id || "new"}-${(formData.variants || []).length + 1}`,
                      name: "",
                      price: 0,
                      inventory: 0,
                    },
                  ],
                  price: undefined,
                });
              } else {
                onFormDataChange({
                  ...formData,
                  variants: undefined,
                  price: formData.price || 0,
                });
              }
            }}
            className="w-4 h-4 rounded border border-border cursor-pointer"
          />
          <span className="text-sm font-medium text-foreground">
            This product has variants
          </span>
        </label>
      </div>

      {/* Price & Inventory (if no variants) */}
      {!hasVariants && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div>
            <label className="text-sm font-medium text-foreground">
              Price (?) *
            </label>
            <Input
              type="number"
              value={formData.price || ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  price: Number(e.target.value),
                })
              }
              placeholder="Enter price"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Inventory (units)
            </label>
            <Input
              type="number"
              value={formData.inventory || ""}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  inventory: Number(e.target.value),
                })
              }
              placeholder="Enter stock count"
            />
          </div>
        </div>
      )}

      {/* Variants Section */}
      {hasVariants && (
        <div className="border-t border-border pt-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <label className="text-sm font-medium text-foreground">
                Variants
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Variants inherit the product logistics by default. Add custom
                logistics only when a variant changes the shipping weight or
                package size.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const variants = formData.variants || [];
                onFormDataChange({
                  ...formData,
                  variants: [
                    ...variants,
                    {
                      id: `${formData.id || "new"}-${variants.length + 1}`,
                      name: "",
                      price: 0,
                      inventory: 0,
                    },
                  ],
                });
              }}
              className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Variant
            </Button>
          </div>
          <div className="space-y-4 max-h-128 overflow-y-auto pr-1">
            {(formData.variants || []).map((variant: any, idx: number) => {
              const variantLogisticsDraft = buildVariantLogisticsDraft(
                formData,
                variant.logistics,
              );
              const variantLogisticsPreview = {
                salesUnit:
                  variantLogisticsDraft.salesUnit || defaultLogistics.salesUnit,
                unitWeightKg:
                  parseOptionalNumber(variantLogisticsDraft.unitWeightKg) || 0,
                unitLengthCm: parseOptionalNumber(
                  variantLogisticsDraft.unitLengthCm,
                ),
                unitWidthCm: parseOptionalNumber(
                  variantLogisticsDraft.unitWidthCm,
                ),
                unitHeightCm: parseOptionalNumber(
                  variantLogisticsDraft.unitHeightCm,
                ),
                packageType:
                  variantLogisticsDraft.packageType ||
                  defaultLogistics.packageType,
              } satisfies ProductLogistics;
              const variantVolumetric = variant.logistics
                ? volumetricWeightKg(variantLogisticsPreview)
                : null;
              const variantChargeable = variant.logistics
                ? unitChargeableWeightKg(variantLogisticsPreview)
                : null;

              return (
                <div
                  key={variant.id}
                  className="space-y-4 rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] md:items-end">
                    <Input
                      placeholder="Variant name (e.g., 1kg bag)"
                      value={variant.name || ""}
                      onChange={(e) => {
                        const newVariants = [...(formData.variants || [])];
                        newVariants[idx].name = e.target.value;
                        onFormDataChange({
                          ...formData,
                          variants: newVariants,
                        });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={variant.price || ""}
                      onChange={(e) => {
                        const newVariants = [...(formData.variants || [])];
                        newVariants[idx].price = Number(e.target.value);
                        onFormDataChange({
                          ...formData,
                          variants: newVariants,
                        });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Stock"
                      value={variant.inventory || ""}
                      onChange={(e) => {
                        const newVariants = [...(formData.variants || [])];
                        newVariants[idx].inventory = Number(e.target.value);
                        onFormDataChange({
                          ...formData,
                          variants: newVariants,
                        });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newVariants = (formData.variants || []).filter(
                          (_: any, i: number) => i !== idx,
                        );
                        if (newVariants.length === 0) {
                          onFormDataChange({
                            ...formData,
                            variants: undefined,
                            price: 0,
                          });
                        } else {
                          onFormDataChange({
                            ...formData,
                            variants: newVariants,
                          });
                        }
                      }}
                      className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(variant.logistics)}
                      onChange={(e) => {
                        const newVariants = [...(formData.variants || [])];
                        newVariants[idx] = {
                          ...newVariants[idx],
                          logistics: e.target.checked
                            ? (buildVariantLogisticsDraft(
                                formData,
                              ) as ProductLogistics)
                            : undefined,
                        };
                        onFormDataChange({
                          ...formData,
                          variants: newVariants,
                        });
                      }}
                      className="w-4 h-4 rounded border border-border cursor-pointer"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Use variant-specific logistics
                    </span>
                  </label>

                  {variant.logistics ? (
                    <div className="rounded-lg border border-border bg-background/70 p-4 space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Leave this off when the variant ships the same way as
                        the main product. When enabled, this variant uses its
                        own weight and optional dimensions.
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Sales Unit
                          </label>
                          <select
                            value={
                              variant.logistics?.salesUnit ||
                              defaultLogistics.salesUnit
                            }
                            onChange={(e) => {
                              const newVariants = [
                                ...(formData.variants || []),
                              ];
                              newVariants[idx] = {
                                ...newVariants[idx],
                                logistics: {
                                  ...(newVariants[idx].logistics || {}),
                                  salesUnit: e.target
                                    .value as ProductLogistics["salesUnit"],
                                } as ProductLogistics,
                              };
                              onFormDataChange({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {salesUnits.map((unit) => (
                              <option
                                key={unit}
                                value={unit}
                                className="bg-background text-foreground"
                              >
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Package Type
                          </label>
                          <select
                            value={
                              variant.logistics?.packageType ||
                              defaultLogistics.packageType
                            }
                            onChange={(e) => {
                              const newVariants = [
                                ...(formData.variants || []),
                              ];
                              newVariants[idx] = {
                                ...newVariants[idx],
                                logistics: {
                                  ...(newVariants[idx].logistics || {}),
                                  packageType: e.target
                                    .value as ProductLogistics["packageType"],
                                } as ProductLogistics,
                              };
                              onFormDataChange({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {packageTypes.map((type) => (
                              <option
                                key={type}
                                value={type}
                                className="bg-background text-foreground"
                              >
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Unit Weight (kg)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="e.g. 5"
                            value={variant.logistics?.unitWeightKg ?? ""}
                            onChange={(e) => {
                              const newVariants = [
                                ...(formData.variants || []),
                              ];
                              newVariants[idx] = {
                                ...newVariants[idx],
                                logistics: {
                                  ...(newVariants[idx].logistics || {}),
                                  unitWeightKg:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                } as ProductLogistics,
                              };
                              onFormDataChange({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Length (cm)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Optional"
                            value={variant.logistics?.unitLengthCm ?? ""}
                            onChange={(e) => {
                              const newVariants = [
                                ...(formData.variants || []),
                              ];
                              newVariants[idx] = {
                                ...newVariants[idx],
                                logistics: {
                                  ...(newVariants[idx].logistics || {}),
                                  unitLengthCm:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                } as ProductLogistics,
                              };
                              onFormDataChange({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Width (cm)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Optional"
                            value={variant.logistics?.unitWidthCm ?? ""}
                            onChange={(e) => {
                              const newVariants = [
                                ...(formData.variants || []),
                              ];
                              newVariants[idx] = {
                                ...newVariants[idx],
                                logistics: {
                                  ...(newVariants[idx].logistics || {}),
                                  unitWidthCm:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                } as ProductLogistics,
                              };
                              onFormDataChange({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Height (cm)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Optional"
                            value={variant.logistics?.unitHeightCm ?? ""}
                            onChange={(e) => {
                              const newVariants = [
                                ...(formData.variants || []),
                              ];
                              newVariants[idx] = {
                                ...newVariants[idx],
                                logistics: {
                                  ...(newVariants[idx].logistics || {}),
                                  unitHeightCm:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                } as ProductLogistics,
                              };
                              onFormDataChange({
                                ...formData,
                                variants: newVariants,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1 text-xs font-medium text-primary">
                        <p>
                          Actual weight:{" "}
                          {variantLogisticsPreview.unitWeightKg > 0
                            ? `${variantLogisticsPreview.unitWeightKg.toFixed(
                                1,
                              )} kg`
                            : "Enter unit weight to preview shipping."}
                        </p>
                        {hasCompleteDimensions(variantLogisticsPreview) &&
                        variantVolumetric != null &&
                        variantChargeable != null ? (
                          <>
                            <p>
                              Volumetric weight: {variantVolumetric.toFixed(1)}{" "}
                              kg
                            </p>
                            <p>
                              Chargeable weight preview:{" "}
                              {variantChargeable.toFixed(1)} kg per sales unit
                            </p>
                          </>
                        ) : variantChargeable != null &&
                          variantLogisticsPreview.unitWeightKg > 0 ? (
                          <>
                            <p>Using actual weight only</p>
                            <p>
                              Chargeable weight preview:{" "}
                              {variantChargeable.toFixed(1)} kg per sales unit
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This variant will inherit the product logistics above
                      until you enable custom logistics.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </fieldset>
  );
}

export { defaultLogistics, parseOptionalNumber, buildVariantLogisticsDraft };
