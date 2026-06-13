import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { reserveSequentialId } from "@/lib/id-sequence";
import { serializeProduct } from "@/lib/marketplace-serializers";

const addCartItemSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).nullable().optional(),
  quantity: z.number().int().positive().default(1),
});

function buildLineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

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

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const buyerProfile = user.buyerProfile;
    const rawBody = await request.json();
    const payload = addCartItemSchema.parse(rawBody);
    const variantId = payload.variantId ?? null;
    const lineKey = buildLineKey(payload.productId, variantId);

    const product = await prisma.product.findUnique({
      where: { id: payload.productId },
      include: { variants: true, category: true, seller: true },
    });

    if (!product || product.isDeleted || product.status === "ARCHIVED") {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const selectedVariant = variantId ? product.variants.find((variant) => variant.id === variantId) ?? null : null;
    if (variantId && !selectedVariant) {
      return NextResponse.json({ success: false, message: "Product variant not found" }, { status: 404 });
    }

    const availableInventory = selectedVariant
      ? Math.max(0, selectedVariant.inventory - selectedVariant.reservedInventory)
      : Math.max(0, product.inventory - product.reservedInventory);

    if (payload.quantity > availableInventory) {
      return NextResponse.json(
        { success: false, message: "Requested quantity exceeds available inventory" },
        { status: 400 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_lineKey: {
            cartId: (await tx.cart.findUniqueOrThrow({ where: { buyerId: buyerProfile.id }, select: { id: true } })).id,
            lineKey,
          },
        },
      }).catch(() => null);

      const cart = existingItem
        ? { id: existingItem.cartId }
        : await tx.cart.findUniqueOrThrow({ where: { buyerId: buyerProfile.id }, select: { id: true } });

      if (existingItem) {
        const newQuantity = existingItem.quantity + payload.quantity;
        if (newQuantity > availableInventory) {
          throw new Error("INSUFFICIENT_INVENTORY");
        }

        return tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: {
            product: { include: { category: true, seller: true, variants: true } },
            variant: true,
          },
        });
      }

      const cartItemId = await reserveSequentialId(tx, "cart_item");
      return tx.cartItem.create({
        data: {
          id: cartItemId,
          cartId: cart.id,
          productId: payload.productId,
          variantId,
          lineKey,
          quantity: payload.quantity,
        },
        include: {
          product: { include: { category: true, seller: true, variants: true } },
          variant: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      cartItem: serializeCartItem(item),
      message: "Item added to cart",
    }, { status: 201 });
  } catch (error) {
    console.error("[CART_ITEM_POST_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid cart item payload" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INSUFFICIENT_INVENTORY") {
      return NextResponse.json(
        { success: false, message: "Requested quantity exceeds available inventory" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: "Failed to add item to cart" }, { status: 500 });
  }
}
