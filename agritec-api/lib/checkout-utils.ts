import { DiscountType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function hasCompleteDimensions(logistics: {
  unitLengthCm?: Prisma.Decimal | number | null;
  unitWidthCm?: Prisma.Decimal | number | null;
  unitHeightCm?: Prisma.Decimal | number | null;
}) {
  return [logistics.unitLengthCm, logistics.unitWidthCm, logistics.unitHeightCm].every((value) => {
    const numberValue = decimalToNumber(value ?? null);
    return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue > 0;
  });
}

export function volumetricWeightKg(
  logistics: {
    unitLengthCm?: Prisma.Decimal | number | null;
    unitWidthCm?: Prisma.Decimal | number | null;
    unitHeightCm?: Prisma.Decimal | number | null;
  },
  volumetricDivisor: number
) {
  if (!hasCompleteDimensions(logistics)) {
    return null;
  }

  const length = decimalToNumber(logistics.unitLengthCm ?? null) as number;
  const width = decimalToNumber(logistics.unitWidthCm ?? null) as number;
  const height = decimalToNumber(logistics.unitHeightCm ?? null) as number;
  return (length * width * height) / volumetricDivisor;
}

export function chargeableWeightKg(
  logistics: {
    unitWeightKg?: Prisma.Decimal | number | null;
    unitLengthCm?: Prisma.Decimal | number | null;
    unitWidthCm?: Prisma.Decimal | number | null;
    unitHeightCm?: Prisma.Decimal | number | null;
  },
  volumetricDivisor: number
) {
  const actualWeight = decimalToNumber(logistics.unitWeightKg ?? null) ?? 0;
  const volumetricWeight = volumetricWeightKg(logistics, volumetricDivisor);

  if (volumetricWeight == null || !Number.isFinite(volumetricWeight) || volumetricWeight <= 0) {
    return actualWeight;
  }

  return Math.max(actualWeight, volumetricWeight);
}

export function isAbujaRegion(address: { city?: string | null; state?: string | null }) {
  const normalized = `${address.city ?? ""} ${address.state ?? ""}`.toLowerCase();
  return normalized.includes("abuja") || normalized.includes("fct");
}

export function normalizeDiscountCode(code: string) {
  return code.trim().toUpperCase();
}

export async function getActiveSellerDiscountByCode(sellerId: string, code: string) {
  const normalizedCode = normalizeDiscountCode(code);
  const now = new Date();

  return prisma.discount.findFirst({
    where: {
      sellerId,
      code: normalizedCode,
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
  });
}

export function lineDiscountAmount(args: {
  discount: {
    type: DiscountType;
    value: number;
    productIds: string[];
    variantIds: string[];
  } | null;
  productId: string;
  variantId?: string | null;
  unitPrice: number;
  quantity: number;
}) {
  const { discount, productId, variantId, unitPrice, quantity } = args;
  if (!discount) return 0;

  const targetsProduct = discount.productIds.includes(productId);
  const targetsVariant = variantId ? discount.variantIds.includes(variantId) : false;
  if (!targetsProduct && !targetsVariant) return 0;

  if (discount.type === DiscountType.PERCENTAGE) {
    return Math.floor((unitPrice * quantity * discount.value) / 100);
  }

  return Math.min(unitPrice * quantity, discount.value * quantity);
}
