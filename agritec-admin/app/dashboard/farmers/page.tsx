"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { farmers as initialFarmers, listings, orders } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SuspendAccountDialog } from "@/components/suspend-account-dialog";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FarmersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [farmers, setFarmers] = useState(initialFarmers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "suspended"
  >("all");

  // Dialog states
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    farmerId?: string;
    farmerName?: string;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    farmerId?: string;
    farmerName?: string;
  }>({ open: false });
  const [selectedFarmer, setSelectedFarmer] = useState<
    (typeof farmers)[number] | null
  >(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch =
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.location.toLowerCase().includes(searchTerm.toLowerCase());

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
  }, [searchTerm, filterActive]);

  const handleSuspendFarmer = () => {
    if (suspendDialog.farmerId) {
      setFarmers(
        farmers.map((f) =>
          f.id === suspendDialog.farmerId ? { ...f, isActive: false } : f,
        ),
      );
      toast.success(
        `${suspendDialog.farmerName} account suspended successfully`,
      );
      setSuspendDialog({ open: false });
    }
  };

  const handleDeleteFarmer = () => {
    if (deleteDialog.farmerId) {
      setFarmers(farmers.filter((f) => f.id !== deleteDialog.farmerId));
      toast.success(`${deleteDialog.farmerName} account deleted successfully`);
      setDeleteDialog({ open: false });
    }
  };

  const handleActivateFarmer = (farmerId: string, farmerName: string) => {
    setFarmers(
      farmers.map((f) => (f.id === farmerId ? { ...f, isActive: true } : f)),
    );
    toast.success(`${farmerName} account reactivated successfully`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1">
            Manage registered sellers on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === "all" ? "default" : "outline"}
                onClick={() => setFilterActive("all")}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
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

      {/* Sellers Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Registered Sellers ({filteredFarmers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50">
                <tr className="text-muted-foreground font-medium">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Location</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-right py-3 px-4">Total Sales</th>
                  <th className="text-center py-3 px-4">Orders</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredFarmers.length > 0 ? (
                  paginatedFarmers.map((farmer) => (
                    <tr
                      key={farmer.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {farmer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {farmer.id}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {farmer.location}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-foreground text-xs">
                            {farmer.phone}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {farmer.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        ₦{(farmer.totalSales / 1000000).toFixed(1)}M
                      </td>
                      <td className="py-3 px-4 text-center text-foreground font-medium">
                        {farmer.ordersCompleted}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={farmer.isActive ? "default" : "secondary"}
                        >
                          {farmer.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
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
                                  `/dashboard/orders?search=${encodeURIComponent(farmer.name)}`,
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
                                    farmerName: farmer.name,
                                  })
                                }
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  handleActivateFarmer(farmer.id, farmer.name)
                                }
                              >
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  farmerId: farmer.id,
                                  farmerName: farmer.name,
                                })
                              }
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
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
          {filteredFarmers.length > pageSize && (
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
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedFarmer}
        onOpenChange={(open) => !open && setSelectedFarmer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFarmer?.name}</DialogTitle>
          </DialogHeader>
          {selectedFarmer && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Total Sales</p>
                  <p className="font-semibold">
                    NGN {selectedFarmer.totalSales.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Orders</p>
                  <p className="font-semibold">
                    {
                      orders.filter(
                        (order) => order.sellerId === selectedFarmer.id,
                      ).length
                    }
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Seller-owned Products</p>
                <p className="font-medium">
                  {listings
                    .filter((listing) => listing.sellerId === selectedFarmer.id)
                    .map((listing) => listing.productName)
                    .join(", ") || "No products yet"}
                </p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium">{selectedFarmer.phone}</p>
                <p>{selectedFarmer.email}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <SuspendAccountDialog
        open={suspendDialog.open}
        onOpenChange={(open) => setSuspendDialog({ open })}
        accountName={suspendDialog.farmerName || ""}
        accountType="seller"
        onConfirm={handleSuspendFarmer}
      />

      <DeleteAccountDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
        accountName={deleteDialog.farmerName || ""}
        accountType="seller"
        onConfirm={handleDeleteFarmer}
      />
    </div>
  );
}

