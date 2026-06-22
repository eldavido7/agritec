import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";

const orderInclude = {
  addressSnapshot: true,
  refunds: true,
  payment: { include: { refunds: true } },
  sellerGroups: {
    include: {
      items: true,
      refunds: true,
      logisticsCompany: { include: { user: true } },
      statusHistory: {
        include: {
          updatedByUser: {
            select: { id: true, fullName: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    let orders;

    if (user.role === UserRole.BUYER && user.buyerProfile) {
      orders = await prisma.parentOrder.findMany({
        where: { buyerId: user.buyerProfile.id },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === UserRole.SELLER && user.sellerProfile) {
      orders = await prisma.parentOrder.findMany({
        where: { sellerGroups: { some: { sellerId: user.sellerProfile.id } } },
        include: {
          ...orderInclude,
          sellerGroups: {
            where: { sellerId: user.sellerProfile.id },
            include: {
              items: true,
              refunds: true,
              logisticsCompany: { include: { user: true } },
              statusHistory: {
                include: {
                  updatedByUser: {
                    select: { id: true, fullName: true, role: true },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      orders = await prisma.parentOrder.findMany({
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({
      success: true,
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error("[ORDERS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Order creation has moved to the checkout and payment routes and is not implemented on this legacy endpoint.",
    },
    { status: 501 },
  );
}
