import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

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
        parentOrder: {
          include: {
            addressSnapshot: true,
            payment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, sellerOrderGroups: groups });
  } catch (error) {
    console.error("[SELLER_ORDER_GROUPS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller order groups" }, { status: 500 });
  }
}
