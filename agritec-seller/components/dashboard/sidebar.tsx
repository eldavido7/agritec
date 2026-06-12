"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ShoppingCart,
  Package,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Users,
  Wallet,
  BadgePercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { useSellerNotificationsStore } from "@/stores/seller-notifications-store";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Discounts", href: "/dashboard/discounts", icon: BadgePercent },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSellerAuthStore((state) => state.signOut);
  const unreadCount = useSellerNotificationsStore((state) => state.unreadCount);

  const handleLogout = () => {
    signOut();
    router.push("/auth/signin");
  };

  return (
    <>
      <Link href="/dashboard" className="group" onClick={onNavigate}>
        <Image
          src="/logo.png"
          alt="AgriTec Logo"
          width={140}
          height={140}
          className="ml-12 items-center justify-center"
        />
      </Link>

      <nav className="mt-4 flex-1 space-y-2 px-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const showUnreadDot = item.href === "/dashboard/notifications" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2 transition-colors",
                isActive
                  ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-secondary/30 dark:hover:text-white",
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showUnreadDot ? (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pb-6">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-secondary/30 dark:hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar pt-3 md:flex">
      <SidebarContent />
    </aside>
  );
}
