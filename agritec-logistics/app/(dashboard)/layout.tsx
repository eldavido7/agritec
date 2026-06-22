'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Bell, LayoutDashboard, LogOut, Menu, Moon, Settings, Sun, Truck, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardAuthGuard } from '@/components/auth/dashboard-auth-guard';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { useLogisticsAuthStore } from '@/lib/store/logistics-auth-store';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Deliveries', href: '/deliveries', icon: Truck },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGuard>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const signOut = useLogisticsAuthStore((state) => state.signOut);
  const user = useLogisticsAuthStore((state) => state.user);
  const unreadCount = useLogisticsStore((state) => state.unreadCount);
  const fetchNotifications = useLogisticsStore((state) => state.fetchNotifications);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    void fetchNotifications({ force: true }).catch(() => undefined);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleSignOut = () => {
    signOut();
    router.push('/signin');
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isDesktop || sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card md:static md:translate-x-0"
      >
        <div className="border-b border-border p-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="AgriTec" width={150} height={50} className="h-8 w-auto" />
          </Link>
        </div>

        <div className="border-b border-border px-4 py-4">
          <p className="text-sm font-semibold text-foreground">
            {user?.logisticsProfile?.companyName || 'Logistics Company'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user?.logisticsProfile?.verificationStatus === 'VERIFIED'
              ? 'Verified delivery partner'
              : 'Pending verification'}
          </p>
        </div>

        <nav className="space-y-2 p-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <Button variant="outline" className="w-full justify-start" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </motion.aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-foreground hover:text-primary md:hidden"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <Link href="/notifications" className="relative rounded-lg p-2 text-foreground transition-colors hover:bg-muted">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
