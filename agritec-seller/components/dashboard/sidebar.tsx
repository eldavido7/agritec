"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Leaf,
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
import { useRouter } from "next/navigation";
import { logoutSeller } from "@/lib/local-auth";

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

export function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logoutSeller();
    router.push("/auth/signin");
  };
  
  return (
    <>
      <Link href="/dashboard" className="group">
        <Image
          src="/logo.png"
          alt="AgriTec Logo"
          width={140}
          height={140}
          className="justify-center items-center ml-12"
        />
      </Link>

      <nav className="flex-1 space-y-2 px-4 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-secondary/30 dark:hover:text-white",
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6 mt-auto">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-secondary/30 dark:hover:text-white"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border pt-3 flex-col z-50">
      <SidebarContent />
    </aside>
  );
}
