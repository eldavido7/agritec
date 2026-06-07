import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, requireAuthenticatedUser } from "@/lib/auth";
import { reserveSequentialId } from "@/lib/id-sequence";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/wallet-utils";

const createAdminSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        emailVerifiedAt: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, admins });
  } catch (error) {
    console.error("[ADMIN_ADMINS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch admins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = createAdminSchema.parse(await request.json());
    const email = normalizeEmail(payload.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const createdAdmin = await prisma.$transaction(async (tx) => {
      const id = await reserveSequentialId(tx, "user");
      const user = await tx.user.create({
        data: {
          id,
          email,
          passwordHash,
          fullName: payload.fullName?.trim() || email,
          role: UserRole.ADMIN,
          phone: payload.phone?.trim() || null,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          emailVerifiedAt: true,
          lastActiveAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await createAuditLog(tx, {
        adminId: admin.id,
        action: "admin.create",
        targetType: "user",
        targetId: user.id,
        metadata: JSON.parse(JSON.stringify({ email: user.email })) as Prisma.InputJsonValue,
      });

      return user;
    });

    return NextResponse.json({ success: true, admin: createdAdmin }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_ADMINS_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid admin payload" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create admin" }, { status: 500 });
  }
}
