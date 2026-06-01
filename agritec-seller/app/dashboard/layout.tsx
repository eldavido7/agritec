import Sidebar from '@/components/dashboard/sidebar';
import Navbar from '@/components/dashboard/navbar';
import { DashboardAuthGuard } from '@/components/auth/dashboard-auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Navbar />
        <main className="ml-0 md:ml-64 mt-16 p-4 md:p-6 min-h-screen">{children}</main>
      </div>
    </DashboardAuthGuard>
  );
}
