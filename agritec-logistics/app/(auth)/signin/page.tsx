'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useLogisticsAuthStore } from '@/lib/store/logistics-auth-store';

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useLogisticsAuthStore((state) => state.signIn);
  const isLoading = useLogisticsAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    try {
      await signIn(email, password);
      router.push(searchParams.get('next') || '/dashboard');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to sign in'
      );
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-8 flex items-center justify-center">
        <Image src="/logo.png" alt="AgriTec" width={150} height={50} className="h-12 w-auto" />
      </div>

      <Card className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your logistics operations dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

function SignInFallback() {
  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-center">
        <Image src="/logo.png" alt="AgriTec" width={150} height={50} className="h-12 w-auto" />
      </div>
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Loading sign in...
      </Card>
    </div>
  );
}
