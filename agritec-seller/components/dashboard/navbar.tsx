"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import {
  getSellerMockData,
  mockNotifications,
  mockOrders,
  mockProducts,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/formatting";

type Notification = (typeof mockNotifications)[0];
type Order = (typeof mockOrders)[0];
type Product = (typeof mockProducts)[0];
type Variant = { id: string; name: string; price: number; inventory: number };

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/products": "Products",
  "/dashboard/discounts": "Discounts",
  "/dashboard/orders": "Orders",
  "/dashboard/customers": "Customers",
  "/dashboard/messages": "Messages",
  "/dashboard/wallet": "Wallet",
  "/dashboard/notifications": "Notifications",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

export default function Navbar() {
  const pathname = usePathname();
  const pageTitle = routeTitles[pathname] || "Dashboard";
  const seller = getSellerMockData();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Use mockNotifications as the source of truth
  const [notifications, setNotifications] =
    useState<Notification[]>(seller.notifications as Notification[]);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Dot only shows when at least one notification is unread
  const hasUnread = notifications.some((n) => !n.read);

  const getTotalInventory = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return product.inventory || 0;
    }
    return product.variants.reduce(
      (sum: number, v: Variant) => sum + (v.inventory || 0),
      0,
    );
  };

  const getRelatedOrder = (orderId: string): Order | null =>
    (seller.orders.find((o) => o.id === orderId) as Order) || null;

  const getRelatedProduct = (productId: number): Product | null =>
    (seller.products.find((p) => p.id === productId) as Product) || null;

  const closeModal = () => {
    setSelectedNotification(null);
    setImageIndex(0);
  };

  const handleNotificationClick = (notificationId: number) => {
    let clicked: Notification | undefined;

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === notificationId) {
          clicked = { ...n, read: true };
          return clicked;
        }
        return n;
      }),
    );

    // We need the clicked value; grab it from current state directly
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;

    const marked = { ...notif, read: true };

    if (marked.type === "order" || marked.type === "product") {
      setSelectedNotification(marked);
    } else if (
      marked.type === "message" &&
      "messageId" in marked &&
      marked.messageId
    ) {
      router.push(`/dashboard/messages?open=${marked.messageId}`);
    }

    setNotificationsOpen(false);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-64 bg-sidebar border-r-sidebar-border pt-3 flex flex-col"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Access different sections of the dashboard
                </SheetDescription>
                <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden min-w-0 md:block">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white relative"
            >
              <Bell className="w-5 h-5" />
              {hasUnread && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>

            {notificationsOpen && (
              <div className="fixed top-16 inset-x-4 md:absolute md:top-auto md:inset-x-auto md:right-0 md:mt-2 md:w-96 bg-card border border-border rounded-lg shadow-lg z-50">
                <h3 className="font-semibold text-foreground text-sm border-b border-border pb-2 mb-2 px-4 pt-4">
                  Notifications
                </h3>
                <div className="py-2">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className="relative text-sm cursor-pointer hover:bg-secondary/50 px-4 py-3"
                        onClick={() => handleNotificationClick(notif.id)}
                      >
                        {!notif.read && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                        )}
                        <div className="flex items-start gap-2 pl-3">
                          <span className="text-base leading-none mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-xs">
                              {notif.title}
                            </p>
                            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
                              {notif.message}
                            </p>
                            <p className="text-muted-foreground/70 text-xs mt-1">
                              {formatDate(notif.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No notifications
                    </p>
                  )}
                </div>
                {notifications.length > 5 && (
                  <div className="border-t border-border px-4 py-2">
                    <button
                      className="text-xs text-primary hover:underline w-full text-center"
                      onClick={() => {
                        router.push("/dashboard/notifications");
                        setNotificationsOpen(false);
                      }}
                    >
                      View all {notifications.length} notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Profile */}
          <Button
            variant="ghost"
            className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white flex items-center gap-2 ml-1 md:ml-2"
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{seller.name}</span>
              <span className="text-xs">{seller.farmName}</span>
            </div>
          </Button>
        </div>
      </header>

      {/* Detail Modal — same structure as NotificationsPage */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center p-4">
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
                                {product.images.map(
                                  (img: string, idx: number) => (
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
                                  ),
                                )}
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
    </>
  );
}





