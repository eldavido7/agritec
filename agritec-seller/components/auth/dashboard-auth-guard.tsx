"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export function DashboardAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, isReady, bootstrap } = useSellerAuthStore();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isReady) return;

    if (!token || !user || user.role !== "SELLER") {
      router.replace(`/auth/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsAllowed(true);
  }, [isReady, pathname, router, token, user]);

  if (!isReady || !isAllowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
