import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function isDiscountCurrentlyActive(discount: { startsAt: Date; endsAt: Date | null; isActive: boolean }) {
  const now = new Date();
  return discount.isActive && discount.startsAt <= now && (!discount.endsAt || discount.endsAt >= now);
}

function serializeDiscount(discount: any) {
  return {
    ...discount,
    currentlyActive: isDiscountCurrentlyActive(discount),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const productId = searchParams.get("productId");
    const variantId = searchParams.get("variantId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const discounts = await prisma.discount.findMany({
      where: {
        ...(sellerId ? { sellerId } : {}),
        ...(productId ? { productIds: { has: productId } } : {}),
        ...(variantId ? { variantIds: { has: variantId } } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        seller: {
          select: {
            id: true,
            farmName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = includeInactive
      ? discounts
      : discounts.filter(isDiscountCurrentlyActive);

    return NextResponse.json({
      success: true,
      discounts: filtered.map(serializeDiscount),
    });
  } catch (error) {
    console.error("[DISCOUNTS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}
