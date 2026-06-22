import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const group = await prisma.sellerOrderGroup.findUnique({
      where: { id },
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
        seller: { include: { user: true } },
        parentOrder: {
          include: {
            addressSnapshot: true,
            payment: true,
          },
        },
      },
    });

    if (!group || group.sellerId !== user.sellerProfile.id) {
      return NextResponse.json({ success: false, message: "Order group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, sellerOrderGroup: group });
  } catch (error) {
    console.error("[SELLER_ORDER_GROUP_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller order group" }, { status: 500 });
  }
}
