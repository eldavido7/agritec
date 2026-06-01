"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSellerSession } from "@/lib/local-auth";

export function DashboardAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const session = getSellerSession();
    if (!session) {
      router.replace(`/auth/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setIsAllowed(true);
  }, [pathname, router]);

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking seller session...
      </div>
    );
  }

  return <>{children}</>;
}
