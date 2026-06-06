"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getSellerMockData,
  type SellerDiscount,
  type SellerProduct,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/formatting";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDiscountModal } from "./components/delete-discount-modal";
import { DiscountFormModal } from "./components/discount-form-modal";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ITEMS_PER_PAGE = 8;

const getDiscountState = (discount: SellerDiscount) => {
  if (!discount.isActive) return "Inactive";
  const now = new Date();
  if (discount.startsAt > now) return "Scheduled";
  if (discount.endsAt && discount.endsAt < now) return "Expired";
  return "Active";
};

const stateClassName: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  Scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  Expired: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  Inactive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

const productLabel = (discount: SellerDiscount, products: SellerProduct[]) => {
  const productNames = discount.productIds
    .map((id) => products.find((product) => product.id === id)?.name)
    .filter(Boolean);

  const variantNames = discount.variantIds
    .map((variantId) => {
      const product = products.find((item) =>
        item.variants?.some((variant) => variant.id === variantId),
      );
      const variant = product?.variants?.find((item) => item.id === variantId);
      return product && variant ? `${product.name}: ${variant.name}` : null;
    })
    .filter(Boolean);

  const labels = [...productNames, ...variantNames];
  if (labels.length === 0) return "All seller products";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
};

export default function DiscountsPage() {
  const seller = getSellerMockData();
  const [discounts, setDiscounts] = useState<SellerDiscount[]>(
    seller.discounts,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedDiscount, setSelectedDiscount] =
    useState<SellerDiscount | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filteredDiscounts = useMemo(() => {
    return discounts.filter((discount) => {
      const state = getDiscountState(discount);
      const searchable = [
        discount.code,
        discount.description,
        productLabel(discount, seller.products),
      ]
        .join(" ")
        .toLowerCase();
      return (
        searchable.includes(searchQuery.toLowerCase()) &&
        (stateFilter === "All" || state === stateFilter) &&
        (typeFilter === "All" || discount.type === typeFilter)
      );
    });
  }, [discounts, searchQuery, seller.products, stateFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDiscounts.length / ITEMS_PER_PAGE),
  );
  const paginatedDiscounts = filteredDiscounts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const openCreate = () => {
    setFormMode("create");
    setSelectedDiscount(null);
    setFormOpen(true);
  };

  const openEdit = (discount: SellerDiscount) => {
    setFormMode("edit");
    setSelectedDiscount(discount);
    setFormOpen(true);
  };

  const saveDiscount = (discount: SellerDiscount) => {
    setDiscounts((current) =>
      formMode === "edit"
        ? current.map((item) => (item.id === discount.id ? discount : item))
        : [discount, ...current],
    );
    setFormOpen(false);
    toast.success(
      formMode === "edit" ? "Discount updated" : "Discount created",
    );
  };

  const deleteDiscount = (id: string) => {
    setDiscounts((current) => current.filter((discount) => discount.id !== id));
    toast.success("Discount deleted");
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-muted-foreground">
            Manage discount codes for {seller.farmName}. Products and variants
            are limited to this seller.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Discount
        </Button>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-4"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search discounts, products, or variants..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", "Active", "Scheduled", "Expired", "Inactive"].map(
              (state) => (
                <Button
                  key={state}
                  variant={stateFilter === state ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStateFilter(state);
                    setCurrentPage(1);
                  }}
                >
                  {state}
                </Button>
              ),
            )}
          </div>
          <div className="flex gap-2">
            {[
              { id: "All", label: "All types" },
              { id: "percentage", label: "Percent" },
              { id: "fixed", label: "Fixed" },
            ].map((type) => (
              <Button
                key={type.id}
                variant={typeFilter === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTypeFilter(type.id);
                  setCurrentPage(1);
                }}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Products / Variants
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Dates
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    State
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedDiscounts.length > 0 ? (
                  paginatedDiscounts.map((discount) => {
                    const state = getDiscountState(discount);
                    return (
                      <tr
                        key={discount.id}
                        className="border-b last:border-b-0 hover:bg-secondary/40"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">
                            {discount.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Used {discount.usageCount}
                            {discount.usageLimit
                              ? `/${discount.usageLimit}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {discount.type === "percentage"
                            ? `${discount.value}%`
                            : formatCurrency(discount.value)}
                          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {discount.description}
                          </p>
                        </td>
                        <td className="max-w-[280px] px-4 py-4 text-sm text-foreground">
                          {productLabel(discount, seller.products)}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <CalendarDays className="mt-0.5 h-4 w-4" />
                            <div>
                              <p>{formatDate(discount.startsAt)}</p>
                              <p>
                                {discount.endsAt
                                  ? formatDate(discount.endsAt)
                                  : "No end date"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={stateClassName[state]}>
                            {state}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(discount)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedDiscount(discount);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No discounts match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} / {filteredDiscounts.length}{" "}
              discounts
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <DiscountFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        sellerId={seller.id}
        products={seller.products}
        discount={selectedDiscount}
        onSubmit={saveDiscount}
      />

      <DeleteDiscountModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        discount={selectedDiscount}
        onDelete={deleteDiscount}
      />
    </div>
  );
}

