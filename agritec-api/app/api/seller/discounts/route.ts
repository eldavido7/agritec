import { NextRequest, NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { broadcastDiscountCreated } from "@/lib/discount-alerts";
import {
  buildDiscountCreateInput,
  parseSellerDiscountPayload,
  serializeDiscount,
} from "@/lib/seller-discount-utils";
import { reserveSequentialId } from "@/lib/id-sequence";
import { ZodError } from "zod";

async function attachDiscountTargets(discounts: any[]) {
  const productIds = [...new Set(discounts.flatMap((discount) => discount.productIds ?? []))];
  const variantIds = [...new Set(discounts.flatMap((discount) => discount.variantIds ?? []))];

  const [products, variants] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, sellerId: true, isDeleted: true, status: true },
        })
      : Promise.resolve([]),
    variantIds.length
      ? prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, name: true, productId: true },
        })
      : Promise.resolve([]),
  ]);

  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  return discounts.map((discount) => ({
    ...serializeDiscount(discount),
    products: (discount.productIds ?? []).map((id: string) => productsById.get(id)).filter(Boolean),
    variants: (discount.variantIds ?? []).map((id: string) => variantsById.get(id)).filter(Boolean),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const code = searchParams.get("code")?.trim().toUpperCase();

    const discounts = await prisma.discount.findMany({
      where: {
        sellerId: sellerProfile.id,
        ...(includeInactive ? {} : { isActive: true }),
        ...(code ? { code } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, discounts: await attachDiscountTargets(discounts) });
  } catch (error) {
    console.error("[SELLER_DISCOUNTS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller discounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const rawBody = await request.json();
    const payload = await parseSellerDiscountPayload(rawBody, sellerProfile.id);

    const created = await prisma.$transaction(async (tx) => {
      const discountId = await reserveSequentialId(tx, "discount");
      return tx.discount.create({
        data: buildDiscountCreateInput(sellerProfile.id, payload, discountId),
      });
    });

    await broadcastDiscountCreated({
      discountId: created.id,
      sellerId: sellerProfile.id,
      sellerName: user.fullName,
      farmName: sellerProfile.farmName,
      code: created.code,
      description: created.description,
    });

    const [discount] = await attachDiscountTargets([created]);
    return NextResponse.json({ success: true, discount }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid discount payload" },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Discount code already exists for this seller" },
        { status: 409 }
      );
    }

    if (error instanceof Error) {
      const messageMap: Record<string, string> = {
        INVALID_START_DATE: "Invalid start date",
        INVALID_END_DATE: "Invalid end date",
        INVALID_DATE_RANGE: "End date cannot be earlier than start date",
        INVALID_PRODUCT_TARGETS: "One or more target products do not belong to this seller",
        INVALID_VARIANT_TARGETS: "One or more target variants do not belong to this seller",
      };

      if (messageMap[error.message]) {
        return NextResponse.json({ success: false, message: messageMap[error.message] }, { status: 400 });
      }
    }

    console.error("[SELLER_DISCOUNTS_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to create discount" }, { status: 500 });
  }
}
