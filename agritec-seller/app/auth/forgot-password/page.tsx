'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Leaf, ArrowRight, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setError('Invalid email address');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl text-foreground">AgriTec</span>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {!submitted ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
              <p className="text-muted-foreground mb-8">
                Enter your email address and we&apos;ll send you a link to reset your password
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kingsley@farm.com"
                    className={error ? 'border-destructive' : ''}
                  />
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6"
                >
                  {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                  <Mail className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {/* Back to Sign In */}
              <p className="text-center text-muted-foreground mt-6">
                Remember your password?{' '}
                <Link href="/auth/signin" className="text-primary hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-3">Check Your Email</h2>
                <p className="text-muted-foreground mb-6">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Click the link in the email to create a new password. The link will expire in 24 hours.
                </p>

                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary/30 dark:hover:text-white mb-4"
                >
                  Try Another Email
                </Button>

                <Link href="/auth/signin">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    Back to Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">
                  Didn&apos;t receive an email? Check your spam folder or{' '}
                  <Link href="#" className="text-primary hover:underline">
                    contact support
                  </Link>
                  .
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
