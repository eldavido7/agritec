"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AdminAssistedOrderDialog } from "@/components/admin-assisted-order-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";

const pageSize = 10;
const statusOptions = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

type FilterStatus = "all" | (typeof statusOptions)[number];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-green-100 text-green-700";
    case "SHIPPED":
      return "bg-blue-100 text-blue-700";
    case "CONFIRMED":
    case "PROCESSING":
      return "bg-sky-100 text-sky-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "CANCELLED":
    case "REFUNDED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function buildStatusSummary(statuses: string[]) {
  const unique = Array.from(new Set(statuses));
  if (unique.length === 1) return unique[0];
  if (unique.includes("SHIPPED") || unique.includes("PROCESSING") || unique.includes("CONFIRMED")) {
    return "MIXED";
  }
  return "PENDING";
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orders = useAdminOrdersStore((state) => state.orders);
  const selectedOrderDetail = useAdminOrdersStore((state) => state.selectedOrderDetail);
  const isLoading = useAdminOrdersStore((state) => state.isLoading);
  const isDetailLoading = useAdminOrdersStore((state) => state.isDetailLoading);
  const loaded = useAdminOrdersStore((state) => state.loaded);
  const fetchOrders = useAdminOrdersStore((state) => state.fetchOrders);
  const fetchOrderDetail = useAdminOrdersStore((state) => state.fetchOrderDetail);
  const clearSelectedOrderDetail = useAdminOrdersStore((state) => state.clearSelectedOrderDetail);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [page, setPage] = useState(1);
  const [assistedOrderOpen, setAssistedOrderOpen] = useState(false);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const search = searchTerm.toLowerCase();
        const sellerNames = order.sellerGroups.map((group) => group.sellerNameSnapshot).join(" ").toLowerCase();
        const itemSummary = order.sellerGroups
          .flatMap((group) => group.items.map((item) => item.productTitleSnapshot))
          .join(" ")
          .toLowerCase();
        const matchesSearch =
          order.id.toLowerCase().includes(search) ||
          order.buyerNameSnapshot.toLowerCase().includes(search) ||
          sellerNames.includes(search) ||
          itemSummary.includes(search);
        const matchesFilter =
          filterStatus === "all" ||
          order.sellerGroups.some((group) => group.status === filterStatus);
        return matchesSearch && matchesFilter;
      }),
    [filterStatus, orders, searchTerm],
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, orders.length]);

  const handleOpenOrder = async (orderId: string) => {
    try {
      await fetchOrderDetail(orderId, { force: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load order details",
      );
    }
  };

  const completedGroups = orders.reduce(
    (sum, order) => sum + order.sellerGroups.filter((group) => group.status === "DELIVERED").length,
    0,
  );
  const pendingGroups = orders.reduce(
    (sum, order) => sum + order.sellerGroups.filter((group) => group.status === "PENDING").length,
    0,
  );
  const inTransitGroups = orders.reduce(
    (sum, order) =>
      sum +
      order.sellerGroups.filter((group) => ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(group.status)).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">
            Manage parent marketplace orders and seller fulfillment groups
          </p>
        </div>
        <Button onClick={() => setAssistedOrderOpen(true)}>
          Create Assisted Order
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Parent Orders</p>
            <p className="text-3xl font-bold text-foreground">
              {orders.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">
              Completed Groups
            </p>
            <p className="text-3xl font-bold text-green-600">
              {completedGroups}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">
              In Transit Groups
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {inTransitGroups}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Pending Groups</p>
            <p className="text-3xl font-bold text-yellow-600">
              {pendingGroups}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by parent order, item, buyer, or seller..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="gap-2 dark:hover:text-white dark:hover:bg-secondary/50"
              >
                <Filter className="w-4 h-4" />
                All
              </Button>
              <Button
                variant={filterStatus === "PENDING" ? "default" : "outline"}
                onClick={() => setFilterStatus("PENDING")}
                className="gap-2 dark:hover:text-white dark:hover:bg-secondary/50"
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "SHIPPED" ? "default" : "outline"}
                onClick={() => setFilterStatus("SHIPPED")}
                className="gap-2 dark:hover:text-white dark:hover:bg-secondary/50"
              >
                Shipped
              </Button>
              <Button
                variant={filterStatus === "DELIVERED" ? "default" : "outline"}
                onClick={() => setFilterStatus("DELIVERED")}
                className="gap-2 dark:hover:text-white dark:hover:bg-secondary/50"
              >
                Delivered
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>Marketplace Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Seller Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Product Subtotal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Shipping
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Grand Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const statusSummary = buildStatusSummary(
                    order.sellerGroups.map((group) => group.status),
                  );
                  const firstItems = order.sellerGroups.flatMap((group) =>
                    group.items.map((item) => item.productTitleSnapshot),
                  );
                  const itemSummary =
                    firstItems.slice(0, 2).join(", ") +
                    (firstItems.length > 2
                      ? ` +${firstItems.length - 2} more`
                      : "");
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border/30 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {order.id}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {order.buyerNameSnapshot}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {order.sellerGroups.length} seller
                        {order.sellerGroups.length > 1 ? "s" : ""}
                      </td>
                      <td className="max-w-[16rem] wrap-break-word px-6 py-4 text-sm text-foreground">
                        {itemSummary}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatCurrency(order.productSubtotal)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatCurrency(order.totalShippingFee)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(order.grandTotal)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={getStatusColor(
                            statusSummary === "MIXED"
                              ? "SHIPPED"
                              : statusSummary,
                          )}
                        >
                          {statusSummary === "MIXED"
                            ? "Mixed"
                            : statusSummary.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => void handleOpenOrder(order.id)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {order.sellerGroups.map((group) => (
                              <DropdownMenuItem
                                key={group.id}
                                onClick={() =>
                                  router.push(
                                    `/dashboard/messages?participantType=seller&participantId=${group.sellerId}`,
                                  )
                                }
                              >
                                Contact {group.sellerNameSnapshot}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/messages?participantType=buyer&participantId=${order.buyerId}`,
                                )
                              }
                            >
                              Contact Buyer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && isLoading && !loaded ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading orders...</span>
            </div>
          ) : null}
          {filteredOrders.length === 0 && (!isLoading || loaded) ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : null}
          {filteredOrders.length > pageSize ? (
            <div className="flex items-center justify-between border-t border-border/30 py-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedOrderDetail}
        onOpenChange={(open) => !open && clearSelectedOrderDetail()}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOrderDetail
                ? `Order ${selectedOrderDetail.id}`
                : "Order Details"}
            </DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading order details...</span>
            </div>
          ) : selectedOrderDetail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Buyer</p>
                  <p className="font-semibold">
                    {selectedOrderDetail.buyerNameSnapshot}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-semibold">
                    {selectedOrderDetail.paymentStatus}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Grand Total</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedOrderDetail.grandTotal)}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-semibold">
                    {formatDate(selectedOrderDetail.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-muted-foreground">Delivery Address</p>
                <p className="font-medium">
                  {selectedOrderDetail.addressSnapshot?.fullAddress ||
                    "No address snapshot"}
                </p>
                {selectedOrderDetail.addressSnapshot?.landmark ? (
                  <p>
                    Landmark: {selectedOrderDetail.addressSnapshot.landmark}
                  </p>
                ) : null}
              </div>

              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-muted-foreground">Seller Groups</p>
                <div className="space-y-3">
                  {selectedOrderDetail.sellerGroups.map((group) => {
                    return (
                      <div
                        key={group.id}
                        className="rounded-md border border-border/40 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              {group.farmNameSnapshot}
                            </p>
                            <p className="text-muted-foreground">
                              {group.sellerNameSnapshot}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {group.deliveryRegion} .{" "}
                              {group.totalChargeableWeightKg?.toFixed?.(1) ??
                                "0.0"}
                              kg chargeable . {group.shippingUnits} unit(s)
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <Badge
                              variant="outline"
                              className={getStatusColor(group.status)}
                            >
                              {group.status.replaceAll("_", " ")}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Delivery progression is logistics-managed. Admin
                              remains view-only here.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-md bg-muted/40 p-3">
                            <p className="text-muted-foreground">Products</p>
                            <p className="font-semibold">
                              {formatCurrency(group.productSubtotal)}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-3">
                            <p className="text-muted-foreground">Shipping</p>
                            <p className="font-semibold">
                              {formatCurrency(group.shippingFee)}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-3">
                            <p className="text-muted-foreground">Group Total</p>
                            <p className="font-semibold">
                              {formatCurrency(group.groupTotal)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Assigned logistics</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {group.logisticsCompanyNameSnapshot ||
                                "Not assigned"}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Shipping source</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {(group.shippingPricedBy || "Unknown").replaceAll(
                                "_",
                                " ",
                              )}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Status events</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {group.statusHistory.length}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Weight Unit Size</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {group.weightUnitSizeKg?.toFixed?.(1) ?? "0.0"}kg
                            </p>
                          </div>
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Minimum Fee</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {formatCurrency(group.minimumFee)}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Additional Unit Fee</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {formatCurrency(group.additionalUnitFee)}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/50 p-3">
                            <p>Chargeable Weight</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {group.totalChargeableWeightKg?.toFixed?.(1) ??
                                "0.0"}
                              kg
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 rounded-md border border-border/50 p-3">
                          <p className="mb-3 text-muted-foreground">
                            Delivery timeline
                          </p>
                          {group.statusHistory.length > 0 ? (
                            <div className="space-y-3">
                              {group.statusHistory.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="rounded-md border border-border/30 p-3"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="font-medium text-foreground">
                                        {entry.status.replaceAll("_", " ")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {entry.updatedByUser?.fullName ||
                                          "System"}{" "}
                                        {entry.updatedByRole
                                          ? `(${entry.updatedByRole.replaceAll("_", " ")})`
                                          : ""}
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(entry.createdAt)}
                                    </p>
                                  </div>
                                  {entry.description ? (
                                    <p className="mt-2 text-sm text-foreground">
                                      {entry.description}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">
                              No status history recorded yet.
                            </p>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-4 rounded-md border border-border/30 p-3"
                            >
                              <div>
                                <p className="font-medium text-foreground">
                                  {item.productTitleSnapshot}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.variantTitleSnapshot ||
                                    item.salesUnitSnapshot}{" "}
                                  . Qty {item.quantity}
                                </p>
                              </div>
                              <p className="font-semibold text-foreground">
                                {formatCurrency(item.lineTotal)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminAssistedOrderDialog
        open={assistedOrderOpen}
        onOpenChange={setAssistedOrderOpen}
        onCreated={({ orderId, paymentUrl, paymentReference }) => {
          void fetchOrders({ force: true });
          void handleOpenOrder(orderId);
          toast.success(
            paymentUrl
              ? `Payment initialized. Reference: ${paymentReference}`
              : `Order created. Reference: ${paymentReference}`,
          );
        }}
      />
    </div>
  );
}
