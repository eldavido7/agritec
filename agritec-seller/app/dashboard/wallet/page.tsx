"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getSellerMockData, mockPayouts, mockTransactions } from "@/lib/mock-data";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
  X as XIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatting";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const TRANSACTIONS_PER_PAGE = 10;
const PAYOUTS_PER_PAGE = 5;

type TabType = "transactions" | "payouts";

type Transaction = (typeof mockTransactions)[0];
type Payout = (typeof mockPayouts)[0];

interface WithdrawalForm {
  amount: number;
  description: string;
}

export default function WalletPage() {
  const seller = getSellerMockData();
  const sellerWallet = seller.wallet;
  const sellerTransactions = seller.transactions;
  const sellerPayouts = seller.payouts;
  const [activeTab, setActiveTab] = useState<TabType>("transactions");
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [currentPayoutPage, setCurrentPayoutPage] = useState(1);
  const [withdrawalModal, setWithdrawalModal] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const payoutReceiptRef = useRef<HTMLDivElement>(null);

  // Filter transactions
  const filteredTransactions = sellerTransactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      transactionFilter === "All" || tx.type === transactionFilter;
    return matchesSearch && matchesFilter;
  });

  const totalTransactionPages = Math.ceil(
    filteredTransactions.length / TRANSACTIONS_PER_PAGE,
  );
  const paginatedTransactions = filteredTransactions.slice(
    (currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE,
    currentTransactionPage * TRANSACTIONS_PER_PAGE,
  );

  const totalPayoutPages = Math.ceil(sellerPayouts.length / PAYOUTS_PER_PAGE);
  const paginatedPayouts = sellerPayouts.slice(
    (currentPayoutPage - 1) * PAYOUTS_PER_PAGE,
    currentPayoutPage * PAYOUTS_PER_PAGE,
  );

  const handleWithdrawalSubmit = () => {
    // Simulate submission — swap with your real API call
    try {
      // await submitWithdrawalRequest();
      setWithdrawalModal(false);
      setWithdrawalStatus("success");
    } catch {
      setWithdrawalModal(false);
      setWithdrawalStatus("error");
    }
  };

 const handleDownloadReceipt = async () => {
   if (!receiptRef.current || !selectedTransaction) return;

   try {
     const dataUrl = await toPng(receiptRef.current, {
       cacheBust: true,
       pixelRatio: 2,
       backgroundColor: "#ffffff",
     });

     const pdf = new jsPDF("p", "px", "a4");

     const imgProps = pdf.getImageProperties(dataUrl);

     const pdfWidth = pdf.internal.pageSize.getWidth();

     const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

     pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);

     pdf.save(`receipt-${selectedTransaction.id}.pdf`);
   } catch (error) {
     console.error(error);
   }
 };

  const handleDownloadPayoutReceipt = async () => {
    if (!payoutReceiptRef.current || !selectedPayout) return;

    try {
      const dataUrl = await toPng(payoutReceiptRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "px", "a4");

      const imgProps = pdf.getImageProperties(dataUrl);

      const pdfWidth = pdf.internal.pageSize.getWidth();

      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);

      pdf.save(`payout-receipt-${selectedPayout.id}.pdf`);
    } catch (error) {
      console.error(error);
    }
  };

  const downloadTransactionsAsExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredTransactions.map((tx) => ({
        "Transaction ID": tx.id,
        Type: tx.type,
        Description: tx.description,
        Amount: tx.amount,
        Status: tx.status,
        Date: tx.date.toLocaleDateString(),
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, "transactions-statement.xlsx");
  };

  const downloadPayoutsAsExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sellerPayouts.map((payout) => ({
        "Payout ID": payout.id,
        Amount: payout.amount,
        Status: payout.status,
        "Request Date": payout.requestDate.toLocaleDateString(),
        "Payment Date": payout.paymentDate
          ? payout.paymentDate.toLocaleDateString()
          : "-",
        Reference: payout.transactionReference || payout.rejectionReason || "-",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payouts");
    XLSX.writeFile(workbook, "payouts-statement.xlsx");
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="block text-4xl font-bold text-foreground mb-2 md:hidden">
            Wallet & Payouts
          </h1>
          <p className="text-muted-foreground">
            Manage earnings and withdrawal requests for {seller.farmName}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Available Balance",
              amount: sellerWallet.availableBalance,
              icon: TrendingUp,
              color: "bg-emerald-50 border-emerald-200",
              iconColor: "text-emerald-600",
            },
            {
              title: "Pending Balance",
              amount: sellerWallet.pendingBalance,
              icon: Clock,
              color: "bg-amber-50 border-amber-200",
              iconColor: "text-amber-600",
            },
            {
              title: "Total Withdrawn",
              amount: sellerWallet.totalWithdrawn,
              icon: CheckCircle,
              color: "bg-blue-50 border-blue-200",
              iconColor: "text-blue-600",
            },
            {
              title: "Total Earnings",
              amount: sellerWallet.totalEarnings,
              icon: TrendingUp,
              color: "bg-purple-50 border-purple-200",
              iconColor: "text-purple-600",
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card
                key={idx}
                className={`p-6 border-2 ${card.color} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-emerald-400">
                      {formatCurrency(card.amount)}
                    </p>
                  </div>
                  <Icon className={`w-8 h-8 ${card.iconColor} opacity-80`} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Withdrawal Button */}
        <motion.div variants={itemVariants}>
          <Button
            onClick={() => setWithdrawalModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4 mr-2" />
            Request Withdrawal
          </Button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          variants={itemVariants}
          className="flex gap-2 border-b border-border"
        >
          {[
            { id: "transactions", label: "Transactions" },
            { id: "payouts", label: "Payout History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setCurrentTransactionPage(1);
                setCurrentPayoutPage(1);
              }}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Search, Filter, and Download */}
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentTransactionPage(1);
                  }}
                  className="max-w-sm"
                />
                <Button
                  variant="outline"
                  onClick={downloadTransactionsAsExcel}
                  className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Statement
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  "All",
                  "Sale Credit",
                  "Commission Deduction",
                  "Withdrawal",
                  "Refund Adjustment",
                ].map((filter) => (
                  <Button
                    key={filter}
                    variant={
                      transactionFilter === filter ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setTransactionFilter(filter);
                      setCurrentTransactionPage(1);
                    }}
                    className={
                      transactionFilter === filter
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                    }
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Transactions Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => setSelectedTransaction(tx)}
                          className="cursor-pointer hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-mono text-foreground">
                            {tx.id}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                tx.type === "Sale Credit"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : tx.type === "Commission Deduction"
                                    ? "bg-orange-100 text-orange-800"
                                    : tx.type === "Withdrawal"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td
                            className={`px-6 py-4 text-sm font-semibold text-right ${
                              tx.amount >= 0
                                ? "text-emerald-600"
                                : "text-destructive"
                            }`}
                          >
                            {tx.amount >= 0 ? "+" : ""}
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                tx.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {tx.date.toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-muted-foreground"
                        >
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalTransactionPages > 1 && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentTransactionPage} of {totalTransactionPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentTransactionPage === 1}
                      onClick={() =>
                        setCurrentTransactionPage(currentTransactionPage - 1)
                      }
                      className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        currentTransactionPage === totalTransactionPages
                      }
                      onClick={() =>
                        setCurrentTransactionPage(currentTransactionPage + 1)
                      }
                      className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={downloadPayoutsAsExcel}
                className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Statement
              </Button>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Payout ID
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Request Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Payment Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedPayouts.length > 0 ? (
                      paginatedPayouts.map((payout) => (
                        <tr
                          key={payout.id}
                          onClick={() => setSelectedPayout(payout)}
                          className="cursor-pointer hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-mono text-foreground">
                            {payout.id}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-right text-foreground">
                            {formatCurrency(payout.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                payout.status === "Paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : payout.status === "Processing"
                                    ? "bg-blue-100 text-blue-800"
                                    : payout.status === "Pending"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                              }`}
                            >
                              {payout.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {payout.requestDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {payout.paymentDate
                              ? payout.paymentDate.toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                            {payout.transactionReference ||
                              (payout.rejectionReason
                                ? `Rejected: ${payout.rejectionReason}`
                                : "-")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-muted-foreground"
                        >
                          No payouts yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPayoutPages > 1 && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPayoutPage} of {totalPayoutPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPayoutPage === 1}
                      onClick={() =>
                        setCurrentPayoutPage(currentPayoutPage - 1)
                      }
                      className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPayoutPage === totalPayoutPages}
                      onClick={() =>
                        setCurrentPayoutPage(currentPayoutPage + 1)
                      }
                      className="border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Withdrawal Modal */}
        {withdrawalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Request Withdrawal
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your full available balance will be requested for withdrawal.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Available Balance
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(sellerWallet.availableBalance)}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900 dark:text-blue-300">
                    <strong>Processing Time:</strong> Withdrawals are typically
                    processed within 2–3 business days to your registered bank
                    account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setWithdrawalModal(false)}
                  className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdrawalSubmit}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Submit Request
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Success Popup */}
        {withdrawalStatus === "success" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="w-full max-w-sm p-8 space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Request Submitted
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your withdrawal request has been sent to the admin for
                    approval. You'll be notified once it's processed.
                  </p>
                </div>
                <Button
                  onClick={() => setWithdrawalStatus("idle")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Done
                </Button>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Error Popup */}
        {withdrawalStatus === "error" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="w-full max-w-sm p-8 space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Request Failed
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Something went wrong submitting your request. Please try
                    again or contact support if the issue persists.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setWithdrawalStatus("idle")}
                    className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={() => {
                      setWithdrawalStatus("idle");
                      setWithdrawalModal(true);
                    }}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Try Again
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Transaction Detail Modal (Receipt) */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-card rounded-lg max-w-lg w-full"
            >
              <div className="p-8 bg-[#ffffff] text-[#111827]">
              <div
                ref={receiptRef}
                className="p-8 rounded-lg bg-[#ffffff] text-[#111827]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#111827]">
                      Transaction Receipt
                    </h2>
                    <p className="text-sm text-[#6b7280]">
                      ID: {selectedTransaction.id}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-[#16a34a]" />
                </div>
                <div className="space-y-4 border-t border-b border-[#e5e7eb] py-4">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Date:</span>
                    <span className="font-medium text-[#111827]">
                      {selectedTransaction.date.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Type:</span>
                    <span className="font-medium text-[#111827]">
                      {selectedTransaction.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedTransaction.status === "Completed"
                          ? "bg-[#d1fae5] text-[#065f46]"
                          : "bg-[#fef3c7] text-[#92400e]"
                      }`}
                    >
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[#6b7280]">Description:</span>
                    <span className="font-medium text-[#111827] text-right max-w-xs">
                      {selectedTransaction.description}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-6">
                  <span className="text-lg font-bold text-[#111827]">
                    Total Amount
                  </span>
                  <span
                    className={`text-2xl font-bold ${
                      selectedTransaction.amount >= 0
                        ? "text-[#059669]"
                        : "text-[#dc2626]"
                    }`}
                  >
                    {formatCurrency(selectedTransaction.amount)}
                  </span>
                </div>
              </div>

                 <div className="pb-2 pt-8 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTransaction(null)}
                    className="flex-1 text-background hover:bg-secondary hover:text-primary dark:hover:bg-secondary/30 dark:hover:text-secondary-foreground"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleDownloadReceipt}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedTransaction(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted"
              >
                <XIcon className="w-4 h-4 text-muted-foreground dark:text-white" />
              </button>
            </motion.div>
          </div>
          
        )}

        {/* Payout Detail Modal (Receipt) */}
        {selectedPayout && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-card rounded-lg max-w-lg w-full"
            >
                            <div className="p-8 bg-[#ffffff] text-[#111827]">
              <div
                ref={payoutReceiptRef}
                className="p-8 rounded-lg bg-[#ffffff] text-[#111827]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#111827]">
                      Payout Receipt
                    </h2>
                    <p className="text-sm text-[#6b7280]">
                      ID: {selectedPayout.id}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-[#16a34a]" />
                </div>
                <div className="space-y-4 border-t border-b border-[#e5e7eb] py-4">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Request Date:</span>
                    <span className="font-medium text-[#111827]">
                      {selectedPayout.requestDate.toLocaleString()}
                    </span>
                  </div>
                  {selectedPayout.paymentDate && (
                    <div className="flex justify-between">
                      <span className="text-[#6b7280]">Payment Date:</span>
                      <span className="font-medium text-[#111827]">
                        {selectedPayout.paymentDate.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedPayout.status === "Paid"
                          ? "bg-[#d1fae5] text-[#065f46]"
                          : selectedPayout.status === "Processing"
                            ? "bg-[#dbeafe] text-[#1e40af]"
                            : selectedPayout.status === "Pending"
                              ? "bg-[#fef3c7] text-[#92400e]"
                              : "bg-[#fee2e2] text-[#991b1b]"
                      }`}
                    >
                      {selectedPayout.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[#6b7280]">Reference:</span>
                    <span className="font-medium text-[#111827] text-right max-w-xs">
                      {selectedPayout.transactionReference ||
                        selectedPayout.rejectionReason ||
                        "-"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-6">
                  <span className="text-lg font-bold text-[#111827]">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold text-[#059669]">
                    {formatCurrency(selectedPayout.amount)}
                  </span>
                </div>
                
                </div>
                
<div className="pt-8 pb-2 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPayout(null)}
                    className="flex-1 text-background hover:bg-secondary hover:text-primary dark:hover:bg-secondary/30 dark:hover:text-secondary-foreground"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleDownloadPayoutReceipt}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
</div>
              <button
                onClick={() => setSelectedPayout(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted"
              >
                <XIcon className="w-4 h-4 text-muted-foreground dark:text-white" />
              </button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}



