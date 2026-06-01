"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getSellerMockData,
  mockNotifications,
  mockOrders,
  mockProducts,
} from "@/lib/mock-data";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime, formatCurrency, formatDate } from "@/lib/formatting";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ITEMS_PER_PAGE = 10;

type Notification = (typeof mockNotifications)[0];
type Order = (typeof mockOrders)[0];
type Product = (typeof mockProducts)[0];
type Variant = { id: number; name: string; price: number; inventory: number };

export default function NotificationsPage() {
  const seller = getSellerMockData();
  const [notifications, setNotifications] =
    useState<Notification[]>(seller.notifications as Notification[]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const handleSelectNotification = (notification: Notification) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notification.id ? { ...notif, read: true } : notif,
      ),
    );
    setSelectedNotification({ ...notification, read: true });
  };

  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const getTotalInventory = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return product.inventory || 0;
    }
    return product.variants.reduce(
      (sum: number, v: Variant) => sum + (v.inventory || 0),
      0,
    );
  };

  const getRelatedOrder = (orderId: string): Order | null => {
    return (seller.orders.find((o) => o.id === orderId) as Order) || null;
  };

  const getRelatedProduct = (productId: number): Product | null => {
    return (seller.products.find((p) => p.id === productId) as Product) || null;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order":
        return "📦";
      case "product":
        return "⚠️";
      case "message":
        return "💬";
      default:
        return "🔔";
    }
  };

  const closeModal = () => {
    setSelectedNotification(null);
    setImageIndex(0);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground mt-2">
              Order updates, product alerts, and messages for {seller.farmName}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={markAllAsRead}
            disabled={notifications.every((notif) => notif.read)}
            className="h-11"
          >
            Mark all as read
          </Button>
        </div>
      </motion.div>

      {/* Notifications List */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <Card className="p-6">
          <div className="space-y-3">
            {paginatedNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No notifications
              </p>
            ) : (
              paginatedNotifications.map((notif) => (
                <motion.button
                  key={notif.id}
                  onClick={() => handleSelectNotification(notif)}
                  className={`w-full text-left p-4 rounded-lg border border-border hover:bg-secondary/50 hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white transition-colors ${
                    !notif.read ? "bg-muted/30 border-primary/30" : ""
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex gap-4">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {notif.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(notif.timestamp)}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({notifications.length}{" "}
                notifications)
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

      {/* Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-border bg-card">
              <h2 className="text-xl font-bold text-foreground">
                {selectedNotification.title}
              </h2>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Details */}
              {selectedNotification.type === "order" &&
              "orderId" in selectedNotification
                ? (() => {
                    const order = getRelatedOrder(
                      (selectedNotification as any).orderId,
                    );
                    return order ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Order ID
                            </p>
                            <p className="font-semibold text-foreground">
                              {order.id}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Status
                            </p>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.status === "Delivered"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                  : order.status === "In Transit"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                    : order.status === "Processing"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Buyer
                            </p>
                            <p className="font-semibold text-foreground">
                              {order.buyer}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Order Date
                            </p>
                            <p className="font-semibold text-foreground">
                              {formatDate(order.date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Product
                            </p>
                            <p className="font-semibold text-foreground">
                              {order.product}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Variant & Quantity
                            </p>
                            <p className="font-semibold text-foreground">
                              {order.quantity} x {order.variant}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-b border-border py-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            Total Amount
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(order.price)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Order not found</p>
                    );
                  })()
                : null}

              {/* Product Details */}
              {selectedNotification.type === "product" &&
              "productId" in selectedNotification
                ? (() => {
                    const product = getRelatedProduct(
                      (selectedNotification as any).productId,
                    );
                    return product ? (
                      <div className="space-y-4">
                        {/* Image Gallery */}
                        {product.images && product.images.length > 0 && (
                          <div className="space-y-3">
                            <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                              <img
                                src={product.images[imageIndex]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {product.images.length > 1 && (
                              <div className="flex gap-2">
                                {product.images.map((img, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setImageIndex(idx)}
                                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                      imageIndex === idx
                                        ? "border-primary"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                  >
                                    <img
                                      src={img}
                                      alt={`${product.name} ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Name
                            </p>
                            <p className="font-semibold text-foreground">
                              {product.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Category
                            </p>
                            <p className="font-semibold text-foreground">
                              {product.category}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Base Price
                            </p>
                            <p className="font-semibold text-primary">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Total Stock
                            </p>
                            <p className="font-semibold text-foreground">
                              {getTotalInventory(product)} units
                            </p>
                          </div>
                        </div>

                        {product.variants && product.variants.length > 0 && (
                          <div className="border-t border-border pt-4">
                            <p className="text-sm font-semibold text-foreground mb-3">
                              Variants
                            </p>
                            <div className="space-y-2">
                              {product.variants.map((variant: Variant) => (
                                <div
                                  key={variant.id}
                                  className="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
                                >
                                  <div>
                                    <p className="text-foreground">
                                      {variant.name}
                                    </p>
                                    <p
                                      className={`text-xs ${
                                        variant.inventory === 0
                                          ? "text-red-600"
                                          : variant.inventory <= 10
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                      }`}
                                    >
                                      {variant.inventory} in stock
                                    </p>
                                  </div>
                                  <span className="font-semibold text-primary">
                                    {formatCurrency(variant.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Product not found</p>
                    );
                  })()
                : null}

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                  onClick={closeModal}
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
