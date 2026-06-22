"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  useSellerOrdersStore,
  type SellerOrderGroupRecord,
} from "@/stores/seller-orders-store";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ITEMS_PER_PAGE = 10;

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    DELIVERED:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    SHIPPED:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    PROCESSING:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
    PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  };
  return colors[status] || colors.PENDING;
};

const humanizeStatus = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const orderSummary = (orderGroup: SellerOrderGroupRecord) => {
  if (orderGroup.items.length === 0) return "No items";
  const firstItem = orderGroup.items[0];
  return orderGroup.items.length === 1
    ? firstItem.productTitleSnapshot
    : `${firstItem.productTitleSnapshot} +${orderGroup.items.length - 1} more`;
};

const buyerLabel = (orderGroup: SellerOrderGroupRecord) =>
  orderGroup.parentOrder.addressSnapshot?.addressLine ||
  orderGroup.parentOrder.buyerId ||
  "Buyer order";

const formatTimelineDate = (value?: Date) =>
  value
    ? value.toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "-";

export default function OrdersPage() {
  const authReady = useSellerAuthStore((state) => state.isReady);
  const sellerProfile = useSellerAuthStore((state) => state.user?.sellerProfile);
  const {
    orderGroups,
    selectedOrderGroup,
    isLoading,
    isLoadingDetail,
    error,
    fetchOrderGroups,
    fetchOrderGroupById,
    clearSelectedOrderGroup,
  } = useSellerOrdersStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authReady) return;
    void fetchOrderGroups();
  }, [authReady, fetchOrderGroups]);

  const statuses = useMemo(() => {
    const set = new Set(orderGroups.map((orderGroup) => humanizeStatus(orderGroup.status)));
    return ["All", ...Array.from(set)];
  }, [orderGroups]);

  const filteredOrders = orderGroups.filter((orderGroup) => {
    const statusLabel = humanizeStatus(orderGroup.status);
    const searchable = [
      orderGroup.id,
      orderGroup.parentOrderId,
      buyerLabel(orderGroup),
      orderSummary(orderGroup),
      ...orderGroup.items.map((item) => item.productTitleSnapshot),
      ...orderGroup.items.map((item) => item.variantTitleSnapshot || ""),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (filterStatus === "All" || statusLabel === filterStatus) &&
      searchable.includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="text-muted-foreground mt-2">
            Track seller order groups for {sellerProfile?.farmName || "your farm"}. Assigned logistics companies manage delivery progression, while you stay informed through the shared timeline.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-4"
      >
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by order group ID, parent order, product, or buyer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterStatus(status);
                setCurrentPage(1);
              }}
              className={
                filterStatus === status
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              }
            >
              {status}
            </Button>
          ))}
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Spinner className="size-5 text-primary" />
              <span>Loading seller orders...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Order Group ID
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Parent Order
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Items
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Group Total
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Date
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
                    {paginatedOrders.map((orderGroup) => (
                      <tr
                        key={orderGroup.id}
                        className="border-b border-border hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                      >
                        <td
                          className="py-3 px-4 text-sm font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => void fetchOrderGroupById(orderGroup.id)}
                        >
                          {orderGroup.id}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {orderGroup.parentOrderId}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {orderSummary(orderGroup)}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-foreground">
                          {formatCurrency(orderGroup.groupTotal)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {orderGroup.createdAt ? formatDate(orderGroup.createdAt) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(orderGroup.status)}`}
                          >
                            {humanizeStatus(orderGroup.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                            onClick={() => void fetchOrderGroupById(orderGroup.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {paginatedOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          {error || "No seller orders match your filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filteredOrders.length}{" "}
                    seller order groups)
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                    ))}
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
            </>
          )}
        </Card>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Seller Groups", value: orderGroups.length, color: "text-primary" },
          { label: "Delivered", value: orderGroups.filter((group) => group.status === "DELIVERED").length, color: "text-green-600" },
          { label: "Shipped", value: orderGroups.filter((group) => group.status === "SHIPPED").length, color: "text-blue-600" },
          { label: "Pending", value: orderGroups.filter((group) => group.status === "PENDING").length, color: "text-yellow-600" },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} mt-2`}>
                {stat.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {selectedOrderGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                Seller Order Group Details
              </h2>
              <button
                onClick={clearSelectedOrderGroup}
                className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                  <Spinner className="size-5 text-primary" />
                  <span>Loading order group details...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Order Group ID</p>
                      <p className="font-semibold text-foreground">{selectedOrderGroup.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Parent Order</p>
                      <p className="font-semibold text-foreground">{selectedOrderGroup.parentOrderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold text-foreground">{humanizeStatus(selectedOrderGroup.status)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="font-semibold text-foreground">
                        {selectedOrderGroup.createdAt ? formatDate(selectedOrderGroup.createdAt) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Product Subtotal</p>
                      <p className="font-semibold text-foreground">{formatCurrency(selectedOrderGroup.productSubtotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Shipping Fee</p>
                      <p className="font-semibold text-foreground">{formatCurrency(selectedOrderGroup.shippingFee)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Discount Total</p>
                      <p className="font-semibold text-foreground">{formatCurrency(selectedOrderGroup.discountTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Group Total</p>
                      <p className="font-semibold text-primary">{formatCurrency(selectedOrderGroup.groupTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Assigned Logistics</p>
                      <p className="font-semibold text-foreground">
                        {selectedOrderGroup.logisticsCompany?.companyName || "Not assigned yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Delivery Region</p>
                      <p className="font-semibold text-foreground">
                        {selectedOrderGroup.deliveryRegion || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">Delivery Address</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrderGroup.parentOrder.addressSnapshot?.addressLine || "No address recorded"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        selectedOrderGroup.parentOrder.addressSnapshot?.city,
                        selectedOrderGroup.parentOrder.addressSnapshot?.state,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Delivery Timeline</p>
                    {selectedOrderGroup.statusHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedOrderGroup.statusHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg bg-muted/30 p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-medium text-foreground">
                                  {humanizeStatus(entry.status)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(entry.updatedByUser?.fullName || "System")}{" "}
                                  {entry.updatedByRole
                                    ? `(${humanizeStatus(entry.updatedByRole)})`
                                    : ""}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatTimelineDate(entry.createdAt)}
                              </p>
                            </div>
                            {entry.description ? (
                              <p className="mt-2 text-sm text-foreground">{entry.description}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No delivery timeline updates recorded yet.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Items</p>
                    <div className="space-y-3">
                      {selectedOrderGroup.items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-foreground">{item.productTitleSnapshot}</p>
                              {item.variantTitleSnapshot && (
                                <p className="text-sm text-muted-foreground">{item.variantTitleSnapshot}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} {item.salesUnitSnapshot || "units"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">{formatCurrency(item.lineTotal)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.unitPriceSnapshot)} each
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      onClick={clearSelectedOrderGroup}
                    >
                      Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
