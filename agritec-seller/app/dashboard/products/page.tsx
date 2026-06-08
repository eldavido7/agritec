"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  categorySlugFromLabel,
  hasCompleteDimensions,
  packageTypes,
  salesUnits,
  unitChargeableWeightKg,
  volumetricWeightKg,
  type ProductLogistics,
} from "@/lib/mock-data";
import { Plus, Edit, Trash2, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  useSellerProductsStore,
  type SellerProductRecord,
  type SellerProductVariantRecord,
  type SellerProductImageRecord,
} from "@/stores/seller-products-store";

const PLATFORM_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Grains & Cereals",
  "Tubers & Roots",
  "Legumes",
  "Spices & Herbs",
  "Livestock",
  "Poultry",
  "Fish & Seafood",
  "Dairy",
  "Seeds & Seedlings",
  "Farm Inputs",
  "Processed Farm Products",
  "Other",
] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ITEMS_PER_PAGE = 10;
const CLOUDINARY_FREE_IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;

const formatFileSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

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
  product: Partial<Product>,
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

const normalizeVariantLogistics = (
  product: Partial<Product>,
  logistics?: Partial<ProductLogistics>,
): ProductLogistics | undefined => {
  if (!logistics) return undefined;
  const draft = buildVariantLogisticsDraft(product, logistics);
  const unitWeightKg = parseOptionalNumber(draft.unitWeightKg);
  if (unitWeightKg == null) return undefined;
  return {
    salesUnit: draft.salesUnit || defaultLogistics.salesUnit,
    unitWeightKg,
    unitLengthCm: parseOptionalNumber(draft.unitLengthCm),
    unitWidthCm: parseOptionalNumber(draft.unitWidthCm),
    unitHeightCm: parseOptionalNumber(draft.unitHeightCm),
    packageType: draft.packageType || defaultLogistics.packageType,
  };
};

type Variant = SellerProductVariantRecord;
type ProductImage = SellerProductImageRecord;
type Product = SellerProductRecord;
type ModalMode = "view" | "edit" | "create" | null;

