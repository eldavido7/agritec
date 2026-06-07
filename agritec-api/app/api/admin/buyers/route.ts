import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanFilter(value: string | null) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function serializeBuyerListItem(buyer: any) {
  return {
    id: buyer.id,
    userId: buyer.userId,
    fullName: buyer.user.fullName,
    email: buyer.user.email,
    phone: buyer.user.phone,
    isActive: buyer.user.isActive,
    emailVerifiedAt: buyer.user.emailVerifiedAt,
    lastActiveAt: buyer.user.lastActiveAt,
    createdAt: buyer.createdAt,
    updatedAt: buyer.updatedAt,
    addressCount: buyer._count.addresses,
    wishlistCount: buyer._count.wishlistItems,
    orderCount: buyer._count.orders,
    cartItemCount: buyer.cart?._count?.items ?? 0,
  };
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
    const search = searchParams.get("search")?.trim() ?? "";
    const isActive = parseBooleanFilter(searchParams.get("isActive"));

    const where: Prisma.BuyerProfileWhereInput = {
      user: {
        role: UserRole.BUYER,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    };

    const [total, buyers] = await Promise.all([
      prisma.buyerProfile.count({ where }),
      prisma.buyerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              isActive: true,
              emailVerifiedAt: true,
              lastActiveAt: true,
            },
          },
          cart: {
            select: {
              _count: { select: { items: true } },
            },
          },
          _count: {
            select: {
              addresses: true,
              wishlistItems: true,
              orders: true,
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
      buyers: buyers.map(serializeBuyerListItem),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_BUYERS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch buyers" }, { status: 500 });
  }
}
