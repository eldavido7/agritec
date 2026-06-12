import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

function resolveRole(input: unknown) {
  if (!input || typeof input !== "string") {
    return undefined;
  }

  const normalizedRole = input.toUpperCase();
  return Object.values(UserRole).includes(normalizedRole as UserRole)
    ? (normalizedRole as UserRole)
    : undefined;
}

function getResetPasswordUrl(role?: UserRole) {
  const buyerBaseUrl = process.env.BUYER_APP_URL?.trim();
  const sellerBaseUrl =
    process.env.SELLER_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000";

  const baseUrl = role === UserRole.BUYER ? buyerBaseUrl || sellerBaseUrl : sellerBaseUrl;
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}/auth/reset-password`;
}

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 },
      );
    }

    const resolvedRole = resolveRole(role);
    if (role && !resolvedRole) {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 },
      );
    }

    const resetToken = await createPasswordResetToken(email, resolvedRole);

    if (resetToken) {
      const resetUrl = `${getResetPasswordUrl(resolvedRole)}?token=${encodeURIComponent(resetToken.token)}`;
      await sendPasswordResetEmail({
        toEmail: resetToken.email,
        fullName: resetToken.fullName,
        role: resetToken.role,
        resetUrl,
        expiresInHours: 1,
      });
      console.log("[FORGOT_PASSWORD] Reset email sent", {
        userId: resetToken.userId,
        email: resetToken.email,
        role: resetToken.role,
      });
    } else {
      console.log("[FORGOT_PASSWORD] No active user found for email and role", {
        email,
        role: resolvedRole ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "If that email exists in our system, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
