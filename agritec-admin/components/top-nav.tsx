'use client';

import { User } from '@/lib/auth';
import { Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { notifications } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TopNavProps {
  user: User | null;
  title?: string;
}

export function TopNav({ user, title }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const pageTitle =
    title ||
    ({
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
    }[pathname] ?? 'Dashboard');
  const newestNotifications = [...notifications]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);
  const hasUnreadNotifications = notifications.some((notification) => !notification.read);

  return (
    <div className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        {/* Left Section */}
        <div className="flex-1 md:flex-initial">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{pageTitle}</h1>
        </div>

        {/* Center Section - Search (hidden on mobile) */}
        <div className="hidden md:flex flex-1 mx-6">
          {/* <div className="w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 bg-muted/50 border-border focus-visible:ring-primary"
            />
          </div> */}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hover:bg-muted text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          )}

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted text-foreground"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="w-5 h-5" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
            )}
          </Button>

          {/* User Menu */}
          {/* <DropdownMenu> */}
            {/* <DropdownMenuTrigger asChild> */}
              {/* <Button variant="ghost" className="gap-2 hover:bg-muted"> */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
                {/* <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" /> */}
              {/* </Button> */}
            {/* </DropdownMenuTrigger> */}
            {/* <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Newest Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {newestNotifications.map((notification) => (
              <button
                key={notification.id}
                className="w-full rounded-md border border-border/50 p-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  setNotificationsOpen(false);
                  router.push('/dashboard/notifications');
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{notification.title}</p>
                  {!notification.read && <span className="h-2 w-2 rounded-full bg-secondary" />}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {notification.message}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{notification.timestamp}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
