"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SuspendAccountDialog } from "@/components/suspend-account-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  type AdminBuyerDetailRecord,
  useAdminBuyersStore,
} from "@/stores/admin-buyers-store";

function formatDate(value: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BuyersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyers = useAdminBuyersStore((state) => state.buyers);
  const selectedBuyer = useAdminBuyersStore((state) => state.selectedBuyerDetail);
  const isLoading = useAdminBuyersStore((state) => state.isLoading);
  const isDetailLoading = useAdminBuyersStore((state) => state.isDetailLoading);
  const isUpdating = useAdminBuyersStore((state) => state.isUpdating);
  const loaded = useAdminBuyersStore((state) => state.loaded);
  const fetchBuyers = useAdminBuyersStore((state) => state.fetchBuyers);
  const fetchBuyerDetail = useAdminBuyersStore((state) => state.fetchBuyerDetail);
  const clearSelectedBuyerDetail = useAdminBuyersStore((state) => state.clearSelectedBuyerDetail);
  const updateBuyer = useAdminBuyersStore((state) => state.updateBuyer);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "suspended"
  >("all");
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    buyerId?: string;
    buyerName?: string;
  }>({ open: false });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void fetchBuyers();
  }, [fetchBuyers]);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const filteredBuyers = buyers.filter((buyer) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      buyer.fullName.toLowerCase().includes(query) ||
      buyer.email.toLowerCase().includes(query) ||
      (buyer.phone || "").toLowerCase().includes(query);

    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && buyer.isActive) ||
      (filterActive === "suspended" && !buyer.isActive);

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBuyers.length / pageSize));
  const paginatedBuyers = useMemo(
    () => filteredBuyers.slice((page - 1) * pageSize, page * pageSize),
    [filteredBuyers, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterActive, buyers.length]);

  const openBuyerDetails = async (buyerId: string) => {
    try {
      await fetchBuyerDetail(buyerId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load buyer details",
      );
    }
  };

  const handleSuspendBuyer = async () => {
    if (!suspendDialog.buyerId) return;

    try {
      await updateBuyer(suspendDialog.buyerId, { isActive: false });
      toast.success(
        `${suspendDialog.buyerName} account suspended successfully`,
      );
      setSuspendDialog({ open: false });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to suspend buyer",
      );
    }
  };

  const handleActivateBuyer = async (buyerId: string, buyerName: string) => {
    try {
      await updateBuyer(buyerId, { isActive: true });
      toast.success(`${buyerName} account reactivated successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reactivate buyer",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">
            Manage registered buyers on the platform
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by buyer, email, or phone..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === "all" ? "default" : "outline"}
                onClick={() => setFilterActive("all")}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                All
              </Button>
              <Button
                variant={filterActive === "active" ? "default" : "outline"}
                onClick={() => setFilterActive("active")}
              >
                Active
              </Button>
              <Button
                variant={filterActive === "suspended" ? "default" : "outline"}
                onClick={() => setFilterActive("suspended")}
              >
                Suspended
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Registered Buyers ({filteredBuyers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50">
                <tr className="font-medium text-muted-foreground">
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-left">Addresses</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-right">Wishlist</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBuyers.length > 0 ? (
                  paginatedBuyers.map((buyer) => (
                    <tr
                      key={buyer.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {buyer.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {buyer.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {buyer.addressCount > 0
                          ? `${buyer.addressCount} saved address${buyer.addressCount === 1 ? "" : "es"}`
                          : "No saved addresses"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs text-foreground">
                            {buyer.phone || "No phone"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {buyer.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {buyer.wishlistCount}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">
                        {buyer.orderCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={buyer.isActive ? "default" : "secondary"}
                        >
                          {buyer.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => void openBuyerDetails(buyer.id)}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/messages?participantType=buyer&participantId=${buyer.id}`,
                                )
                              }
                            >
                              Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/orders?search=${encodeURIComponent(buyer.fullName)}`,
                                )
                              }
                            >
                              View Orders
                            </DropdownMenuItem>
                            {buyer.isActive ? (
                              <DropdownMenuItem
                                className="text-yellow-600"
                                onClick={() =>
                                  setSuspendDialog({
                                    open: true,
                                    buyerId: buyer.id,
                                    buyerName: buyer.fullName,
                                  })
                                }
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  void handleActivateBuyer(
                                    buyer.id,
                                    buyer.fullName,
                                  )
                                }
                              >
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : isLoading && !loaded ? (
                  <tr>
                    <td colSpan={7} className="py-10">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Spinner className="size-4" />
                        <span>Loading buyers...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No buyers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredBuyers.length > pageSize ? (
            <div className="flex items-center justify-between border-t border-border/30 pt-4">
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
        open={!!selectedBuyer}
        onOpenChange={(open) => !open && clearSelectedBuyerDetail()}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBuyer?.fullName || "Buyer Details"}</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading buyer details...</span>
            </div>
          ) : selectedBuyer ? (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Orders</p>
                  <p className="font-semibold">{selectedBuyer.orderCount}</p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Wishlist Items</p>
                  <p className="font-semibold">{selectedBuyer.wishlistCount}</p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(selectedBuyer.createdAt)}</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium">{selectedBuyer.phone || "No phone"}</p>
                <p>{selectedBuyer.email}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Saved Addresses</p>
                  <p className="font-semibold">{selectedBuyer.addressCount}</p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Cart Items</p>
                  <p className="font-semibold">{selectedBuyer.cartItemCount}</p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-3 text-muted-foreground">Addresses</p>
                <div className="space-y-3">
                  {selectedBuyer.addresses.length > 0 ? (
                    selectedBuyer.addresses.map((address) => (
                      <div key={address.id} className="rounded-md border border-border/40 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {address.displayName || "Saved address"}
                          </p>
                          {address.isDefault ? <Badge variant="default">Default</Badge> : null}
                          {address.isManualAddress || address.isAdminAssisted ? (
                            <Badge variant="secondary">Manual</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-foreground">{address.fullAddress}</p>
                        {address.landmark ? (
                          <p className="text-muted-foreground">Landmark: {address.landmark}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          Added {formatDateTime(address.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No saved addresses</p>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-3 text-muted-foreground">Recent Orders</p>
                <div className="space-y-3">
                  {selectedBuyer.recentOrders.length > 0 ? (
                    selectedBuyer.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between gap-4 rounded-md border border-border/40 p-3">
                        <div>
                          <p className="font-medium text-foreground">Order #{order.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{formatCurrency(order.grandTotal)}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.status} / {order.paymentStatus}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No recent orders</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SuspendAccountDialog
        open={suspendDialog.open}
        onOpenChange={(open) => setSuspendDialog({ open })}
        accountName={suspendDialog.buyerName || ""}
        accountType="buyer"
        onConfirm={() => void handleSuspendBuyer()}
        isLoading={isUpdating}
      />
    </div>
  );
}
