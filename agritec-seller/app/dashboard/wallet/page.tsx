"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Landmark,
  Send,
  TrendingUp,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/formatting";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import {
  type SellerPayoutRecord,
  type SellerWalletTransactionRecord,
  useSellerWalletStore,
} from "@/stores/seller-wallet-store";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const TRANSACTIONS_PER_PAGE = 10;
const PAYOUTS_PER_PAGE = 10;

type TabType = "transactions" | "payouts";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatTransactionType(type: string) {
  switch (type) {
    case "ORDER_PENDING_CREDIT":
      return "Pending credit";
    case "ORDER_AVAILABLE_RELEASE":
      return "Released earnings";
    case "PAYOUT_REQUESTED":
      return "Payout requested";
    case "PAYOUT_COMPLETED":
      return "Payout completed";
    case "PAYOUT_FAILED_RESTORE":
      return "Payout restored";
    case "REFUND_DEBIT":
      return "Refund debit";
    case "REFUND_RESTORE":
      return "Refund restore";
    case "MANUAL_ADJUSTMENT":
      return "Manual adjustment";
    default:
      return type.replace(/_/g, " ").toLowerCase();
  }
}

function transactionBadgeClass(type: string) {
  switch (type) {
    case "ORDER_PENDING_CREDIT":
    case "ORDER_AVAILABLE_RELEASE":
      return "bg-emerald-100 text-emerald-800";
    case "PAYOUT_REQUESTED":
    case "PAYOUT_COMPLETED":
      return "bg-blue-100 text-blue-800";
    case "REFUND_DEBIT":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function payoutBadgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800";
    case "PROCESSING":
    case "APPROVED":
      return "bg-blue-100 text-blue-800";
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-red-100 text-red-800";
  }
}

