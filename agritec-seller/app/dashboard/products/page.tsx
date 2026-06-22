"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { categorySlugFromLabel } from "@/lib/mock-data";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  useSellerProductsStore,
  type SellerProductRecord,
} from "@/stores/seller-products-store";
import { ViewProductModal } from "./view-product-modal";
import { CreateProductModal } from "./create-product-modal";
import { EditProductModal } from "./edit-product-modal";
import {
  type DraftProductImage,
  type ProductFormDraft,
} from "./product-form";

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

export default function ProductsPage() {
  const sellerProfile = useSellerAuthStore(
    (state) => state.user?.sellerProfile,
  );
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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<SellerProductRecord | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormDraft>({});
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(
    null,
  );
  const categories = [...PLATFORM_CATEGORIES];

  const displayCategories = ["All", ...categories];
  const isImageUploading = uploadingImageIndex !== null;
  const isFormBusy = isSaving || isImageUploading;

  useEffect(() => {
    if (!authReady) return;
    void fetchProducts();
  }, [authReady, fetchProducts]);

  const cleanupDraftImages = (images?: DraftProductImage[]) => {
    for (const image of images || []) {
      if (image?.isLocalDraft && image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    }
  };

  const handleSelectImage = (file: File, index: number) => {
    setFormData((current) => {
      const nextImages = [...(current.images || [])];
      const existing = nextImages[index];
      if (existing?.isLocalDraft && existing.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      nextImages[index] = {
        secureUrl: previewUrl,
        previewUrl,
        file,
        isLocalDraft: true,
        publicId: null,
        altText: file.name,
        displayOrder: index,
      };

      return {
        ...current,
        images: nextImages,
      };
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData((current) => {
      const nextImages = [...(current.images || [])];
      const existing = nextImages[index];
      if (existing?.isLocalDraft && existing.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }
      nextImages.splice(index, 1);
      return {
        ...current,
        images: nextImages,
      };
    });
  };

  const resolveDraftImages = async (images: DraftProductImage[] = []) => {
    const resolved = [] as DraftProductImage[];

    try {
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (!image?.secureUrl?.trim()) continue;

        if (image.file) {
          setUploadingImageIndex(index);
          const result = await uploadProductImage(image.file, index);
          resolved.push({
            secureUrl: result.secureUrl,
            publicId: result.publicId ?? null,
            altText:
              image.altText ?? result.altText ?? `Product image ${index + 1}`,
            displayOrder: index,
          });
        } else {
          resolved.push({
            secureUrl: image.secureUrl,
            publicId: image.publicId ?? null,
            altText: image.altText ?? null,
            displayOrder: image.displayOrder ?? index,
          });
        }
      }

      return resolved;
    } finally {
      setUploadingImageIndex(null);
    }
  };

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

  const getTotalInventory = (product: SellerProductRecord) => {
    if (!product.variants || product.variants.length === 0) {
      return product.inventory || 0;
    }
    return product.variants.reduce(
      (sum: number, v) => sum + (v.inventory || 0),
      0,
    );
  };

  const getProductStatus = (product: SellerProductRecord) => {
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
        setUploadingImageIndex(null);
        setViewModalOpen(false);
        if (paginatedProducts.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      })
      .catch((archiveError) =>
        toast.error(
          archiveError instanceof Error
            ? archiveError.message
            : "Unable to delete product",
        ),
      );
  };

  const openViewModal = (product: SellerProductRecord) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
    setImageIndex(0);
    setDeleteConfirm(null);
  };

  const openEditModal = (product: SellerProductRecord) => {
    cleanupDraftImages(formData.images);
    setSelectedProduct(product);
    setEditModalOpen(true);
    setImageIndex(0);
    setDeleteConfirm(null);
    setFormData({
      ...product,
      images: (product.images || []).map((image) => ({ ...image })),
      variants: product.variants?.map((variant) => ({
        ...variant,
        logistics: variant.logistics ? { ...variant.logistics } : undefined,
      })),
    });
  };

  const openCreateModal = () => {
    cleanupDraftImages(formData.images);
    setSelectedProduct(null);
    setCreateModalOpen(true);
    setImageIndex(0);
    setDeleteConfirm(null);
    setFormData({
      category: categories[0] || "Vegetables",
      categorySlug: categorySlugFromLabel(categories[0] || "Vegetables"),
      status: "Active",
      variants: [],
      images: [],
      salesUnit: "PIECE",
      unitWeightKg: undefined,
      unitLengthCm: undefined,
      unitWidthCm: undefined,
      unitHeightCm: undefined,
      packageType: "PIECE",
    });
  };

  const closeAllModals = () => {
    cleanupDraftImages(formData.images);
    setViewModalOpen(false);
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setSelectedProduct(null);
    setImageIndex(0);
    setUploadingImageIndex(null);
    setFormData({});
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
            onClick={openCreateModal}
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
                          onClick={() => openViewModal(product)}
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
                            onClick={() => openEditModal(product)}
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

      {/* Modals */}
      <ViewProductModal
        isOpen={viewModalOpen}
        product={selectedProduct}
        imageIndex={imageIndex}
        onImageIndexChange={setImageIndex}
        onClose={closeAllModals}
        onEdit={(product) => {
          openEditModal(product);
          setViewModalOpen(false);
        }}
        onDelete={handleDelete}
        getTotalInventory={getTotalInventory}
        getProductStatus={getProductStatus}
      />

      <CreateProductModal
        isOpen={createModalOpen}
        formData={formData}
        onFormDataChange={setFormData}
        categories={categories}
        uploadingImageIndex={uploadingImageIndex}
        isSaving={isSaving}
        isImageUploading={isImageUploading}
        onClose={closeAllModals}
        onSave={async (payload) => {
          const resolvedImages = await resolveDraftImages(payload.images || []);
          await createProduct({
            ...payload,
            images: resolvedImages,
          });
        }}
        onSelectImage={handleSelectImage}
        onRemoveImage={handleRemoveImage}
      />

      <EditProductModal
        isOpen={editModalOpen}
        formData={formData}
        onFormDataChange={setFormData}
        categories={categories}
        uploadingImageIndex={uploadingImageIndex}
        isSaving={isSaving}
        isImageUploading={isImageUploading}
        onClose={closeAllModals}
        onSave={async (productId, payload) => {
          const resolvedImages = await resolveDraftImages(payload.images || []);
          await updateProduct(productId, {
            ...payload,
            images: resolvedImages,
          });
        }}
        onSelectImage={handleSelectImage}
        onRemoveImage={handleRemoveImage}
        selectedProductId={selectedProduct?.id ?? null}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-sm w-full p-6"
          >
            <h3 className="text-lg font-bold text-foreground mb-2">
              Delete Product?
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






