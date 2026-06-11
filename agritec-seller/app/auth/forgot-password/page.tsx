"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowRight, Mail, CheckCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useSellerAuthStore } from "@/stores/seller-auth-store";

export default function ForgotPasswordPage() {
  const { isLoading, error, requestPasswordReset, clearError } =
    useSellerAuthStore();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    clearError();

    if (!email.trim()) {
      setFormError("Email is required");
      return;
    }

    if (!email.includes("@")) {
      setFormError("Invalid email address");
      return;
    }

    try {
      const message = await requestPasswordReset(email);
      console.log("[Seller Forgot Password Page] Request success", {
        email: email.trim().toLowerCase(),
      });
      toast.success(message);
      setSubmittedEmail(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (requestError) {
      console.error("[Seller Forgot Password Page] Request failed", requestError);
      toast.error(error || "Unable to send reset email");
      setFormError(error || "Unable to send reset email");
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
          {!submitted ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Reset Password
              </h1>
              <p className="text-muted-foreground mb-8">
                Enter your registered email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formError || error) {
                        setFormError("");
                        clearError();
                      }
                    }}
                    placeholder="kingsley@farm.com"
                    className={formError || error ? "border-destructive" : ""}
                  />
                  {(formError || error) && (
                    <p className="text-xs text-destructive mt-1">
                      {formError || error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6"
                >
                  {isLoading ? "Sending Link..." : "Send Reset Link"}
                  <Mail className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <p className="text-center text-muted-foreground mt-6">
                Remember your password?{" "}
                <Link
                  href="/auth/signin"
                  className="text-primary hover:underline font-medium"
                >
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Check Your Email
                </h2>
                <p className="text-muted-foreground mb-6">
                  If an account exists for{" "}
                  <span className="font-semibold text-foreground">
                    {submittedEmail}
                  </span>
                  , a reset link has been sent.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  The reset link expires in 1 hour.
                </p>

                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedEmail("");
                    setEmail("");
                  }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

