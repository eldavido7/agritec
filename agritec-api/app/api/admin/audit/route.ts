import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 10), 50);
    const search = searchParams.get("search")?.trim() || undefined;
    const action = searchParams.get("action")?.trim() || undefined;
    const targetType = searchParams.get("targetType")?.trim() || undefined;
    const adminId = searchParams.get("adminId")?.trim() || undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined;

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      ...(targetType ? { targetType } : {}),
      ...(adminId ? { adminId } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: "insensitive" } },
              { targetType: { contains: search, mode: "insensitive" } },
              { targetId: { contains: search, mode: "insensitive" } },
              { admin: { fullName: { contains: search, mode: "insensitive" } } },
              { admin: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_AUDIT_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch audit logs" }, { status: 500 });
  }
}
