import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

function getResetPasswordUrl(token: string) {
  const baseUrl =
    process.env.SELLER_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000";
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 },
      );
    }

    const resetToken = await createPasswordResetToken(email);

    if (resetToken) {
      const resetUrl = getResetPasswordUrl(resetToken.token);
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
      console.log("[FORGOT_PASSWORD] No active user found for email", { email });
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
