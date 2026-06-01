"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { payouts as initialPayouts } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Payout {
  id: string;
  farmerId: string;
  farmerName: string;
  amount: number;
  status: "pending" | "in_progress" | "completed";
  date: string;
  method: string;
}

export default function PayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "completed" | "in_progress"
  >("all");

  // Dialog states
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    payoutId?: string;
    farmerName?: string;
    farmerId?: string;
    amount?: number;
    status?: string;
  }>({ open: false });
  const [detailPayout, setDetailPayout] = useState<Payout | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch =
      payout.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || payout.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalAmount = filteredPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / pageSize));
  const paginatedPayouts = useMemo(
    () => filteredPayouts.slice((page - 1) * pageSize, page * pageSize),
    [filteredPayouts, page],
  );
  const completedAmount = filteredPayouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = filteredPayouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleApprovePayout = () => {
    if (approveDialog.payoutId) {
      setPayouts(
        payouts.map((p) =>
          p.id === approveDialog.payoutId
            ? { ...p, status: "in_progress" }
            : p,
        ),
      );
      toast.success(
        `Paystack transfer initiated for ${approveDialog.farmerName}`,
      );
      setApproveDialog({ open: false });
    }
  };

  const downloadReceipt = (payout: Payout) => {
    const receiptWindow = window.open("", "_blank");
    if (!receiptWindow) return;
    receiptWindow.document.write(`
      <html><head><title>${payout.id} Receipt</title></head>
      <body style="font-family: Arial; padding: 32px;">
        <h1>AgriTec Payout Receipt</h1>
        <table style="width:100%; border-collapse: collapse;">
          ${[
            ["Paystack Reference", `TRF_${payout.id}_NG`],
            ["Transfer Code", `TRF-${payout.farmerId.padStart(4, "0")}`],
            ["Recipient", payout.farmerName],
            ["Amount", `NGN ${payout.amount.toLocaleString()}`],
            ["Status", payout.status],
            ["Method", payout.method],
            ["Date", payout.date],
          ].map(([label, value]) => `<tr><td style="border:1px solid #ddd;padding:8px;font-weight:bold">${label}</td><td style="border:1px solid #ddd;padding:8px">${value}</td></tr>`).join("")}
        </table>
      </body></html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
    toast.success(`Receipt generated for ${payout.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1">
            Manage seller disbursements and payments
          </p>
        </div>
        <Button variant="outline" className="w-full md:w-auto gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Payouts</p>
            <p className="text-3xl font-bold text-foreground">
              ₦{(totalAmount / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredPayouts.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              ₦{(completedAmount / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {payouts.filter((p) => p.status === "completed").length} success
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              ₦{(pendingAmount / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {payouts.filter((p) => p.status === "pending").length} awaiting
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">
              {payouts.filter((p) => p.status === "in_progress").length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Being processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by seller name or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/50"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                All
              </Button>
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                onClick={() => setFilterStatus("pending")}
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "in_progress" ? "default" : "outline"}
                onClick={() => setFilterStatus("in_progress")}
              >
                In Progress
              </Button>
              <Button
                variant={filterStatus === "completed" ? "default" : "outline"}
                onClick={() => setFilterStatus("completed")}
              >
                Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card className="border-border/50 overflow-hidden">
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
                    Method
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
                {paginatedPayouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono font-semibold text-foreground text-sm">
                        {payout.id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {payout.farmerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <p className="font-medium text-foreground text-sm">
                          {payout.farmerName}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground text-sm">
                        {payout.amount > 0
                          ? `₦${(payout.amount / 1000000).toFixed(1)}M`
                          : "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {payout.method}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={getStatusColor(payout.status)}
                      >
                        {payout.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {payout.date}
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
                          <DropdownMenuItem onClick={() => setDetailPayout(payout)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadReceipt(payout)}>Download Receipt</DropdownMenuItem>
                          {payout.status === "pending" && (
                            <DropdownMenuItem
                              onClick={() =>
                                setApproveDialog({
                                  open: true,
                                  payoutId: payout.id,
                                  farmerName: payout.farmerName,
                                  farmerId: payout.farmerId,
                                  amount: payout.amount,
                                  status: payout.status,
                                })
                              }
                            >
                              Approve Payout
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/sellers?search=${encodeURIComponent(payout.farmerName)}`)}
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

          {filteredPayouts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No payouts found</p>
            </div>
          )}
          {filteredPayouts.length > pageSize && (
            <div className="flex items-center justify-between border-t border-border/30 py-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailPayout} onOpenChange={(open) => !open && setDetailPayout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout Receipt</DialogTitle>
          </DialogHeader>
          {detailPayout && (
            <div className="space-y-3 rounded-md border border-border/50 p-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <p className="font-semibold">AgriTec Payout</p>
                  <p className="text-sm text-muted-foreground">{detailPayout.id}</p>
                </div>
                <Badge variant="outline" className={getStatusColor(detailPayout.status)}>
                  {detailPayout.status.replace("_", " ")}
                </Badge>
              </div>
              {[
                ["Paystack Reference", `TRF_${detailPayout.id}_NG`],
                ["Transfer Code", `TRF-${detailPayout.farmerId.padStart(4, "0")}`],
                ["Recipient", detailPayout.farmerName],
                ["Amount", `NGN ${detailPayout.amount.toLocaleString()}`],
                ["Method", detailPayout.method],
                ["Date", detailPayout.date],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            {detailPayout && (
              <Button onClick={() => downloadReceipt(detailPayout)} className="gap-2">
                <Download className="h-4 w-4" />
                Download Receipt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Pending Payout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will initiate an automatic Paystack transfer for {approveDialog.farmerName} and move the payout to in progress until Paystack confirms completion.
          </p>
          <div className="rounded-md border border-border/50 p-3 text-sm">
            <p className="font-medium">{approveDialog.payoutId}</p>
            <p>NGN {(approveDialog.amount || 0).toLocaleString()}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false })}>Cancel</Button>
            <Button onClick={handleApprovePayout}>Approve and Initiate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
