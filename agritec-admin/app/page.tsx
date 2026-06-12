'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { toast } from 'sonner';
import { useAdminAuthStore } from '@/stores/admin-auth-store';

const adminDemoCredentials = [
  {
    label: 'Primary Admin',
    email: 'admin@agritec.com',
    password: 'admin123',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { token, isReady, isLoading, error, bootstrap, signIn, clearError } =
    useAdminAuthStore();
  const [email, setEmail] = useState('admin@agritec.com');
  const [password, setPassword] = useState('admin123');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isReady || !token) return;
    const nextPath = new URLSearchParams(window.location.search).get('next');
    router.replace(nextPath || '/dashboard');
  }, [isReady, router, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    try {
      await signIn(email, password);
      console.log('[Admin Sign-in Page] Sign-in success', {
        email: email.trim().toLowerCase(),
      });
      toast.success('Sign in successful');
      const nextPath = new URLSearchParams(window.location.search).get('next');
      router.push(nextPath || '/dashboard');
    } catch (signInError) {
      console.error('[Admin Sign-in Page] Sign-in failed', signInError);
      const message =
        signInError instanceof Error ? signInError.message : 'Sign in failed';
      toast.error(message);
      setFormError(message);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-block">
            <Image src="/logo.png" alt="AgriTec Logo" width={128} height={128} priority className="w-lg h-lg object-contain" />
          </div>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(formError || error) && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError || error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="admin@agritec.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError || error) {
                      setFormError('');
                      clearError();
                    }
                  }}
                  disabled={isLoading}
                  className="border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError || error) {
                      setFormError('');
                      clearError();
                    }
                  }}
                  disabled={isLoading}
                  className="border-primary/20"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center mb-3">Demo Credentials</p>
                <div className="space-y-2">
                  {adminDemoCredentials.map((credential) => (
                    <div key={credential.email} className="bg-muted/50 p-2 rounded text-xs">
                      <p className="font-medium text-foreground">{credential.label}</p>
                      <p className="font-mono text-muted-foreground">{credential.email} / {credential.password}</p>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 AgriTec. All rights reserved.
        </p>
      </div>
    </div>
  );
}
