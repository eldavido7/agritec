"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getSellerMockData, packageTypes, salesUnits, unitChargeableWeightKg, type ProductLogistics, type SellerProduct } from "@/lib/mock-data";
import { Plus, Edit, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";

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

const defaultLogistics = {
  salesUnit: "PIECE" as const,
  unitWeightKg: 0,
  unitLengthCm: 0,
  unitWidthCm: 0,
  unitHeightCm: 0,
  packageType: "PIECE" as const,
};

type Variant = { id: number; name: string; price: number; inventory: number; logistics?: ProductLogistics };
type Product = SellerProduct & { inventory: number };
type ModalMode = "view" | "edit" | "create" | null;

export default function ProductsPage() {
  const seller = getSellerMockData();
  const [products, setProducts] = useState<Product[]>(
    seller.products as Product[],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const categories = [...PLATFORM_CATEGORIES];

  const displayCategories = ["All", ...categories];
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

  const handleDelete = (id: number) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      const product = products.find((p) => p.id === deleteConfirm);
      setProducts(products.filter((p) => p.id !== deleteConfirm));
      toast.success(`${product?.name} has been deleted`);
      setDeleteConfirm(null);
      closeModal();
      if (paginatedProducts.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const openModal = (product: Product | null, mode: ModalMode) => {
    setSelectedProduct(product);
    setModalMode(mode);
    setImageIndex(0);
    setDeleteConfirm(null);
    if (mode === "create") {
      setFormData({
        category: categories[0] || "Vegetables",
        status: "Active",
        variants: [],
        images: [],
        ...defaultLogistics,
      });
    } else if (product) {
      setFormData({ ...product });
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

  const handleSave = () => {
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

    const basePrice = hasVariants
      ? formData.variants?.[0]?.price || 0
      : formData.price || 0;
    const totalInventory = hasVariants
      ? formData.variants?.reduce(
          (sum: number, v: any) => sum + (v.inventory || 0),
          0,
        ) || 0
      : formData.inventory || 0;

    if (modalMode === "create") {
      const newProduct: Product = {
        id: Math.max(...products.map((p) => p.id), 0) + 1,
        name: formData.name,
        category: formData.category,
        price: basePrice,
        inventory: totalInventory,
        status: "Active",
        images:
          formData.images && formData.images.length > 0
            ? formData.images
            : [
                "https://images.unsplash.com/photo-1586190251793-378ec6acda75?w=400&h=300&fit=crop",
              ],
        variants: hasVariants ? formData.variants : undefined,
        salesUnit: formData.salesUnit || defaultLogistics.salesUnit,
        unitWeightKg: Number(formData.unitWeightKg) || defaultLogistics.unitWeightKg,
        unitLengthCm: Number(formData.unitLengthCm) || defaultLogistics.unitLengthCm,
        unitWidthCm: Number(formData.unitWidthCm) || defaultLogistics.unitWidthCm,
        unitHeightCm: Number(formData.unitHeightCm) || defaultLogistics.unitHeightCm,
        packageType: formData.packageType || defaultLogistics.packageType,
        dateAdded: new Date(),
        sellerId: seller.id,
      };
      setProducts([...products, newProduct]);
      toast.success(`${newProduct.name} has been created`);
    } else if (selectedProduct && modalMode === "edit") {
      setProducts(
        products.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                ...formData,
                price: basePrice,
                inventory: totalInventory,
                status: formData.status || "Active",
                variants: hasVariants ? formData.variants : undefined,
              }
            : p,
        ),
      );
      toast.success(`${formData.name} has been updated`);
    }
    closeModal();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground mt-2">
              Manage your agricultural products and inventory
              {" "}for {seller.farmName}
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
                          selectedProduct.images?.[imageIndex] ||
                          selectedProduct.images?.[0]
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
                                src={img}
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
                        {unitChargeableWeightKg(selectedProduct).toFixed(1)} kg/unit
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
                          {selectedProduct.variants.map((variant: Variant) => (
                            <div
                              key={variant.id}
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
                      className="flex-1 border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => handleDelete(selectedProduct.id)}
                    >
                      Delete
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
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const newImages = [
                                      ...(formData.images || []),
                                    ];
                                    newImages[idx] = reader.result as string;
                                    setFormData({
                                      ...formData,
                                      images: newImages.filter(Boolean),
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="hidden"
                                id={`image-upload-${idx}`}
                              />
                              <label
                                htmlFor={`image-upload-${idx}`}
                                className="cursor-pointer block"
                              >
                                {image ? (
                                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border group">
                                    <img
                                      src={
                                        typeof image === "string"
                                          ? image
                                          : URL.createObjectURL(image as any)
                                      }
                                      alt={`preview ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const newImages =
                                          formData.images?.filter(
                                            (_: any, i: number) => i !== idx,
                                          ) || [];
                                        setFormData({
                                          ...formData,
                                          images: newImages,
                                        });
                                      }}
                                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                      <X className="w-5 h-5 text-white" />
                                    </button>
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
                        PNG, JPG - Click on any box to upload or replace
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
                            setFormData({ ...formData, status: e.target.value })
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
                            setFormData({ ...(formData as any), categoryNote: e.target.value })
                          }
                          placeholder="e.g. Natural Sweeteners"
                        />
                      </div>
                    )}

                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Sales unit and logistics</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Buyers purchase by sales unit. Weight and dimensions are used only by platform delivery pricing.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-foreground">Sales Unit</label>
                          <select
                            value={formData.salesUnit || defaultLogistics.salesUnit}
                            onChange={(e) => setFormData({ ...formData, salesUnit: e.target.value as any })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {salesUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Package Type</label>
                          <select
                            value={formData.packageType || defaultLogistics.packageType}
                            onChange={(e) => setFormData({ ...formData, packageType: e.target.value as any })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {packageTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Unit Weight (kg)</label>
                          <Input type="number" min="0" step="0.1" placeholder="e.g. 2.5" value={formData.unitWeightKg || ""} onChange={(e) => setFormData({ ...formData, unitWeightKg: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Length (cm)</label>
                          <Input type="number" min="0" step="0.1" placeholder="e.g. 30" value={formData.unitLengthCm || ""} onChange={(e) => setFormData({ ...formData, unitLengthCm: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Width (cm)</label>
                          <Input type="number" min="0" step="0.1" placeholder="e.g. 20" value={formData.unitWidthCm || ""} onChange={(e) => setFormData({ ...formData, unitWidthCm: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Height (cm)</label>
                          <Input type="number" min="0" step="0.1" placeholder="e.g. 15" value={formData.unitHeightCm || ""} onChange={(e) => setFormData({ ...formData, unitHeightCm: Number(e.target.value) })} />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-primary">
                        Chargeable weight preview: {unitChargeableWeightKg({
                          salesUnit: formData.salesUnit || defaultLogistics.salesUnit,
                          unitWeightKg: Number(formData.unitWeightKg) || defaultLogistics.unitWeightKg,
                          unitLengthCm: Number(formData.unitLengthCm) || defaultLogistics.unitLengthCm,
                          unitWidthCm: Number(formData.unitWidthCm) || defaultLogistics.unitWidthCm,
                          unitHeightCm: Number(formData.unitHeightCm) || defaultLogistics.unitHeightCm,
                          packageType: formData.packageType || defaultLogistics.packageType,
                        }).toFixed(1)} kg per sales unit
                      </p>
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
                                    id: Date.now(),
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
                            Price (₦) *
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
                          <label className="text-sm font-medium text-foreground">
                            Variants (Greyed out: price/inventory come from
                            variants)
                          </label>
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
                                    id: Date.now(),
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
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {(formData.variants || []).map(
                            (variant: any, idx: number) => (
                              <div
                                key={variant.id}
                                className="flex gap-2 items-end p-3 bg-muted/30 rounded-lg"
                              >
                                <Input
                                  placeholder="Variant name (e.g., 1kg)"
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
                                  className="flex-1"
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
                                  className="w-24"
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
                                  className="w-24"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newVariants = (
                                      formData.variants || []
                                    ).filter((_: any, i: number) => i !== idx);
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
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSave}
                    >
                      {modalMode === "create"
                        ? "Create Product"
                        : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      onClick={closeModal}
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
                className="flex-1 border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}



