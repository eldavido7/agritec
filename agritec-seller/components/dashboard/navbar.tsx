"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { formatDateTime } from "@/lib/formatting";
import {
  SellerNotificationRecord,
  useSellerNotificationsStore,
} from "@/stores/seller-notifications-store";

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

function notificationLabel(notification: SellerNotificationRecord) {
  return notification.type.replaceAll("_", " ").toLowerCase();
}

function notificationHref(notification: SellerNotificationRecord) {
  if (!notification.targetType) {
    return "/dashboard/notifications";
  }

  const targetType = notification.targetType.toUpperCase();

  if (targetType.includes("CONVERSATION") || targetType.includes("MESSAGE")) {
    return "/dashboard/messages";
  }

  if (targetType.includes("ORDER")) {
    return "/dashboard/orders";
  }

  if (targetType.includes("PAYOUT") || targetType.includes("WALLET")) {
    return "/dashboard/wallet";
  }

  if (targetType.includes("PRODUCT") || targetType.includes("DISCOUNT")) {
    return "/dashboard/products";
  }

  return "/dashboard/notifications";
}

export default function Navbar() {
  const pathname = usePathname();
  const pageTitle = routeTitles[pathname] || "Dashboard";
  const authReady = useSellerAuthStore((state) => state.isReady);
  const authUser = useSellerAuthStore((state) => state.user);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const sellerName = authUser?.fullName || "Seller";
  const farmName = authUser?.sellerProfile?.farmName || "Farm";
  const {
    notifications,
    unreadCount,
    loadedForUserId,
    fetchNotifications,
    markNotificationAsRead,
  } = useSellerNotificationsStore((state) => state);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authReady || !authUser?.id) return;

    if (loadedForUserId !== authUser.id) {
      void fetchNotifications();
    }

    const interval = window.setInterval(() => {
      void fetchNotifications({ force: true, page: 1, pageSize: 10 });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [authReady, authUser?.id, loadedForUserId, fetchNotifications]);

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

  async function handleNotificationClick(notification: SellerNotificationRecord) {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error("[Seller Navbar] Failed to mark notification as read", {
          notificationId: notification.id,
          error,
        });
      }
    }

    setNotificationsOpen(false);
    router.push(notificationHref(notification));
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 md:left-64 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center md:hidden">
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
              className="flex w-64 flex-col border-r-sidebar-border bg-sidebar p-0 pt-3"
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

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </Button>

          {notificationsOpen ? (
            <div className="fixed inset-x-4 top-16 z-50 rounded-lg border border-border bg-card shadow-lg md:absolute md:top-auto md:right-0 md:inset-x-auto md:mt-2 md:w-96">
              <div className="mb-2 border-b border-border px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              </div>
              <div className="py-2">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="relative w-full px-4 py-3 text-left text-sm hover:bg-secondary/50"
                      onClick={() => void handleNotificationClick(notification)}
                    >
                      {!notification.isRead ? (
                        <span className="absolute top-1/2 left-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
                      ) : null}
                      <div className="pl-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-medium text-foreground">
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDateTime(new Date(notification.createdAt))}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {notificationLabel(notification)}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </p>
                )}
              </div>
              <div className="border-t border-border px-4 py-2">
                <button
                  className="w-full text-center text-xs text-primary hover:underline"
                  onClick={() => {
                    router.push("/dashboard/notifications");
                    setNotificationsOpen(false);
                  }}
                >
                  View all notifications
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          className="ml-1 flex items-center gap-2 text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white md:ml-2"
        >
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{sellerName}</span>
            <span className="text-xs">{farmName}</span>
          </div>
        </Button>
      </div>
    </header>
  );
}