function downloadTransactionsAsExcel(transactions: SellerWalletTransactionRecord[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    transactions.map((transaction) => ({
      "Transaction ID": transaction.id,
      Type: formatTransactionType(transaction.type),
      Description: transaction.description,
      Amount: transaction.amount,
      Date: formatDate(transaction.createdAt),
    })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, "seller-wallet-transactions.xlsx");
}

function downloadPayoutsAsExcel(payouts: SellerPayoutRecord[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    payouts.map((payout) => ({
      "Payout ID": payout.id,
      Amount: payout.amount,
      Status: payout.status,
      "Requested At": formatDate(payout.requestedAt),
      "Processed At": formatDate(payout.processedAt),
      Reference: payout.paystackTransferReference || payout.failureReason || "-",
    })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payouts");
  XLSX.writeFile(workbook, "seller-payout-history.xlsx");
}

export default function WalletPage() {
  const seller = useSellerAuthStore((state) => state.user?.sellerProfile ?? null);
  const {
    wallet,
    bankAccount,
    activeWithdrawal,
    canRequestPayout,
    transactions,
    payouts,
    isLoading,
    isRequestingPayout,
    error,
    fetchWalletData,
    requestPayout,
    clearError,
  } = useSellerWalletStore((state) => state);

  const [activeTab, setActiveTab] = useState<TabType>("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [currentPayoutPage, setCurrentPayoutPage] = useState(1);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    clearError();
  }, [clearError, error]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      return (
        transaction.id.toLowerCase().includes(query) ||
        transaction.description.toLowerCase().includes(query) ||
        formatTransactionType(transaction.type).toLowerCase().includes(query)
      );
    });
  }, [searchQuery, transactions]);

  const totalTransactionPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE),
  );
  const totalPayoutPages = Math.max(1, Math.ceil(payouts.length / PAYOUTS_PER_PAGE));

  const paginatedTransactions = filteredTransactions.slice(
    (currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE,
    currentTransactionPage * TRANSACTIONS_PER_PAGE,
  );
  const paginatedPayouts = payouts.slice(
    (currentPayoutPage - 1) * PAYOUTS_PER_PAGE,
    currentPayoutPage * PAYOUTS_PER_PAGE,
  );

  async function handleRequestPayout() {
    try {
      const payout = await requestPayout();
      toast.success(`Payout request submitted for ${formatCurrency(payout.amount)}.`);
      setShowWithdrawModal(false);
      setActiveTab("payouts");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to request payout";
      toast.error(message);
    }
  }

  if (isLoading && !wallet) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Spinner className="size-5" />
          <span>Loading wallet data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-8"
      >
        <div>
          <h1 className="mb-2 block text-4xl font-bold text-foreground md:hidden">
            Wallet & Payouts
          </h1>
          <p className="text-muted-foreground">
            Manage earnings and payouts for {seller?.farmName ?? "your farm"}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Available Balance",
              amount: wallet?.availableBalance ?? 0,
              icon: Wallet,
              tone: "bg-emerald-50 border-emerald-200 text-emerald-700",
            },
            {
              title: "Pending Balance",
              amount: wallet?.pendingBalance ?? 0,
              icon: Clock3,
              tone: "bg-amber-50 border-amber-200 text-amber-700",
            },
            {
              title: "Processing Balance",
              amount: wallet?.processingBalance ?? 0,
              icon: TrendingUp,
              tone: "bg-blue-50 border-blue-200 text-blue-700",
            },
            {
              title: "Total Earnings",
              amount: wallet?.totalEarnings ?? 0,
              icon: CheckCircle2,
              tone: "bg-purple-50 border-purple-200 text-purple-700",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className={`border-2 p-6 ${card.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-primary-foreground">
                      {formatCurrency(card.amount)}
                    </p>
                  </div>
                  <Icon className="size-8 opacity-80" />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Banking status
                </h2>
                <p className="text-sm text-muted-foreground">
                  Payouts require a verified bank account and full available balance withdrawal.
                </p>
              </div>
              <Landmark className="size-5 text-primary" />
            </div>

            {bankAccount ? (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-medium text-foreground">{bankAccount.bankName}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      bankAccount.isVerified
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {bankAccount.isVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
                <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-foreground">Account:</span>{" "}
                    {bankAccount.accountNumber}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Name:</span>{" "}
                    {bankAccount.accountName}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No bank account saved yet. Add one from Settings before requesting payouts.
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Current payout state
                </h2>
                <p className="text-sm text-muted-foreground">
                  Only one payout can be processing at a time.
                </p>
              </div>
              <AlertCircle className="size-5 text-primary" />
            </div>

            {activeWithdrawal ? (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">{activeWithdrawal.id}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${payoutBadgeClass(activeWithdrawal.status)}`}>
                    {activeWithdrawal.status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(activeWithdrawal.amount)}
                </p>
                <p className="text-muted-foreground">
                  Requested {formatDate(activeWithdrawal.requestedAt)}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No active payout request.
              </div>
            )}

            <Button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!canRequestPayout || isRequestingPayout}
              className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRequestingPayout ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Requesting payout...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Request full available balance
                </>
              )}
            </Button>
          </Card>
        </div>

        <motion.div variants={itemVariants} className="flex gap-2 border-b border-border">
          {[
            { id: "transactions", label: "Transactions" },
            { id: "payouts", label: "Payout history" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setCurrentTransactionPage(1);
                setCurrentPayoutPage(1);
              }}
              className={`border-b-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {activeTab === "transactions" ? (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentTransactionPage(1);
                }}
                placeholder="Search transactions"
                className="max-w-md"
              />
              <Button
                variant="outline"
                onClick={() => downloadTransactionsAsExcel(filteredTransactions)}
                disabled={filteredTransactions.length === 0}
              >
                <Download className="mr-2 size-4" />
                Download statement
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-190">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Description</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-secondary/30">
                          <td className="px-6 py-4 text-sm font-mono text-foreground">{transaction.id}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transactionBadgeClass(transaction.type)}`}>
                              {formatTransactionType(transaction.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">{transaction.description}</td>
                          <td className={`px-6 py-4 text-right text-sm font-semibold ${transaction.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {transaction.amount >= 0 ? "+" : ""}
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {totalTransactionPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentTransactionPage} of {totalTransactionPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentTransactionPage === 1}
                    onClick={() => setCurrentTransactionPage((page) => page - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentTransactionPage === totalTransactionPages}
                    onClick={() => setCurrentTransactionPage((page) => page + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => downloadPayoutsAsExcel(payouts)}
                disabled={payouts.length === 0}
              >
                <Download className="mr-2 size-4" />
                Download payouts
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-195">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Payout ID</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Requested</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Processed</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedPayouts.length > 0 ? (
                      paginatedPayouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-secondary/30">
                          <td className="px-6 py-4 text-sm font-mono text-foreground">{payout.id}</td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                            {formatCurrency(payout.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${payoutBadgeClass(payout.status)}`}>
                              {payout.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(payout.requestedAt)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(payout.processedAt)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {payout.paystackTransferReference || payout.failureReason || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                          No payout history yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {totalPayoutPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPayoutPage} of {totalPayoutPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPayoutPage === 1}
                    onClick={() => setCurrentPayoutPage((page) => page - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPayoutPage === totalPayoutPages}
                    onClick={() => setCurrentPayoutPage((page) => page + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md space-y-6 p-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Request payout</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  The full available balance will move into processing after you submit this request.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Available balance</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {formatCurrency(wallet?.availableBalance ?? 0)}
                </p>
              </div>

              {!canRequestPayout && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Verify your bank account and ensure no payout is already processing before requesting payout.
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isRequestingPayout}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestPayout}
                  disabled={!canRequestPayout || isRequestingPayout}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isRequestingPayout ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Submitting...
                    </>
                  ) : (
                    "Submit request"
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
