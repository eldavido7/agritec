"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getSellerMockData, mockOrders } from "@/lib/mock-data";
import { Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatting";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    Delivered:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    "In Transit":
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    Processing:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    Pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  };
  return colors[status] || colors.Pending;
};

type Order = (typeof mockOrders)[0];

const STATUS_FLOW = ["Pending", "Processing", "In Transit", "Delivered"];
const ITEMS_PER_PAGE = 10;

export default function OrdersPage() {
  const seller = getSellerMockData();
  const [orders, setOrders] = useState<Order[]>(seller.orders);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{
    orderId: string;
    newStatus: string;
  } | null>(null);

  const statuses = [
    "All",
    "Pending",
    "Processing",
    "In Transit",
    "Delivered",
    "Cancelled",
  ];
  const filteredOrders = orders.filter(
    (order) =>
      (filterStatus === "All" || order.status === filterStatus) &&
      (order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.buyer.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    setStatusConfirm({ orderId, newStatus });
  };

  const confirmStatusUpdate = () => {
    if (!statusConfirm) return;
    const { orderId, newStatus } = statusConfirm;
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    setStatusConfirm(null);
  };

  const getStatusMessage = (newStatus: string) => {
    switch (newStatus) {
      case "Delivered":
        return {
          title: "Mark as Delivered?",
          message:
            "This will mark the order as delivered and update customer records. Inventory will be adjusted if needed.",
          implications: "The customer will be notified about the delivery.",
        };
      case "Cancelled":
        return {
          title: "Cancel Order?",
          message:
            "This will cancel the order and may trigger refund processes. This action cannot be easily undone.",
          implications:
            "Reserved inventory will be released and the customer will be notified.",
        };
      case "In Transit":
        return {
          title: "Mark as In Transit?",
          message:
            "This will notify the customer that their order is on the way.",
          implications: "A delivery notification will be sent to the customer.",
        };
      case "Processing":
        return {
          title: "Mark as Processing?",
          message:
            "This will indicate the order is being prepared for shipment.",
          implications: "Inventory will be reserved for this order.",
        };
      default:
        return {
          title: "Update Status?",
          message: "Update order status",
          implications: "",
        };
    }
  };

  const isStatusDisabled = (status: string, currentStatus: string) => {
    if (currentStatus === "Cancelled") return true;
    if (currentStatus === "Delivered") return true;
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    const newIndex = STATUS_FLOW.indexOf(status);
    return newIndex < currentIndex;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div>
          <p className="text-muted-foreground mt-2">
            Track and manage orders for {seller.farmName}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-4"
      >
        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by order ID or buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
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

      {/* Orders Table */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Order ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Buyer
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Amount
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
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border hover:bg-secondary/50 dark:hover:bg-secondary/30 dark:hover:text-white transition-colors"
                  >
                    <td
                      className="py-3 px-4 text-sm font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {order.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {order.buyer}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {order.product}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDate(order.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredOrders.length}{" "}
                orders)
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
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
                  ),
                )}
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
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Orders",
            value: orders.length,
            color: "text-primary",
          },
          {
            label: "Delivered",
            value: orders.filter((o) => o.status === "Delivered").length,
            color: "text-green-600",
          },
          {
            label: "In Transit",
            value: orders.filter((o) => o.status === "In Transit").length,
            color: "text-blue-600",
          },
          {
            label: "Pending",
            value: orders.filter((o) => o.status === "Pending").length,
            color: "text-yellow-600",
          },
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-2xl w-full"
          >
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                Order Details
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Buyer</p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.buyer}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Order Date
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedOrder.date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Delivery Date
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedOrder.deliveryDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Product</p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.product}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Variant</p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.variant}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.quantity} units
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Variant & Quantity
                  </p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.quantity} x {selectedOrder.variant}
                  </p>
                </div>
              </div>

              <div className="border-t border-b border-border py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(selectedOrder.price)}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Update Status
                </p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_FLOW.map((status) => {
                    const isDisabled =
                      selectedOrder.status === "Cancelled" ||
                      selectedOrder.status === "Delivered" ||
                      STATUS_FLOW.indexOf(status) <
                        STATUS_FLOW.indexOf(selectedOrder.status);
                    return (
                      <Button
                        key={status}
                        size="sm"
                        variant={
                          selectedOrder.status === status
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleStatusUpdate(selectedOrder.id, status)
                        }
                        disabled={isDisabled}
                        className={
                          selectedOrder.status === status
                            ? "bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        }
                      >
                        {status}
                      </Button>
                    );
                  })}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleStatusUpdate(selectedOrder.id, "Cancelled")
                    }
                    disabled={
                      selectedOrder.status === "Cancelled" ||
                      selectedOrder.status === "Delivered"
                    }
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelled
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-md w-full p-6"
          >
            {(() => {
              const msg = getStatusMessage(statusConfirm.newStatus);
              return (
                <>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    {msg.title}
                  </h3>
                  <div className="space-y-3 mb-6">
                    <p className="text-foreground">{msg.message}</p>
                    {msg.implications && (
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-900 dark:text-yellow-200">
                          <strong>Implications:</strong> {msg.implications}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                      onClick={() => setStatusConfirm(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={confirmStatusUpdate}
                    >
                      Confirm
                    </Button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </div>
      )}
    </div>
  );
}
