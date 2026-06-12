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
  type AdminSellerRecord,
  useAdminSellersStore,
} from "@/stores/admin-sellers-store";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FarmersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellers = useAdminSellersStore((state) => state.sellers);
  const isLoading = useAdminSellersStore((state) => state.isLoading);
  const isUpdating = useAdminSellersStore((state) => state.isUpdating);
  const loaded = useAdminSellersStore((state) => state.loaded);
  const fetchSellers = useAdminSellersStore((state) => state.fetchSellers);
  const updateSeller = useAdminSellersStore((state) => state.updateSeller);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "suspended"
  >("all");
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    farmerId?: string;
    farmerName?: string;
  }>({ open: false });
  const [selectedFarmer, setSelectedFarmer] = useState<AdminSellerRecord | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void fetchSellers();
  }, [fetchSellers]);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const filteredFarmers = sellers.filter((farmer) => {
    const location = [
      farmer.locationLabel,
      farmer.city,
      farmer.state,
      farmer.fullAddress,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      farmer.fullName.toLowerCase().includes(query) ||
      farmer.email.toLowerCase().includes(query) ||
      farmer.farmName.toLowerCase().includes(query) ||
      location.includes(query);

    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && farmer.isActive) ||
      (filterActive === "suspended" && !farmer.isActive);

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFarmers.length / pageSize));
  const paginatedFarmers = useMemo(
    () => filteredFarmers.slice((page - 1) * pageSize, page * pageSize),
    [filteredFarmers, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterActive, sellers.length]);

  const handleSuspendFarmer = async () => {
    if (!suspendDialog.farmerId) return;

    try {
      await updateSeller(suspendDialog.farmerId, { isActive: false });
      toast.success(
        `${suspendDialog.farmerName} account suspended successfully`,
      );
      setSuspendDialog({ open: false });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to suspend seller",
      );
    }
  };

  const handleActivateFarmer = async (farmerId: string, farmerName: string) => {
    try {
      await updateSeller(farmerId, { isActive: true });
      toast.success(`${farmerName} account reactivated successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reactivate seller",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">
            Manage registered sellers on the platform
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by seller, farm, email, or location..."
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
          <CardTitle>Registered Sellers ({filteredFarmers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50">
                <tr className="font-medium text-muted-foreground">
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-right">Earnings</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredFarmers.length > 0 ? (
                  paginatedFarmers.map((farmer) => (
                    <tr
                      key={farmer.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {farmer.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {farmer.farmName}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {farmer.locationLabel ||
                          farmer.city ||
                          farmer.state ||
                          "Location not set"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs text-foreground">
                            {farmer.phone || "No phone"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {farmer.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {formatCurrency(farmer.wallet?.totalEarnings ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">
                        {farmer.orderGroupCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={farmer.isActive ? "default" : "secondary"}
                        >
                          {farmer.isActive ? "Active" : "Suspended"}
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
                              onClick={() => setSelectedFarmer(farmer)}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/messages?participantType=seller&participantId=${farmer.id}`,
                                )
                              }
                            >
                              Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/orders?search=${encodeURIComponent(farmer.fullName)}`,
                                )
                              }
                            >
                              View Orders
                            </DropdownMenuItem>
                            {farmer.isActive ? (
                              <DropdownMenuItem
                                className="text-yellow-600"
                                onClick={() =>
                                  setSuspendDialog({
                                    open: true,
                                    farmerId: farmer.id,
                                    farmerName: farmer.fullName,
                                  })
                                }
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  void handleActivateFarmer(
                                    farmer.id,
                                    farmer.fullName,
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
                        <span>Loading sellers...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No sellers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredFarmers.length > pageSize ? (
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
        open={!!selectedFarmer}
        onOpenChange={(open) => !open && setSelectedFarmer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFarmer?.fullName}</DialogTitle>
          </DialogHeader>
          {selectedFarmer ? (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Total Earnings</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedFarmer.wallet?.totalEarnings ?? 0)}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Orders</p>
                  <p className="font-semibold">
                    {selectedFarmer.orderGroupCount}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Products</p>
                  <p className="font-semibold">{selectedFarmer.productCount}</p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Discounts</p>
                  <p className="font-semibold">
                    {selectedFarmer.discountCount}
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium">
                  {selectedFarmer.phone || "No phone"}
                </p>
                <p>{selectedFarmer.email}</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Farm</p>
                <p className="font-medium">{selectedFarmer.farmName}</p>
                <p>{selectedFarmer.fullAddress || "Address not set"}</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">
                  {formatDate(selectedFarmer.createdAt)}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SuspendAccountDialog
        open={suspendDialog.open}
        onOpenChange={(open) => setSuspendDialog({ open })}
        accountName={suspendDialog.farmerName || ""}
        accountType="seller"
        onConfirm={() => void handleSuspendFarmer()}
        isLoading={isUpdating}
      />
    </div>
  );
}
