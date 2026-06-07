import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { reserveSequentialId } from "@/lib/id-sequence";

function buildWishlistLineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const buyerProfile = user.buyerProfile;
    const { productId } = await params;
    const body = await request.json().catch(() => ({}));
    const variantId = typeof body.variantId === "string" ? body.variantId : null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    if (variantId && !product.variants.some((variant) => variant.id === variantId)) {
      return NextResponse.json({ success: false, message: "Product variant not found" }, { status: 404 });
    }

    const lineKey = buildWishlistLineKey(productId, variantId);
    const existingWishlistItem = await prisma.wishlistItem.findUnique({
      where: { buyerId_lineKey: { buyerId: buyerProfile.id, lineKey } },
    });

    if (existingWishlistItem) {
      return NextResponse.json({ success: false, message: "Item already in wishlist" }, { status: 409 });
    }

    const wishlistItem = await prisma.$transaction(async (tx) => {
      const wishlistItemId = await reserveSequentialId(tx, "wishlist_item");
      return tx.wishlistItem.create({
        data: {
          id: wishlistItemId,
          buyerId: buyerProfile.id,
          productId,
          variantId,
          lineKey,
        },
        include: {
          product: {
            include: {
              variants: true,
              seller: { select: { id: true, farmName: true } },
            },
          },
          variant: true,
        },
      });
    });

    return NextResponse.json({ success: true, wishlistItem, message: "Item added to wishlist" }, { status: 201 });
  } catch (error) {
    console.error("[WISHLIST_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const buyerProfile = user.buyerProfile;
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");
    const lineKey = buildWishlistLineKey(productId, variantId);

    const wishlistItem = await prisma.wishlistItem.findUnique({
      where: { buyerId_lineKey: { buyerId: buyerProfile.id, lineKey } },
    });

    if (!wishlistItem) {
      return NextResponse.json({ success: false, message: "Item not found in wishlist" }, { status: 404 });
    }

    await prisma.wishlistItem.delete({ where: { id: wishlistItem.id } });
    return NextResponse.json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    console.error("[WISHLIST_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
