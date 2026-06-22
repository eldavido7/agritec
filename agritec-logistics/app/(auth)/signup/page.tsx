'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { nigerianStates } from '@/lib/data/nigerian-states';
import { useLogisticsAuthStore } from '@/lib/store/logistics-auth-store';

export default function SignUpPage() {
  const router = useRouter();
  const signUp = useLogisticsAuthStore((state) => state.signUp);
  const isLoading = useLogisticsAuthStore((state) => state.isLoading);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    contactPersonName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessAddress: '',
    city: '',
    state: '',
    lga: '',
    area: '',
    description: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState('');

  const selectedState = useMemo(
    () => nigerianStates.find((state) => state.name === formData.state) ?? null,
    [formData.state]
  );

  const handleChange = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!formData.companyName.trim()) nextErrors.companyName = 'Company name is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    if (!formData.password) nextErrors.password = 'Password is required';
    if (formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) nextErrors.terms = 'Accept the terms to continue';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      await signUp({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        companyName: formData.companyName.trim(),
        description: formData.description.trim() || null,
        contactPersonName: formData.contactPersonName.trim() || null,
        businessAddress: formData.businessAddress.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state || null,
        lga: formData.lga || null,
        area: formData.area.trim() || null,
      });

      setSubmitMessage('Signup submitted. Your company is pending admin verification.');
      window.setTimeout(() => router.push('/signin'), 1200);
    } catch (submitError) {
      setSubmitMessage(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create account'
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
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Register your logistics company for marketplace delivery assignments
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Owner Full Name</label>
            <Input
              value={formData.fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
            {errors.fullName ? <p className="mt-1 text-xs text-red-500">{errors.fullName}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Company Name</label>
              <Input
                value={formData.companyName}
                onChange={(event) => handleChange('companyName', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
              {errors.companyName ? <p className="mt-1 text-xs text-red-500">{errors.companyName}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Contact Person</label>
              <Input
                value={formData.contactPersonName}
                onChange={(event) => handleChange('contactPersonName', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(event) => handleChange('email', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
              {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Business Address</label>
            <Input
              value={formData.businessAddress}
              onChange={(event) => handleChange('businessAddress', event.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-foreground">State</label>
              <Select value={formData.state} onValueChange={(value) => handleChange('state', value ?? '')}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state.name} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">LGA</label>
              <Select
                value={formData.lga}
                onValueChange={(value) => handleChange('lga', value ?? '')}
                disabled={!selectedState}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedState?.lgas || []).map((lga) => (
                    <SelectItem key={lga} value={lga}>
                      {lga}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Area</label>
              <Input
                value={formData.area}
                onChange={(event) => handleChange('area', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">City</label>
            <Input
              value={formData.city}
              onChange={(event) => handleChange('city', event.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Company Description</label>
            <Input
              value={formData.description}
              onChange={(event) => handleChange('description', event.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(event) => handleChange('password', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
              {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => handleChange('confirmPassword', event.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
              {errors.confirmPassword ? <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))}
            />
            <label htmlFor="terms" className="cursor-pointer text-sm text-foreground">
              I confirm the company information submitted is accurate
            </label>
          </div>
          {errors.terms ? <p className="text-xs text-red-500">{errors.terms}</p> : null}

          {submitMessage ? (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
              {submitMessage}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/signin" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
