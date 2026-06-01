"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buyers as initialBuyers, orders } from "@/lib/mock-data";
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

export default function BuyersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [buyers, setBuyers] = useState(initialBuyers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "suspended"
  >("all");

  // Dialog states
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    buyerId?: string;
    buyerName?: string;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    buyerId?: string;
    buyerName?: string;
  }>({ open: false });
  const [selectedBuyer, setSelectedBuyer] = useState<
    (typeof buyers)[number] | null
  >(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [searchParams]);

  const filteredBuyers = buyers.filter((buyer) => {
    const matchesSearch =
      buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.location.toLowerCase().includes(searchTerm.toLowerCase());

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
  }, [searchTerm, filterActive]);

  const handleSuspendBuyer = () => {
    if (suspendDialog.buyerId) {
      setBuyers(
        buyers.map((b) =>
          b.id === suspendDialog.buyerId ? { ...b, isActive: false } : b,
        ),
      );
      toast.success(
        `${suspendDialog.buyerName} account suspended successfully`,
      );
      setSuspendDialog({ open: false });
    }
  };

  const handleDeleteBuyer = () => {
    if (deleteDialog.buyerId) {
      setBuyers(buyers.filter((b) => b.id !== deleteDialog.buyerId));
      toast.success(`${deleteDialog.buyerName} account deleted successfully`);
      setDeleteDialog({ open: false });
    }
  };

  const handleActivateBuyer = (buyerId: string, buyerName: string) => {
    setBuyers(
      buyers.map((b) => (b.id === buyerId ? { ...b, isActive: true } : b)),
    );
    toast.success(`${buyerName} account reactivated successfully`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1">
            Manage registered buyers on the platform
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

      {/* Buyers Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Registered Buyers ({filteredBuyers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50">
                <tr className="text-muted-foreground font-medium">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Location</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-right py-3 px-4">Total Purchases</th>
                  <th className="text-center py-3 px-4">Orders</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBuyers.length > 0 ? (
                  paginatedBuyers.map((buyer) => (
                    <tr
                      key={buyer.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {buyer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {buyer.id}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {buyer.location}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-foreground text-xs">
                            {buyer.phone}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {buyer.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        ₦{(buyer.totalPurchases / 1000000).toFixed(1)}M
                      </td>
                      <td className="py-3 px-4 text-center text-foreground font-medium">
                        {buyer.orderCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={buyer.isActive ? "default" : "secondary"}
                        >
                          {buyer.isActive ? "Active" : "Suspended"}
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
                              onClick={() => setSelectedBuyer(buyer)}
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
                                  `/dashboard/orders?search=${encodeURIComponent(buyer.name)}`,
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
                                    buyerName: buyer.name,
                                  })
                                }
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  handleActivateBuyer(buyer.id, buyer.name)
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
                                  buyerId: buyer.id,
                                  buyerName: buyer.name,
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
                      No buyers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredBuyers.length > pageSize && (
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
        open={!!selectedBuyer}
        onOpenChange={(open) => !open && setSelectedBuyer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBuyer?.name}</DialogTitle>
          </DialogHeader>
          {selectedBuyer && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Total Purchases</p>
                  <p className="font-semibold">
                    NGN {selectedBuyer.totalPurchases.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-muted-foreground">Orders</p>
                  <p className="font-semibold">
                    {
                      orders.filter(
                        (order) => order.buyerId === selectedBuyer.id,
                      ).length
                    }
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{selectedBuyer.joinDate}</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium">{selectedBuyer.phone}</p>
                <p>{selectedBuyer.email}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <SuspendAccountDialog
        open={suspendDialog.open}
        onOpenChange={(open) => setSuspendDialog({ open })}
        accountName={suspendDialog.buyerName || ""}
        accountType="buyer"
        onConfirm={handleSuspendBuyer}
      />

      <DeleteAccountDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
        accountName={deleteDialog.buyerName || ""}
        accountType="buyer"
        onConfirm={handleDeleteBuyer}
      />
    </div>
  );
}
