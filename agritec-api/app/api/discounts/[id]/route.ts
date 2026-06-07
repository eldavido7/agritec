import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function isDiscountCurrentlyActive(discount: { startsAt: Date; endsAt: Date | null; isActive: boolean }) {
  const now = new Date();
  return discount.isActive && discount.startsAt <= now && (!discount.endsAt || discount.endsAt >= now);
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            farmName: true,
          },
        },
      },
    });

    if (!discount) {
      return NextResponse.json(
        { success: false, message: "Discount not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: {
        ...discount,
        currentlyActive: isDiscountCurrentlyActive(discount),
      },
    });
  } catch (error) {
    console.error("[DISCOUNT_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch discount" },
      { status: 500 }
    );
  }
}