export default function ProductsPage() {
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
  const authReady = useSellerAuthStore((state) => state.isReady);
  const {
    products,
    isLoading,
    isSaving,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    archiveProduct,
    uploadProductImage,
  } = useSellerProductsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const categories = [...PLATFORM_CATEGORIES];

  const displayCategories = ["All", ...categories];

  useEffect(() => {
    if (!authReady) return;
    void fetchProducts();
  }, [authReady, fetchProducts]);

  const filteredProducts = products.filter(
    (product) =>
      (filterCategory === "All" || product.category === filterCategory) &&
      product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const getTotalInventory = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return product.inventory || 0;
    }
    return product.variants.reduce(
      (sum: number, v: Variant) => sum + (v.inventory || 0),
      0,
    );
  };

  const getProductStatus = (product: Product) => {
    const totalInv = getTotalInventory(product);
    if (totalInv === 0) return "Sold Out";
    if (totalInv <= 10) return "Low Stock";
    return "Active";
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    const product = products.find((p) => p.id === deleteConfirm);
    void archiveProduct(deleteConfirm)
      .then(() => {
        toast.success(`${product?.name} has been archived`);
        setDeleteConfirm(null);
        closeModal();
        if (paginatedProducts.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      })
      .catch((archiveError) =>
        toast.error(
          archiveError instanceof Error
            ? archiveError.message
            : "Unable to archive product",
        ),
      );
  };

  const openModal = (product: Product | null, mode: ModalMode) => {
    setSelectedProduct(product);
    setModalMode(mode);
    setImageIndex(0);
    setDeleteConfirm(null);
    if (mode === "create") {
      setFormData({
        category: categories[0] || "Vegetables",
        categorySlug: categorySlugFromLabel(categories[0] || "Vegetables"),
        status: "Active",
        variants: [],
        images: [],
        ...defaultLogistics,
      });
    } else if (product) {
      setFormData({
        ...product,
        images: (product.images || []).map((image) => ({ ...image })),
        variants: product.variants?.map((variant) => ({
          ...variant,
          logistics: variant.logistics ? { ...variant.logistics } : undefined,
        })),
      });
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProduct(null);
    setImageIndex(0);
    setFormData({});
  };

  const hasVariants =
    (formData.variants && formData.variants.length > 0) || false;

  const handleSave = async () => {
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

    const normalizedImages = (formData.images || [])
      .map((image, index) => {
        if (!image?.secureUrl?.trim()) return null;
        return {
          secureUrl: image.secureUrl.trim(),
          publicId: image.publicId ?? null,
          altText: image.altText ?? `${formData.name || "Product"} image ${index + 1}`,
          displayOrder: image.displayOrder ?? index,
        };
      })
      .filter((image): image is ProductImage => Boolean(image));

    if (normalizedImages.length === 0) {
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
      images: normalizedImages,
    };

    try {
      if (modalMode === "create") {
        await createProduct(payload);
        toast.success(`${payload.name} has been created`);
      } else if (selectedProduct && modalMode === "edit") {
        await updateProduct(selectedProduct.id, payload);
        toast.success(`${payload.name} has been updated`);
      }
      closeModal();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Unable to save product",
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground mt-2">
              Manage your agricultural products and inventory for{" "}
              {sellerProfile?.farmName || "your farm"}
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => openModal(null, "create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-4"
      >
        <div className="relative">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {displayCategories.map((category) => (
            <Button
              key={category}
              variant={filterCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterCategory(category);
                setCurrentPage(1);
              }}
              className={
                filterCategory === category
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Products Table */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Price
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Inventory
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const status = getProductStatus(product);
                  const statusColor =
                    status === "Sold Out"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                      : status === "Low Stock"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openModal(product, "view")}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {product.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {product.category}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {getTotalInventory(product)} units
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                            onClick={() => openModal(product, "edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredProducts.length}{" "}
                products)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? "bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      }
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Main Modal */}
      {modalMode && !deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-border bg-card">
              <h2 className="text-xl font-bold text-foreground">
                {modalMode === "view" && "View Product"}
                {modalMode === "edit" && "Edit Product"}
                {modalMode === "create" && "Create Product"}
              </h2>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {modalMode === "view" && selectedProduct ? (
                <>
                  {/* Image Gallery */}
                  <div className="space-y-4">
                    <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                      <img
                        src={
                          selectedProduct.images?.[imageIndex]?.secureUrl ||
                          selectedProduct.images?.[0]?.secureUrl
                        }
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedProduct.images &&
                      selectedProduct.images.length > 1 && (
                        <div className="flex gap-2">
                          {selectedProduct.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setImageIndex(idx)}
                              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                imageIndex === idx
                                  ? "border-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <img
                                src={img.secureUrl}
                                alt={`${selectedProduct.name} ${idx + 1}`}
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
                      <p className="font-semibold text-foreground">
                        {selectedProduct.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Category
                      </p>
                      <p className="font-semibold text-foreground">
                        {selectedProduct.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Price
                      </p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(selectedProduct.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Inventory
                      </p>
                      <p className="font-semibold text-foreground">
                        {getTotalInventory(selectedProduct)} units
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Status
                      </p>
                      <p className="font-semibold text-foreground">
                        {getProductStatus(selectedProduct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Sales Unit
                      </p>
                      <p className="font-semibold text-foreground">
                        {selectedProduct.salesUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Chargeable Weight
                      </p>
                      <p className="font-semibold text-foreground">
                        {unitChargeableWeightKg(selectedProduct).toFixed(1)}{" "}
                        kg/unit
                      </p>
                    </div>
                  </div>

                  {selectedProduct.variants &&
                    selectedProduct.variants.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-3">
                          Variants
                        </p>
                        <div className="space-y-2">
                          {selectedProduct.variants.map((variant) => (
                            <div
                              key={variant.id || variant.name}
                              className="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
                            >
                              <div>
                                <p className="text-foreground">
                                  {variant.name}
                                </p>
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
                      onClick={() => openModal(selectedProduct, "edit")}
                    >
                      Edit Product
                    </Button>
                    <Button
                      className="flex-1 border bg-red-100 border-red-200 text-red-700 hover:bg-red-200 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/50"
                      onClick={() => handleDelete(selectedProduct.id)}
                    >
                      Archive
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      onClick={closeModal}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit/Create Form */}
                  <div className="space-y-4">
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
                                      `Image is too large. Cloudinary free plan supports up to ${formatFileSize(CLOUDINARY_FREE_IMAGE_LIMIT_BYTES)} per image.`
                                    );
                                    e.target.value = "";
                                    return;
                                  }

                                  try {
                                    const uploadedImage = await uploadProductImage(
                                      file,
                                      idx,
                                    );
                                    const newImages = [
                                      ...(formData.images || []),
                                    ];
                                    newImages[idx] = uploadedImage;
                                    setFormData({
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
                              />
                              <label
                                htmlFor={`image-upload-${idx}`}
                                className="cursor-pointer block"
                              >
                                {image ? (
                                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border group bg-muted/20">
                                    <img
                                      src={image.secureUrl}
                                      alt={`preview ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const newImages =
                                          formData.images?.filter(
                                            (_: any, i: number) => i !== idx,
                                          ) || [];
                                        setFormData({
                                          ...formData,
                                          images: newImages,
                                        });
                                      }}
                                      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-100 shadow-sm transition hover:bg-black"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                                  </div>
                                ) : (
                                  <div className="w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center bg-muted/20">
                                    <Plus className="w-6 h-6 text-muted-foreground" />
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
                        Cloudinary free plan supports up to {formatFileSize(CLOUDINARY_FREE_IMAGE_LIMIT_BYTES)} per image. Uploads now go directly to Cloudinary using a signed backend payload.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Product Name *
                      </label>
                      <Input
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
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
                            setFormData({
                              ...formData,
                              category: e.target.value,
                              categorySlug: categorySlugFromLabel(
                                e.target.value,
                              ),
                            })
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select a category</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Status
                        </label>
                        <select
                          value={formData.status || "Active"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              status: e.target
                                .value as SellerProductRecord["status"],
                            })
                          }
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option>Active</option>
                          <option>Inactive</option>
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
                            setFormData({
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
                          Buyers purchase by sales unit. Weight and dimensions
                          are used only by platform delivery pricing.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Dimensions are optional. If left empty, shipping will
                          be calculated using the product&apos;s weight only.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Sales Unit
                          </label>
                          <select
                            value={
                              formData.salesUnit || defaultLogistics.salesUnit
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                salesUnit: e.target
                                  .value as SellerProductRecord["salesUnit"],
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {salesUnits.map((unit) => (
                              <option key={unit} value={unit}>
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
                              formData.packageType ||
                              defaultLogistics.packageType
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                packageType: e.target
                                  .value as SellerProductRecord["packageType"],
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {packageTypes.map((type) => (
                              <option key={type} value={type}>
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
                              setFormData({
                                ...formData,
                                unitWeightKg:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
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
                              setFormData({
                                ...formData,
                                unitLengthCm:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
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
                              setFormData({
                                ...formData,
                                unitWidthCm:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
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
                              setFormData({
                                ...formData,
                                unitHeightCm:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      {(() => {
                        const logisticsPreview = {
                          salesUnit:
                            formData.salesUnit || defaultLogistics.salesUnit,
                          unitWeightKg:
                            parseOptionalNumber(formData.unitWeightKg) || 0,
                          unitLengthCm: parseOptionalNumber(
                            formData.unitLengthCm,
                          ),
                          unitWidthCm: parseOptionalNumber(
                            formData.unitWidthCm,
                          ),
                          unitHeightCm: parseOptionalNumber(
                            formData.unitHeightCm,
                          ),
                          packageType:
                            formData.packageType ||
                            defaultLogistics.packageType,
                        } satisfies ProductLogistics;
                        const volumetric = volumetricWeightKg(logisticsPreview);
                        const chargeable =
                          unitChargeableWeightKg(logisticsPreview);
                        return (
                          <div className="space-y-1 text-xs font-medium text-primary">
                            <p>
                              Actual weight:{" "}
                              {logisticsPreview.unitWeightKg > 0
                                ? `${logisticsPreview.unitWeightKg.toFixed(1)} kg`
                                : "Enter unit weight to preview shipping."}
                            </p>
                            {hasCompleteDimensions(logisticsPreview) &&
                            volumetric != null ? (
                              <>
                                <p>
                                  Volumetric weight: {volumetric.toFixed(1)} kg
                                </p>
                                <p>
                                  Chargeable weight preview:{" "}
                                  {chargeable.toFixed(1)} kg per sales unit
                                </p>
                              </>
                            ) : logisticsPreview.unitWeightKg > 0 ? (
                              <>
                                <p>Using actual weight only</p>
                                <p>
                                  Chargeable weight preview:{" "}
                                  {chargeable.toFixed(1)} kg per sales unit
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
                              setFormData({
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
                              setFormData({
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
                              setFormData({
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
                              setFormData({
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
                              Variants inherit the product logistics by default.
                              Add custom logistics only when a variant changes
                              the shipping weight or package size.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const variants = formData.variants || [];
                              setFormData({
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
                          {(formData.variants || []).map(
                            (variant: any, idx: number) => {
                              const variantLogisticsDraft =
                                buildVariantLogisticsDraft(
                                  formData,
                                  variant.logistics,
                                );
                              const variantLogisticsPreview = {
                                salesUnit:
                                  variantLogisticsDraft.salesUnit ||
                                  defaultLogistics.salesUnit,
                                unitWeightKg:
                                  parseOptionalNumber(
                                    variantLogisticsDraft.unitWeightKg,
                                  ) || 0,
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
                                ? unitChargeableWeightKg(
                                    variantLogisticsPreview,
                                  )
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
                                        const newVariants = [
                                          ...(formData.variants || []),
                                        ];
                                        newVariants[idx].name = e.target.value;
                                        setFormData({
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
                                        const newVariants = [
                                          ...(formData.variants || []),
                                        ];
                                        newVariants[idx].price = Number(
                                          e.target.value,
                                        );
                                        setFormData({
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
                                        const newVariants = [
                                          ...(formData.variants || []),
                                        ];
                                        newVariants[idx].inventory = Number(
                                          e.target.value,
                                        );
                                        setFormData({
                                          ...formData,
                                          variants: newVariants,
                                        });
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newVariants = (
                                          formData.variants || []
                                        ).filter(
                                          (_: any, i: number) => i !== idx,
                                        );
                                        if (newVariants.length === 0) {
                                          setFormData({
                                            ...formData,
                                            variants: undefined,
                                            price: 0,
                                          });
                                        } else {
                                          setFormData({
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
                                        const newVariants = [
                                          ...(formData.variants || []),
                                        ];
                                        newVariants[idx] = {
                                          ...newVariants[idx],
                                          logistics: e.target.checked
                                            ? (buildVariantLogisticsDraft(
                                                formData,
                                              ) as ProductLogistics)
                                            : undefined,
                                        };
                                        setFormData({
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
                                        Leave this off when the variant ships
                                        the same way as the main product. When
                                        enabled, this variant uses its own
                                        weight and optional dimensions.
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
                                                  ...(newVariants[idx]
                                                    .logistics || {}),
                                                  salesUnit: e.target
                                                    .value as ProductLogistics["salesUnit"],
                                                } as ProductLogistics,
                                              };
                                              setFormData({
                                                ...formData,
                                                variants: newVariants,
                                              });
                                            }}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                          >
                                            {salesUnits.map((unit) => (
                                              <option key={unit} value={unit}>
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
                                                  ...(newVariants[idx]
                                                    .logistics || {}),
                                                  packageType: e.target
                                                    .value as ProductLogistics["packageType"],
                                                } as ProductLogistics,
                                              };
                                              setFormData({
                                                ...formData,
                                                variants: newVariants,
                                              });
                                            }}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                          >
                                            {packageTypes.map((type) => (
                                              <option key={type} value={type}>
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
                                            value={
                                              variant.logistics?.unitWeightKg ??
                                              ""
                                            }
                                            onChange={(e) => {
                                              const newVariants = [
                                                ...(formData.variants || []),
                                              ];
                                              newVariants[idx] = {
                                                ...newVariants[idx],
                                                logistics: {
                                                  ...(newVariants[idx]
                                                    .logistics || {}),
                                                  unitWeightKg:
                                                    e.target.value === ""
                                                      ? undefined
                                                      : Number(e.target.value),
                                                } as ProductLogistics,
                                              };
                                              setFormData({
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
                                            value={
                                              variant.logistics?.unitLengthCm ??
                                              ""
                                            }
                                            onChange={(e) => {
                                              const newVariants = [
                                                ...(formData.variants || []),
                                              ];
                                              newVariants[idx] = {
                                                ...newVariants[idx],
                                                logistics: {
                                                  ...(newVariants[idx]
                                                    .logistics || {}),
                                                  unitLengthCm:
                                                    e.target.value === ""
                                                      ? undefined
                                                      : Number(e.target.value),
                                                } as ProductLogistics,
                                              };
                                              setFormData({
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
                                            value={
                                              variant.logistics?.unitWidthCm ??
                                              ""
                                            }
                                            onChange={(e) => {
                                              const newVariants = [
                                                ...(formData.variants || []),
                                              ];
                                              newVariants[idx] = {
                                                ...newVariants[idx],
                                                logistics: {
                                                  ...(newVariants[idx]
                                                    .logistics || {}),
                                                  unitWidthCm:
                                                    e.target.value === ""
                                                      ? undefined
                                                      : Number(e.target.value),
                                                } as ProductLogistics,
                                              };
                                              setFormData({
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
                                            value={
                                              variant.logistics?.unitHeightCm ??
                                              ""
                                            }
                                            onChange={(e) => {
                                              const newVariants = [
                                                ...(formData.variants || []),
                                              ];
                                              newVariants[idx] = {
                                                ...newVariants[idx],
                                                logistics: {
                                                  ...(newVariants[idx]
                                                    .logistics || {}),
                                                  unitHeightCm:
                                                    e.target.value === ""
                                                      ? undefined
                                                      : Number(e.target.value),
                                                } as ProductLogistics,
                                              };
                                              setFormData({
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
                                          {variantLogisticsPreview.unitWeightKg >
                                          0
                                            ? `${variantLogisticsPreview.unitWeightKg.toFixed(1)} kg`
                                            : "Enter unit weight to preview shipping."}
                                        </p>
                                        {hasCompleteDimensions(
                                          variantLogisticsPreview,
                                        ) &&
                                        variantVolumetric != null &&
                                        variantChargeable != null ? (
                                          <>
                                            <p>
                                              Volumetric weight:{" "}
                                              {variantVolumetric.toFixed(1)} kg
                                            </p>
                                            <p>
                                              Chargeable weight preview:{" "}
                                              {variantChargeable.toFixed(1)} kg
                                              per sales unit
                                            </p>
                                          </>
                                        ) : variantChargeable != null &&
                                          variantLogisticsPreview.unitWeightKg >
                                            0 ? (
                                          <>
                                            <p>Using actual weight only</p>
                                            <p>
                                              Chargeable weight preview:{" "}
                                              {variantChargeable.toFixed(1)} kg
                                              per sales unit
                                            </p>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      This variant will inherit the product
                                      logistics above until you enable custom
                                      logistics.
                                    </p>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {modalMode === "create"
                        ? isSaving
                          ? "Creating Product..."
                          : "Create Product"
                        : isSaving
                          ? "Saving Changes..."
                          : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      onClick={closeModal}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-sm w-full p-6"
          >
            <h3 className="text-lg font-bold text-foreground mb-2">
              Archive Product?
            </h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this product? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 border bg-red-50 border-red-200 text-red-700 hover:bg-red-200 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/50"
                onClick={confirmDelete}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}