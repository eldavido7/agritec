'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Mail, ChevronLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    // Simulate email sending
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex items-center justify-center mb-8">
        <Image src="/logo.png" alt="AgriTec" width={150} height={50} className="h-12 w-auto" />
      </div>

      <Card className="p-8 space-y-6">
        {!submitted ? (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your email address and we&apos;ll send you a link to reset your password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  disabled={loading}
                />
              </div>

              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="pt-4 border-t border-border">
              <Link href="/signin" className="flex items-center gap-2 text-sm text-primary hover:underline justify-center">
                <ChevronLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  We&apos;ve sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Check your spam folder if you don&apos;t see the email</p>
              <p>• The link will expire in 24 hours</p>
              <p>• Click the link to create a new password</p>
            </div>

            <div className="pt-4 border-t border-border">
              <Link href="/signin" className="flex items-center gap-2 text-sm text-primary hover:underline justify-center">
                <ChevronLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}
