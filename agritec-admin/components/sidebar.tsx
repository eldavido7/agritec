"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  BarChart3,
  Book,
  Settings,
  LogOut,
  Menu,
  X,
  Sprout,
  ShoppingBag,
  Bell,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { useAdminNotificationsStore } from "@/stores/admin-notifications-store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    section: "main",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3 className="w-4 h-4" />,
    section: "main",
  },
  {
    label: "Sellers",
    href: "/dashboard/sellers",
    icon: <Sprout className="w-4 h-4" />,
    section: "users",
  },
  {
    label: "Buyers",
    href: "/dashboard/buyers",
    icon: <ShoppingBag className="w-4 h-4" />,
    section: "users",
  },
  {
    label: "Orders",
    href: "/dashboard/orders",
    icon: <ShoppingCart className="w-4 h-4" />,
    section: "orders",
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: <MessageCircle className="w-4 h-4" />,
    section: "communication",
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: <Bell className="w-4 h-4" />,
    section: "communication",
  },
  {
    label: "Payouts",
    href: "/dashboard/payouts",
    icon: <Wallet className="w-4 h-4" />,
    section: "finance",
  },
  {
    label: "Audit Logs",
    href: "/dashboard/audit",
    icon: <Book className="w-4 h-4" />,
    section: "admin",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="w-4 h-4" />,
    section: "admin",
  },
];

const sectionLabels: Record<string, string> = {
  main: "Main",
  users: "User Management",
  orders: "Orders & Marketplace",
  communication: "Communication",
  finance: "Finance",
  admin: "Administration",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const signOut = useAdminAuthStore((state) => state.signOut);
  const unreadNotificationCount = useAdminNotificationsStore(
    (state) => state.unreadCount,
  );

  const handleLogout = () => {
    signOut();
    router.push("/");
  };

  const groupedNavItems = navItems.reduce(
    (acc, item) => {
      const section = item.section || "main";
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>,
  );

  return (
    <>
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="border-sidebar-border bg-sidebar text-white backdrop-blur-sm hover:bg-sidebar/90 hover:text-white"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar transition-all duration-300 md:static",
          isOpen
            ? "left-0"
            : "left-0 -translate-x-full md:left-0 md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-center border-b border-sidebar-border bg-background px-4 py-2">
          <Link href="/dashboard" className="group" onClick={() => setIsOpen(false)}>
            <Image
              src="/logo.png"
              alt="AgriTec Logo"
              width={128}
              height={128}
              className="rounded-lg"
            />
          </Link>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section} className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {sectionLabels[section]}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = pathname === item.href;
                  const showNotificationDot =
                    item.href === "/dashboard/notifications" && unreadNotificationCount > 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="relative">
                        {item.icon}
                        {showNotificationDot ? (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                        ) : null}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {isActive ? <div className="h-1 w-1 rounded-full bg-current" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="mr-3 w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
