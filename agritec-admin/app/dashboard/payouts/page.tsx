"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Download, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  type AdminPayoutRecord,
  useAdminPayoutsStore,
} from "@/stores/admin-payouts-store";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PayoutsPage() {
  const router = useRouter();
  const payouts = useAdminPayoutsStore((state) => state.payouts);
  const isLoading = useAdminPayoutsStore((state) => state.isLoading);
  const isUpdating = useAdminPayoutsStore((state) => state.isUpdating);
  const loaded = useAdminPayoutsStore((state) => state.loaded);
  const fetchPayouts = useAdminPayoutsStore((state) => state.fetchPayouts);
  const approvePayout = useAdminPayoutsStore((state) => state.approvePayout);
  const rejectPayout = useAdminPayoutsStore((state) => state.rejectPayout);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "PENDING" | "PROCESSING" | "COMPLETED"
  >("all");
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    payoutId?: string;
    farmerName?: string;
    amount?: number;
  }>({ open: false });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    payoutId?: string;
    farmerName?: string;
    amount?: number;
  }>({ open: false });
  const [detailPayout, setDetailPayout] = useState<AdminPayoutRecord | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void fetchPayouts();
  }, [fetchPayouts]);

  const filteredPayouts = payouts.filter((payout) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      payout.sellerName.toLowerCase().includes(query) ||
      payout.farmName.toLowerCase().includes(query) ||
      payout.id.toLowerCase().includes(query) ||
      payout.accountName.toLowerCase().includes(query);

    const normalizedStatus =
      payout.status === "APPROVED" ? "PROCESSING" : payout.status;
    const matchesFilter =
      filterStatus === "all" || normalizedStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalAmount = filteredPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const completedAmount = filteredPayouts
    .filter((payout) => payout.status === "COMPLETED")
    .reduce((sum, payout) => sum + payout.amount, 0);
  const pendingAmount = filteredPayouts
    .filter((payout) => payout.status === "PENDING")
    .reduce((sum, payout) => sum + payout.amount, 0);
  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / pageSize));
  const paginatedPayouts = useMemo(
    () => filteredPayouts.slice((page - 1) * pageSize, page * pageSize),
    [filteredPayouts, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, payouts.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "APPROVED":
      case "PROCESSING":
        return "bg-blue-100 text-blue-700";
      case "FAILED":
      case "REJECTED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleApprovePayout = async () => {
    if (!approveDialog.payoutId) return;

    try {
      const payout = await approvePayout(approveDialog.payoutId);
      toast.success(
        payout.status === "COMPLETED"
          ? `Payout completed for ${approveDialog.farmerName}`
          : `Payout initiated for ${approveDialog.farmerName}`,
      );
      setApproveDialog({ open: false });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve payout",
      );
    }
  };

  const handleRejectPayout = async () => {
    if (!rejectDialog.payoutId) return;

    try {
      await rejectPayout(rejectDialog.payoutId);
      toast.success(`Payout rejected for ${rejectDialog.farmerName}`);
      setRejectDialog({ open: false });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject payout",
      );
    }
  };

  const downloadReceipt = (payout: AdminPayoutRecord) => {
    const receiptWindow = window.open("", "_blank");
    if (!receiptWindow) return;

    receiptWindow.document.write(`
      <html><head><title>${payout.id} Receipt</title></head>
      <body style="font-family: Arial; padding: 32px;">
        <h1>AgriTec Payout Receipt</h1>
        <table style="width:100%; border-collapse: collapse;">
          ${[
            ["Transfer Reference", payout.paystackTransferReference || "Pending"],
            ["Transfer Code", payout.paystackTransferCode || "Pending"],
            ["Recipient", payout.sellerName],
            ["Farm", payout.farmName],
            ["Amount", formatCurrency(payout.amount)],
            ["Status", payout.status],
            ["Bank", `${payout.bankName} - ${payout.accountNumber}`],
            ["Requested At", formatDate(payout.requestedAt)],
          ]
            .map(
              ([label, value]) =>
                `<tr><td style="border:1px solid #ddd;padding:8px;font-weight:bold">${label}</td><td style="border:1px solid #ddd;padding:8px">${value}</td></tr>`,
            )
            .join("")}
        </table>
      </body></html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
    toast.success(`Receipt generated for ${payout.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">
            Manage seller disbursements and payments
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 md:w-auto dark:hover:text-white dark:hover:bg-secondary/50"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Total Payouts</p>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(totalAmount)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {filteredPayouts.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(completedAmount)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {payouts.filter((payout) => payout.status === "COMPLETED").length}{" "}
              success
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {payouts.filter((payout) => payout.status === "PENDING").length}{" "}
              awaiting
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">
              {
                payouts.filter(
                  (payout) =>
                    payout.status === "APPROVED" ||
                    payout.status === "PROCESSING",
                ).length
              }
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Being processed
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
                placeholder="Search by seller, farm, account name, or payout ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="gap-2 text-white dark:hover:text-white dark:hover:bg-secondary/50"
              >
                <Filter className="h-4 w-4" />
                All
              </Button>
              <Button
                variant={filterStatus === "PENDING" ? "default" : "outline"}
                onClick={() => setFilterStatus("PENDING")}
                className="gap-2 text-white dark:hover:text-white dark:hover:bg-secondary/50"
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "PROCESSING" ? "default" : "outline"}
                onClick={() => setFilterStatus("PROCESSING")}
                className="gap-2 text-white dark:hover:text-white dark:hover:bg-secondary/50"
              >
                Processing
              </Button>
              <Button
                variant={filterStatus === "COMPLETED" ? "default" : "outline"}
                onClick={() => setFilterStatus("COMPLETED")}
                className="gap-2 text-white dark:hover:text-white dark:hover:bg-secondary/50"
              >
                Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle>All Payouts ({filteredPayouts.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-border/30 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {payout.id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {payout.sellerName
                            .split(" ")
                            .map((name) => name[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {payout.sellerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payout.farmName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(payout.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {payout.bankName || "Bank pending"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={getStatusColor(payout.status)}
                      >
                        {payout.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(payout.requestedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDetailPayout(payout)}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => downloadReceipt(payout)}
                          >
                            Download Receipt
                          </DropdownMenuItem>
                          {payout.status === "PENDING" ? (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  setApproveDialog({
                                    open: true,
                                    payoutId: payout.id,
                                    farmerName: payout.sellerName,
                                    amount: payout.amount,
                                  })
                                }
                              >
                                Approve Payout
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  setRejectDialog({
                                    open: true,
                                    payoutId: payout.id,
                                    farmerName: payout.sellerName,
                                    amount: payout.amount,
                                  })
                                }
                              >
                                Reject Payout
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/sellers?search=${encodeURIComponent(payout.sellerName)}`,
                              )
                            }
                          >
                            View Seller
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPayouts.length === 0 && isLoading && !loaded ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading payouts...</span>
            </div>
          ) : null}

          {filteredPayouts.length === 0 && (!isLoading || loaded) ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No payouts found</p>
            </div>
          ) : null}

          {filteredPayouts.length > pageSize ? (
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
        open={!!detailPayout}
        onOpenChange={(open) => !open && setDetailPayout(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
          </DialogHeader>
          {detailPayout ? (
            <div className="space-y-3 rounded-md border border-border/50 p-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <p className="font-semibold">AgriTec Payout</p>
                  <p className="text-sm text-muted-foreground">
                    {detailPayout.id}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(detailPayout.status)}
                >
                  {detailPayout.status.replaceAll("_", " ")}
                </Badge>
              </div>
              {[
                ["Recipient", detailPayout.sellerName],
                ["Farm", detailPayout.farmName],
                ["Amount", formatCurrency(detailPayout.amount)],
                [
                  "Bank",
                  `${detailPayout.bankName} - ${detailPayout.accountNumber}`,
                ],
                ["Account Name", detailPayout.accountName],
                [
                  "Transfer Reference",
                  detailPayout.paystackTransferReference || "Pending",
                ],
                [
                  "Transfer Code",
                  detailPayout.paystackTransferCode || "Pending",
                ],
                [
                  "Transfer Status",
                  detailPayout.paystackTransferStatus || detailPayout.status,
                ],
                ["Requested At", formatDate(detailPayout.requestedAt)],
                ["Approved By", detailPayout.approvedByAdminName || "N/A"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
              {detailPayout.failureReason ? (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {detailPayout.failureReason}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            {detailPayout ? (
              <Button
                onClick={() => downloadReceipt(detailPayout)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Receipt
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => setApproveDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Pending Payout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will initiate a Paystack transfer for{" "}
            {approveDialog.farmerName}.
          </p>
          <div className="rounded-md border border-border/50 p-3 text-sm">
            <p className="font-medium">{approveDialog.payoutId}</p>
            <p>{formatCurrency(approveDialog.amount || 0)}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ open: false })}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleApprovePayout()}
              disabled={isUpdating}
            >
              {isUpdating ? <Spinner className="mr-2 size-4" /> : null}
              Approve and Initiate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Pending Payout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will reject the payout request for {rejectDialog.farmerName}{" "}
            and return the funds to the seller&apos;s available balance.
          </p>
          <div className="rounded-md border border-border/50 p-3 text-sm">
            <p className="font-medium">{rejectDialog.payoutId}</p>
            <p>{formatCurrency(rejectDialog.amount || 0)}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false })}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRejectPayout()}
              disabled={isUpdating}
            >
              {isUpdating ? <Spinner className="mr-2 size-4" /> : null}
              Reject Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
