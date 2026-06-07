import { DiscountType, Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";

const discountTypeEnum = z.nativeEnum(DiscountType);
const numericString = z.union([z.number(), z.string().trim().min(1)]).transform((value) => Number(value));

const discountSchema = z.object({
  code: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  description: z.string().trim().min(1).nullable().optional(),
  type: discountTypeEnum,
  value: numericString.refine((value) => Number.isInteger(value) && value >= 0, "Discount value must be a non-negative integer"),
  usageLimit: z.union([z.number().int().positive(), z.null(), z.undefined()]).optional().transform((value) => value ?? null),
  startsAt: z.union([z.string().trim().min(1), z.date()]).transform((value) => new Date(value)),
  endsAt: z.union([z.string().trim().min(1), z.date(), z.null(), z.undefined()]).transform((value) => value == null ? null : new Date(value)),
  isActive: z.boolean().optional().default(true),
  productIds: z.array(z.string().trim().min(1)).optional().default([]),
  variantIds: z.array(z.string().trim().min(1)).optional().default([]),
});

export type SellerDiscountPayload = z.infer<typeof discountSchema>;

export function isDiscountCurrentlyActive(discount: { startsAt: Date; endsAt: Date | null; isActive: boolean }) {
  const now = new Date();
  return discount.isActive && discount.startsAt <= now && (!discount.endsAt || discount.endsAt >= now);
}

export function serializeDiscount(discount: any) {
  return {
    ...discount,
    currentlyActive: isDiscountCurrentlyActive(discount),
  };
}

export async function parseSellerDiscountPayload(raw: unknown, sellerId: string) {
  const payload = discountSchema.parse(raw);

  if (Number.isNaN(payload.startsAt.getTime())) {
    throw new Error("INVALID_START_DATE");
  }

  if (payload.endsAt && Number.isNaN(payload.endsAt.getTime())) {
    throw new Error("INVALID_END_DATE");
  }

  if (payload.endsAt && payload.endsAt < payload.startsAt) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const productIds = [...new Set(payload.productIds)];
  const variantIds = [...new Set(payload.variantIds)];

  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      throw new Error("INVALID_PRODUCT_TARGETS");
    }
  }

  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        product: {
          sellerId,
          isDeleted: false,
        },
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (variants.length !== variantIds.length) {
      throw new Error("INVALID_VARIANT_TARGETS");
    }
  }

  return {
    ...payload,
    productIds,
    variantIds,
  };
}

export function buildDiscountCreateInput(
  sellerId: string,
  payload: SellerDiscountPayload,
  discountId: string
): Prisma.DiscountCreateInput {
  return {
    id: discountId,
    seller: { connect: { id: sellerId } },
    code: payload.code,
    description: payload.description ?? null,
    type: payload.type,
    value: payload.value,
    usageLimit: payload.usageLimit,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    isActive: payload.isActive,
    productIds: payload.productIds,
    variantIds: payload.variantIds,
  };
}

export function buildDiscountUpdateInput(payload: SellerDiscountPayload): Prisma.DiscountUpdateInput {
  return {
    code: payload.code,
    description: payload.description ?? null,
    type: payload.type,
    value: payload.value,
    usageLimit: payload.usageLimit,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    isActive: payload.isActive,
    productIds: payload.productIds,
    variantIds: payload.variantIds,
  };
}
