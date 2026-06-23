import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeProduct } from "@/lib/marketplace-serializers";
import {
  ensureSellerHasCompleteLocation,
  sellerLocationIncompleteErrorResponseMessage,
} from "@/lib/seller-location-utils";
import { buildProductCreateInput, parseSellerProductPayload } from "@/lib/seller-product-utils";
import { reserveSequentialId, reserveSequentialIds } from "@/lib/id-sequence";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
    const status = searchParams.get("status")?.trim().toUpperCase();
    const search = searchParams.get("search")?.trim();
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const where = {
      sellerId: sellerProfile.id,
      ...(includeDeleted ? {} : { isDeleted: false }),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map(serializeProduct),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[SELLER_PRODUCTS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    ensureSellerHasCompleteLocation(sellerProfile);
    const rawBody = await request.json();
    const payload = await parseSellerProductPayload(rawBody);

    const created = await prisma.$transaction(async (tx) => {
      const productId = await reserveSequentialId(tx, "product");
      const variantIds = payload.variants.length
        ? await reserveSequentialIds(tx, "product_variant", payload.variants.length)
        : [];

      return tx.product.create({
        data: buildProductCreateInput(sellerProfile.id, payload, { productId, variantIds }),
        include: { category: true, variants: true },
      });
    });

    return NextResponse.json({ success: true, product: serializeProduct(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid product payload" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return NextResponse.json({ success: false, message: "Invalid category" }, { status: 400 });
    }
    const locationMessage = sellerLocationIncompleteErrorResponseMessage(error);
    if (locationMessage) {
      return NextResponse.json({ success: false, message: locationMessage }, { status: 400 });
    }

    console.error("[SELLER_PRODUCTS_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to create product" }, { status: 500 });
  }
}
