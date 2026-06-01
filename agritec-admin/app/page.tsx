'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@agritec.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = login(email, password);
    
    if (result.success && result.user) {
      setCurrentUser(result.user);
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center">
          <div className="inline-block">
            <Image src="/logo.png" alt="AgriTec Logo" width={128} height={128} priority className="w-lg h-lg object-contain" />
          </div>
          {/* <h1 className="text-3xl font-bold text-foreground">AgriTec</h1>
          <p className="text-muted-foreground text-sm mt-2">Innovative Farming Solutions</p> */}
        </div>

        {/* Login Card */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="admin@agritec.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  <div className="bg-muted/50 p-2 rounded text-xs">
                    <p className="font-mono text-muted-foreground">admin@agritec.com / admin123</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-xs">
                    <p className="font-mono text-muted-foreground">manager@agritec.com / manager123</p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 AgriTec. All rights reserved.
        </p>
      </div>
    </div>
  );
}
