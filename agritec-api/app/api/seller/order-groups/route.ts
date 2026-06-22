import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";

function sanitizeSellerOrderGroup(group: any) {
  const serialized = serializeOrder({
    sellerGroups: [group],
  }).sellerGroups[0];

  return {
    ...serialized,
    parentOrder: group.parentOrder
      ? {
          id: group.parentOrder.id,
          buyerId: group.parentOrder.buyerId,
          buyerNameSnapshot: group.parentOrder.buyerNameSnapshot,
          status: group.parentOrder.status,
          paymentReference: group.parentOrder.paymentReference,
          productSubtotal: group.parentOrder.productSubtotal,
          totalShippingFee: group.parentOrder.totalShippingFee,
          discountTotal: group.parentOrder.discountTotal,
          grandTotal: group.parentOrder.grandTotal,
          createdAt: group.parentOrder.createdAt,
          updatedAt: group.parentOrder.updatedAt,
          addressSnapshot: group.parentOrder.addressSnapshot,
          payment: group.parentOrder.payment,
        }
      : null,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.sellerOrderGroup.findMany({
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
        parentOrder: {
          include: {
            addressSnapshot: true,
            payment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      sellerOrderGroups: groups.map(sanitizeSellerOrderGroup),
    });
  } catch (error) {
    console.error("[SELLER_ORDER_GROUPS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller order groups" }, { status: 500 });
  }
}
