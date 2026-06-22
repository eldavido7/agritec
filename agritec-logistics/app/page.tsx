'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
        <Image src="/logo.png" alt="AgriTec" width={180} height={60} className="h-14 w-auto" />

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">AgriTec Logistics</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Manage assigned marketplace deliveries, pricing, and regional coverage from one dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/signin">
            <Button size="lg">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline">
              Register Company
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
