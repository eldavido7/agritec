import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = changePasswordSchema.parse(await request.json());

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const currentPasswordMatches = await bcrypt.compare(
      payload.currentPassword,
      account.passwordHash,
    );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 },
      );
    }

    const nextPasswordHash = await bcrypt.hash(payload.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: nextPasswordHash,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("[AUTH_CHANGE_PASSWORD_POST_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message ?? "Invalid password payload",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update password" },
      { status: 500 },
    );
  }
}
