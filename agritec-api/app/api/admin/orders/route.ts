import { ParentOrderStatus, PaymentStatus, Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { serializeOrder } from "@/lib/marketplace-serializers";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnumFilter<T extends string>(value: string | null, allowed: readonly T[]) {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
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
    const buyerId = searchParams.get("buyerId")?.trim() || undefined;
    const sellerId = searchParams.get("sellerId")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const status = parseEnumFilter(searchParams.get("status"), Object.values(ParentOrderStatus));
    const paymentStatus = parseEnumFilter(searchParams.get("paymentStatus"), Object.values(PaymentStatus));

    const where: Prisma.ParentOrderWhereInput = {
      ...(buyerId ? { buyerId } : {}),
      ...(sellerId ? { sellerGroups: { some: { sellerId } } } : {}),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" } },
              { buyerNameSnapshot: { contains: search, mode: "insensitive" } },
              { buyerEmailSnapshot: { contains: search, mode: "insensitive" } },
              { sellerGroups: { some: { sellerNameSnapshot: { contains: search, mode: "insensitive" } } } },
              { sellerGroups: { some: { farmNameSnapshot: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.parentOrder.count({ where }),
      prisma.parentOrder.findMany({
        where,
        include: {
          addressSnapshot: true,
          refunds: true,
          payment: { include: { refunds: true } },
          sellerGroups: {
            include: {
              items: true,
              refunds: true,
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
      orders: orders.map(serializeOrder),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_ORDERS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch orders" }, { status: 500 });
  }
}
