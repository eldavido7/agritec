import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
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
        seller: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, phone: true, isActive: true },
            },
          },
        },
        parentOrder: {
          include: {
            addressSnapshot: true,
            payment: { include: { refunds: true } },
            refunds: true,
            buyer: { include: { user: { select: { id: true, fullName: true, email: true, phone: true } } } },
          },
        },
      },
    });

    if (!group || group.logisticsCompanyId !== user.logisticsProfile.id) {
      return NextResponse.json({ success: false, message: "Delivery not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      delivery: {
        ...group,
        parentOrder: serializeOrder(group.parentOrder),
      },
    });
  } catch (error) {
    console.error("[LOGISTICS_DELIVERY_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch logistics delivery" },
      { status: 500 }
    );
  }
}
