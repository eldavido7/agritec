import { PackageType, Prisma, ProductStatus, SalesUnit } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";

const salesUnitEnum = z.nativeEnum(SalesUnit);
const packageTypeEnum = z.nativeEnum(PackageType);
const productStatusEnum = z.nativeEnum(ProductStatus);

const numericString = z.union([z.number(), z.string().trim().min(1)]).transform((value) => Number(value));
const nullableNumericString = z
  .union([z.number(), z.string().trim().min(1), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });
const optionalTrimmedText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const imageInputSchema = z.union([
  z.string().trim().min(1).transform((secureUrl) => ({
    secureUrl,
    publicId: null,
    altText: null,
    displayOrder: 0,
  })),
  z
    .object({
      secureUrl: z.string().trim().min(1),
      publicId: z.string().trim().min(1).nullable().optional(),
      altText: z.string().trim().min(1).nullable().optional(),
      displayOrder: z.number().int().nonnegative().optional(),
    })
    .transform((value) => ({
      secureUrl: value.secureUrl,
      publicId: value.publicId ?? null,
      altText: value.altText ?? null,
      displayOrder: value.displayOrder ?? 0,
    })),
]);

const variantSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1),
  price: numericString.refine((value) => Number.isInteger(value) && value >= 0, "Variant price must be a non-negative integer"),
  inventory: numericString.refine((value) => Number.isInteger(value) && value >= 0, "Variant inventory must be a non-negative integer"),
  salesUnit: salesUnitEnum.nullable().optional(),
  packageType: packageTypeEnum.nullable().optional(),
  unitWeightKg: nullableNumericString,
  unitLengthCm: nullableNumericString,
  unitWidthCm: nullableNumericString,
  unitHeightCm: nullableNumericString,
});

const productSchema = z.object({
  title: z.string().trim().min(1),
  description: optionalTrimmedText,
  status: productStatusEnum.optional().default(ProductStatus.ACTIVE),
  categorySlug: z.string().trim().min(1),
  categoryNote: z.string().trim().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  basePrice: numericString.refine((value) => Number.isInteger(value) && value >= 0, "Base price must be a non-negative integer"),
  inventory: numericString.refine((value) => Number.isInteger(value) && value >= 0, "Inventory must be a non-negative integer"),
  hasVariants: z.boolean().optional(),
  images: z.array(imageInputSchema).max(4).optional().default([]),
  salesUnit: salesUnitEnum,
  packageType: packageTypeEnum,
  unitWeightKg: numericString.refine((value) => Number.isFinite(value) && value > 0, "Unit weight must be greater than 0"),
  unitLengthCm: nullableNumericString,
  unitWidthCm: nullableNumericString,
  unitHeightCm: nullableNumericString,
  variants: z.array(variantSchema).optional().default([]),
});

export type SellerProductPayload = z.infer<typeof productSchema>;

type ProductCreateIds = {
  productId: string;
  variantIds: string[];
};

type ProductUpdateIds = {
  variantIds: string[];
};

function toDecimal(value: number | null | undefined) {
  return value == null ? null : new Prisma.Decimal(value);
}

function toRequiredDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function normalizeOptionalDimensions(payload: {
  unitLengthCm: number | null;
  unitWidthCm: number | null;
  unitHeightCm: number | null;
}) {
  return {
    unitLengthCm: payload.unitLengthCm && payload.unitLengthCm > 0 ? payload.unitLengthCm : null,
    unitWidthCm: payload.unitWidthCm && payload.unitWidthCm > 0 ? payload.unitWidthCm : null,
    unitHeightCm: payload.unitHeightCm && payload.unitHeightCm > 0 ? payload.unitHeightCm : null,
  };
}

