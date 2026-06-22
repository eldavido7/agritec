'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ChevronLeft, Mail } from 'lucide-react';
import { useLogisticsAuthStore } from '@/lib/store/logistics-auth-store';

export default function ForgotPasswordPage() {
  const requestPasswordReset = useLogisticsAuthStore((state) => state.requestPasswordReset);
  const isLoading = useLogisticsAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim()) {
      setMessage('Enter your account email address.');
      return;
    }

    try {
      const responseMessage = await requestPasswordReset(email);
      setMessage(responseMessage);
      setSubmitted(true);
    } catch (submitError) {
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to send reset email'
      );
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-8 flex items-center justify-center">
        <Image src="/logo.png" alt="AgriTec" width={150} height={50} className="h-12 w-auto" />
      </div>

      <Card className="space-y-6 p-8">
        {!submitted ? (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your logistics account email to receive a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2"
                  disabled={isLoading}
                />
              </div>

              {message ? (
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
                  {message}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="border-t border-border pt-4">
              <Link href="/signin" className="flex items-center justify-center gap-2 text-sm text-primary hover:underline">
                <ChevronLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Link href="/signin" className="flex items-center justify-center gap-2 text-sm text-primary hover:underline">
                <ChevronLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}
