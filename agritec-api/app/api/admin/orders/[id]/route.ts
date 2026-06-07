import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { serializeOrder } from "@/lib/marketplace-serializers";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const order = await prisma.parentOrder.findUnique({
      where: { id },
      include: {
        addressSnapshot: true,
        payment: true,
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                isActive: true,
                lastActiveAt: true,
              },
            },
          },
        },
        sellerGroups: {
          include: {
            items: true,
            seller: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: serializeOrder(order),
      buyer: order.buyer
        ? {
            id: order.buyer.id,
            userId: order.buyer.userId,
            fullName: order.buyer.user.fullName,
            email: order.buyer.user.email,
            phone: order.buyer.user.phone,
            isActive: order.buyer.user.isActive,
            lastActiveAt: order.buyer.user.lastActiveAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[ADMIN_ORDER_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch order" }, { status: 500 });
  }
}
