"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useSellerAuthStore } from "@/stores/seller-auth-store";
import { toast } from "sonner";

const sellerDemoCredentials = [
  {
    farmName: "Kingsley Family Farm",
    email: "kingsley@farm.com",
    password: "kingsley123",
  },
  {
    farmName: "Bello Fresh Produce",
    email: "amina@farm.com",
    password: "amina123",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const { token, isReady, isLoading, error, bootstrap, signIn, clearError } =
    useSellerAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isReady || !token) return;
    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.replace(nextPath || "/dashboard");
  }, [isReady, router, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (errors[name] || errors.form || error) {
      setErrors((prev) => ({ ...prev, [name]: "", form: "" }));
      clearError();
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!formData.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await signIn(formData.email, formData.password);
      console.log("[Seller Sign-in Page] Sign-in success", {
        email: formData.email.trim().toLowerCase(),
      });
      toast.success("Sign in successful");
      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.push(nextPath || "/dashboard");
    } catch (signInError) {
      console.error("[Seller Sign-in Page] Sign-in failed", signInError);
      const message =
        signInError instanceof Error
          ? signInError.message
          : "No seller matches those credentials.";
      toast.error(message);
      setErrors({
        form: message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-block">
            <Image
              src="/logo.png"
              alt="AgriTec Logo"
              width={128}
              height={128}
              priority
              className="w-lg h-lg object-contain"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to manage your farm and orders
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="kingsley@farm.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="********"
                  className={errors.password ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            {(errors.form || error) && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.form || error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6"
            >
              {isLoading ? "Signing In..." : "Sign In"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-primary hover:underline font-medium"
            >
              Create one
            </Link>
          </p>

          <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs font-semibold text-foreground mb-2">
              Seller Credentials:
            </p>
            <div className="space-y-2">
              {sellerDemoCredentials.map((seller) => (
                <div
                  key={seller.email}
                  className="text-xs text-muted-foreground"
                >
                  <p className="font-medium text-foreground">
                    {seller.farmName}
                  </p>
                  <p>{seller.email}</p>
                  <p>Password: {seller.password}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



