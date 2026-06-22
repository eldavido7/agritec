import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.sellerOrderGroup.findMany({
      where: { logisticsCompanyId: user.logisticsProfile.id },
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
        parentOrder: {
          include: {
            addressSnapshot: true,
            payment: { include: { refunds: true } },
            refunds: true,
          },
        },
        seller: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, phone: true, isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      deliveries: groups.map((group) => ({
        ...group,
        parentOrder: serializeOrder(group.parentOrder),
      })),
    });
  } catch (error) {
    console.error("[LOGISTICS_DELIVERIES_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch logistics deliveries" },
      { status: 500 }
    );
  }
}
