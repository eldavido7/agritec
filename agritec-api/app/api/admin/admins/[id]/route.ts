import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/wallet-utils";

const patchSchema = z.object({
  email: z.string().trim().email().optional(),
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = patchSchema.parse(await request.json());

    const adminUser = await prisma.user.findFirst({ where: { id, role: UserRole.ADMIN } });
    if (!adminUser) {
      return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(payload.email !== undefined ? { email: normalizeEmail(payload.email) } : {}),
          ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
          ...(payload.password !== undefined ? { passwordHash: await bcrypt.hash(payload.password, 12) } : {}),
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
        adminId: actor.id,
        action: "admin.update",
        targetType: "user",
        targetId: user.id,
        metadata: JSON.parse(JSON.stringify({ changedFields: Object.keys(payload) })) as Prisma.InputJsonValue,
      });

      return user;
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (error: any) {
    console.error("[ADMIN_ADMIN_PATCH_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid admin payload" }, { status: 400 });
    }
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to update admin" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (actor.id === id) {
      return NextResponse.json({ success: false, message: "You cannot deactivate your own admin account." }, { status: 400 });
    }

    const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });
    if (adminCount <= 1) {
      return NextResponse.json({ success: false, message: "At least one active admin account must remain." }, { status: 400 });
    }

    const adminUser = await prisma.user.findFirst({ where: { id, role: UserRole.ADMIN } });
    if (!adminUser) {
      return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog(tx, {
        adminId: actor.id,
        action: "admin.deactivate",
        targetType: "user",
        targetId: id,
        metadata: JSON.parse(JSON.stringify({ email: adminUser.email })) as Prisma.InputJsonValue,
      });
    });

    return NextResponse.json({ success: true, message: "Admin deactivated successfully" });
  } catch (error) {
    console.error("[ADMIN_ADMIN_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to deactivate admin" }, { status: 500 });
  }
}
