import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeProduct } from "@/lib/marketplace-serializers";

function serializeCartItem(item: any) {
  return {
    id: item.id,
    lineKey: item.lineKey,
    quantity: item.quantity,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    product: serializeProduct(item.product),
    variant: item.variant
      ? {
          ...item.variant,
          unitWeightKg: item.variant.unitWeightKg ? Number(item.variant.unitWeightKg) : null,
          unitLengthCm: item.variant.unitLengthCm ? Number(item.variant.unitLengthCm) : null,
          unitWidthCm: item.variant.unitWidthCm ? Number(item.variant.unitWidthCm) : null,
          unitHeightCm: item.variant.unitHeightCm ? Number(item.variant.unitHeightCm) : null,
        }
      : null,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const cart = await prisma.cart.findUnique({
      where: { buyerId: user.buyerProfile.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                seller: true,
                variants: true,
              },
            },
            variant: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ success: false, message: "Cart not found" }, { status: 404 });
    }

    const items = cart.items.filter((item) => !item.product.isDeleted && item.product.status !== "ARCHIVED");

    return NextResponse.json({
      success: true,
      cart: {
        id: cart.id,
        buyerId: cart.buyerId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        items: items.map(serializeCartItem),
      },
    });
  } catch (error) {
    console.error("[CART_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch cart" }, { status: 500 });
  }
}
