import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeProduct } from "@/lib/marketplace-serializers";

const updateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative(),
});

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

async function getOwnedCartItem(itemId: string, buyerId: string) {
  return prisma.cartItem.findFirst({
    where: { id: itemId, cart: { buyerId } },
    include: {
      product: { include: { category: true, seller: true, variants: true } },
      variant: true,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rawBody = await request.json();
    const payload = updateCartItemSchema.parse(rawBody);
    const item = await getOwnedCartItem(id, user.buyerProfile.id);

    if (!item) {
      return NextResponse.json({ success: false, message: "Cart item not found" }, { status: 404 });
    }

    if (payload.quantity === 0) {
      await prisma.cartItem.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Item removed from cart" });
    }

    const availableInventory = item.variant
      ? Math.max(0, item.variant.inventory - item.variant.reservedInventory)
      : Math.max(0, item.product.inventory - item.product.reservedInventory);

    if (payload.quantity > availableInventory) {
      return NextResponse.json(
        { success: false, message: "Requested quantity exceeds available inventory" },
        { status: 400 }
      );
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: payload.quantity },
      include: {
        product: { include: { category: true, seller: true, variants: true } },
        variant: true,
      },
    });

    return NextResponse.json({ success: true, cartItem: serializeCartItem(updated) });
  } catch (error) {
    console.error("[CART_ITEM_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid cart item payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: "Failed to update cart item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const item = await getOwnedCartItem(id, user.buyerProfile.id);

    if (!item) {
      return NextResponse.json({ success: false, message: "Cart item not found" }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    console.error("[CART_ITEM_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to remove cart item" }, { status: 500 });
  }
}
