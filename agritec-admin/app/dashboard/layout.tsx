'use client';

import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { DashboardAuthGuard } from '@/components/auth/dashboard-auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden md:ml-0">
          <TopNav />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-6 md:px-6">{children}</div>
          </main>
        </div>
      </div>
    </DashboardAuthGuard>
  );
}
