'use client';

import { Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAdminAuthStore } from '@/stores/admin-auth-store';
import { useAdminNotificationsStore } from '@/stores/admin-notifications-store';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/farmers': 'Sellers',
  '/dashboard/sellers': 'Sellers',
  '/dashboard/buyers': 'Buyers',
  '/dashboard/orders': 'Orders',
  '/dashboard/messages': 'Messages',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/payouts': 'Payouts',
  '/dashboard/audit': 'Audit Logs',
  '/dashboard/settings': 'Settings',
};

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const user = useAdminAuthStore((state) => state.user);
  const unreadCount = useAdminNotificationsStore((state) => state.unreadCount);
  const fetchNotifications = useAdminNotificationsStore((state) => state.fetchNotifications);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void fetchNotifications({ force: true });

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications({ force: true });
      }
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fetchNotifications]);

  const pageTitle = routeTitles[pathname] ?? 'Dashboard';

  return (
    <div className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        <div className="min-w-0 flex-1 pl-12 md:flex-initial md:pl-0">
          <h1 className="truncate text-xl font-bold text-foreground md:text-2xl">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-foreground hover:bg-muted"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            className="relative text-foreground hover:bg-muted"
            onClick={() => router.push('/dashboard/notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
            ) : null}
          </Button>

          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
            <p className="text-xs capitalize text-muted-foreground">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
