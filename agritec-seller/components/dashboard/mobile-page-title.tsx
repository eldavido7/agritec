"use client";

import { usePathname } from "next/navigation";

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

export function MobilePageTitle() {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "Dashboard";

  return (
    <div className="mb-4 md:hidden">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
    </div>
  );
}
