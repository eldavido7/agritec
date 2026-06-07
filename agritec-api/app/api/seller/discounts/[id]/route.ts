import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  buildDiscountUpdateInput,
  parseSellerDiscountPayload,
  serializeDiscount,
} from "@/lib/seller-discount-utils";
import { ZodError } from "zod";

async function getSellerOwnedDiscount(discountId: string, sellerId: string) {
  return prisma.discount.findFirst({
    where: {
      id: discountId,
      sellerId,
    },
  });
}

async function attachDiscountTargets(discount: any) {
  const [products, variants] = await Promise.all([
    discount.productIds?.length
      ? prisma.product.findMany({
          where: { id: { in: discount.productIds } },
          select: { id: true, title: true, sellerId: true, isDeleted: true, status: true },
        })
      : Promise.resolve([]),
    discount.variantIds?.length
      ? prisma.productVariant.findMany({
          where: { id: { in: discount.variantIds } },
          select: { id: true, name: true, productId: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    ...serializeDiscount(discount),
    products,
    variants,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const discount = await getSellerOwnedDiscount(id, user.sellerProfile.id);

    if (!discount) {
      return NextResponse.json(
        { success: false, message: "Discount not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: await attachDiscountTargets(discount),
    });
  } catch (error) {
    console.error("[SELLER_DISCOUNT_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch seller discount" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existingDiscount = await getSellerOwnedDiscount(id, user.sellerProfile.id);

    if (!existingDiscount) {
      return NextResponse.json(
        { success: false, message: "Discount not found" },
        { status: 404 }
      );
    }

    const rawBody = await request.json();
    const payload = await parseSellerDiscountPayload(rawBody, user.sellerProfile.id);

    const updated = await prisma.discount.update({
      where: { id },
      data: buildDiscountUpdateInput(payload),
    });

    return NextResponse.json({
      success: true,
      discount: await attachDiscountTargets(updated),
    });
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
        return NextResponse.json(
          { success: false, message: messageMap[error.message] },
          { status: 400 }
        );
      }
    }

    console.error("[SELLER_DISCOUNT_PATCH_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to update discount" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const discount = await getSellerOwnedDiscount(id, user.sellerProfile.id);

    if (!discount) {
      return NextResponse.json(
        { success: false, message: "Discount not found" },
        { status: 404 }
      );
    }

    await prisma.discount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SELLER_DISCOUNT_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete discount" },
      { status: 500 }
    );
  }
}
