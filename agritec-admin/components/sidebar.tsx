"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

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

  const handleLogout = () => {
    logout();
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
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="border-sidebar-border bg-sidebar/80 backdrop-blur-sm"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static w-64 h-screen bg-sidebar border-r border-border flex flex-col transition-all duration-300 z-40",
          isOpen
            ? "left-0"
            : "left-0 md:left-0 -translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo Section */}
        <div className="px-4 py-2 border-b border-sidebar-border bg-background flex justify-center items-center">
          <Link href="/dashboard" className="group">
            <Image
              src="/logo.png"
              alt="AgriTec Logo"
              width={128}
              height={128}
              className="rounded-lg"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-7">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section} className="space-y-2">
              <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {sectionLabels[section]}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <div className="w-1 h-1 rounded-full bg-current" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
