'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    coverageType: '',
    cacNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName) newErrors.companyName = 'Company name is required';
    if (!formData.contactPerson) newErrors.contactPerson = 'Contact person is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email format';
    if (!formData.phone) newErrors.phone = 'Phone is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.coverageType) newErrors.coverageType = 'Coverage type is required';
    if (!formData.cacNumber) newErrors.cacNumber = 'CAC Number is required';
    if (!termsAccepted) newErrors.terms = 'You must accept the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex items-center justify-center mb-8">
        <Image src="/logo.png" alt="AgriTec" width={150} height={50} className="h-12 w-auto" />
      </div>

      <Card className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-2">Register your logistics company to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Company Name *</label>
              <Input
                placeholder="Your Company"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="mt-2"
                disabled={loading}
              />
              {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Contact Person *</label>
              <Input
                placeholder="John Doe"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className="mt-2"
                disabled={loading}
              />
              {errors.contactPerson && <p className="text-xs text-red-500 mt-1">{errors.contactPerson}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Email *</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="mt-2"
              disabled={loading}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Phone *</label>
            <Input
              type="tel"
              placeholder="+234-80-0000-0000"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="mt-2"
              disabled={loading}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Address *</label>
            <Input
              placeholder="123 Business Street"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="mt-2"
              disabled={loading}
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Coverage Type *</label>
            <Select value={formData.coverageType} onValueChange={(value) => handleChange('coverageType', value)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select coverage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="nationwide">Nationwide</SelectItem>
              </SelectContent>
            </Select>
            {errors.coverageType && <p className="text-xs text-red-500 mt-1">{errors.coverageType}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">CAC Number *</label>
            <Input
              placeholder="12345678"
              value={formData.cacNumber}
              onChange={(e) => handleChange('cacNumber', e.target.value)}
              className="mt-2"
              disabled={loading}
            />
            {errors.cacNumber && <p className="text-xs text-red-500 mt-1">{errors.cacNumber}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Password *</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="mt-2"
                disabled={loading}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Confirm Password *</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="mt-2"
                disabled={loading}
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-foreground cursor-pointer">
              I agree to the Terms of Service
            </label>
          </div>
          {errors.terms && <p className="text-xs text-red-500">{errors.terms}</p>}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="pt-4 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/signin" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