function mapVariantCreates(
  variants: SellerProductPayload["variants"],
  generatedVariantIds: string[]
) {
  let generatedIndex = 0;

  return variants.map((variant) => {
    const variantDimensions = normalizeOptionalDimensions(variant);
    const resolvedId = variant.id?.trim() || generatedVariantIds[generatedIndex++];

    if (!resolvedId) {
      throw new Error("MISSING_VARIANT_ID");
    }

    return {
      id: resolvedId,
      sku: variant.sku ?? null,
      name: variant.name,
      price: variant.price,
      inventory: variant.inventory,
      salesUnit: variant.salesUnit ?? null,
      packageType: variant.packageType ?? null,
      unitWeightKg: toDecimal(variant.unitWeightKg),
      unitLengthCm: toDecimal(variantDimensions.unitLengthCm),
      unitWidthCm: toDecimal(variantDimensions.unitWidthCm),
      unitHeightCm: toDecimal(variantDimensions.unitHeightCm),
    };
  });
}

export async function parseSellerProductPayload(raw: unknown) {
  const payload = productSchema.parse(raw);

  const category = await prisma.category.findUnique({ where: { slug: payload.categorySlug } });
  if (!category || !category.isActive) {
    throw new Error("INVALID_CATEGORY");
  }

  if (payload.categorySlug !== "other") {
    payload.categoryNote = null;
  }

  const hasVariants = payload.variants.length > 0;
  payload.hasVariants = hasVariants;

  if (hasVariants) {
    payload.basePrice = Math.min(...payload.variants.map((variant) => variant.price));
    payload.inventory = payload.variants.reduce((sum, variant) => sum + variant.inventory, 0);
  }

  return payload;
}

export function buildProductCreateInput(
  sellerId: string,
  payload: SellerProductPayload,
  ids: ProductCreateIds
): Prisma.ProductCreateInput {
  const normalizedDimensions = normalizeOptionalDimensions(payload);

  return {
    id: ids.productId,
    seller: { connect: { id: sellerId } },
    title: payload.title,
    description: payload.description ?? null,
    status: payload.status,
    category: { connect: { slug: payload.categorySlug } },
    categoryNote: payload.categoryNote ?? null,
    tags: payload.tags,
    basePrice: payload.basePrice,
    inventory: payload.inventory,
    hasVariants: payload.hasVariants ?? false,
    images: payload.images.map((image, index) => ({
      secureUrl: image.secureUrl,
      publicId: image.publicId,
      altText: image.altText ?? payload.title,
      displayOrder: image.displayOrder ?? index,
    })),
    salesUnit: payload.salesUnit,
    packageType: payload.packageType,
    unitWeightKg: toRequiredDecimal(payload.unitWeightKg),
    unitLengthCm: toDecimal(normalizedDimensions.unitLengthCm),
    unitWidthCm: toDecimal(normalizedDimensions.unitWidthCm),
    unitHeightCm: toDecimal(normalizedDimensions.unitHeightCm),
    variants: payload.variants.length
      ? {
          create: mapVariantCreates(payload.variants, ids.variantIds),
        }
      : undefined,
  };
}

export function buildProductUpdateInput(
  payload: SellerProductPayload,
  ids: ProductUpdateIds
): Prisma.ProductUpdateInput {
  const normalizedDimensions = normalizeOptionalDimensions(payload);

  return {
    title: payload.title,
    description: payload.description ?? null,
    status: payload.status,
    category: { connect: { slug: payload.categorySlug } },
    categoryNote: payload.categoryNote ?? null,
    tags: payload.tags,
    basePrice: payload.basePrice,
    inventory: payload.inventory,
    hasVariants: payload.hasVariants ?? false,
    images: payload.images.map((image, index) => ({
      secureUrl: image.secureUrl,
      publicId: image.publicId,
      altText: image.altText ?? payload.title,
      displayOrder: image.displayOrder ?? index,
    })),
    salesUnit: payload.salesUnit,
    packageType: payload.packageType,
    unitWeightKg: toRequiredDecimal(payload.unitWeightKg),
    unitLengthCm: toDecimal(normalizedDimensions.unitLengthCm),
    unitWidthCm: toDecimal(normalizedDimensions.unitWidthCm),
    unitHeightCm: toDecimal(normalizedDimensions.unitHeightCm),
    variants: {
      deleteMany: {},
      create: mapVariantCreates(payload.variants, ids.variantIds),
    },
  };
}
