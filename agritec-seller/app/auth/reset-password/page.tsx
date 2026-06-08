"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, CheckCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const { isLoading, error, resetPassword, clearError } = useSellerAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    clearError();

    if (!token) {
      setFormError("Reset link is missing or invalid");
      return;
    }

    if (!password) {
      setFormError("Password is required");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    try {
      const message = await resetPassword(token, password);
      console.log("[Seller Reset Password Page] Reset success");
      toast.success(message);
      setCompleted(true);
    } catch (resetError) {
      console.error("[Seller Reset Password Page] Reset failed", resetError);
      toast.error(error || "Unable to reset password");
      setFormError(error || "Unable to reset password");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
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
          {!completed ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Set New Password
              </h1>
              <p className="text-muted-foreground mb-8">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formError || error) {
                          setFormError("");
                          clearError();
                        }
                      }}
                      placeholder="********"
                      className={formError || error ? "border-destructive" : ""}
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (formError || error) {
                          setFormError("");
                          clearError();
                        }
                      }}
                      placeholder="********"
                      className={formError || error ? "border-destructive" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {(formError || error) && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError || error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6"
                >
                  {isLoading ? "Updating Password..." : "Reset Password"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Password Updated
              </h2>
              <p className="text-muted-foreground mb-8">
                Your password has been reset successfully. You can now sign in.
              </p>
              <Button
                onClick={() => router.push("/auth/signin")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Back to Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {!completed && (
            <p className="text-center text-muted-foreground mt-6">
              Need another reset link?{" "}
              <Link
                href="/auth/forgot-password"
                className="text-primary hover:underline font-medium"
              >
                Request one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
          Loading reset link...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
