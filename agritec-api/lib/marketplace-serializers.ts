import { Prisma, ProductStatus } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value);
}

function withInventoryState<T extends { inventory?: number | null; reservedInventory?: number | null }>(record: T) {
  const inventory = typeof record.inventory === "number" ? record.inventory : 0;
  const reservedInventory = typeof record.reservedInventory === "number" ? record.reservedInventory : 0;
  return {
    ...record,
    reservedInventory,
    availableInventory: Math.max(0, inventory - reservedInventory),
  };
}

export function serializePublicSeller(seller: any) {
  return {
    ...seller,
    ownerName: seller.user?.fullName ?? null,
    latitude: decimalToNumber(seller.latitude),
    longitude: decimalToNumber(seller.longitude),
  };
}

export function serializeProduct(product: any) {
  return {
    ...withInventoryState(product),
    unitWeightKg: decimalToNumber(product.unitWeightKg),
    unitLengthCm: decimalToNumber(product.unitLengthCm),
    unitWidthCm: decimalToNumber(product.unitWidthCm),
    unitHeightCm: decimalToNumber(product.unitHeightCm),
    seller: product.seller ? serializePublicSeller(product.seller) : undefined,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant: any) => ({
          ...withInventoryState(variant),
          unitWeightKg: decimalToNumber(variant.unitWeightKg),
          unitLengthCm: decimalToNumber(variant.unitLengthCm),
          unitWidthCm: decimalToNumber(variant.unitWidthCm),
          unitHeightCm: decimalToNumber(variant.unitHeightCm),
        }))
      : [],
  };
}

export function serializeShippingSettings(settings: any) {
  return {
    ...settings,
    weightUnitSizeKg: decimalToNumber(settings.weightUnitSizeKg),
  };
}

export function serializeOrder(order: any) {
  return {
    ...order,
    sellerGroups: Array.isArray(order.sellerGroups)
      ? order.sellerGroups.map((group: any) => ({
          ...group,
          totalChargeableWeightKg: decimalToNumber(group.totalChargeableWeightKg),
          weightUnitSizeKg: decimalToNumber(group.weightUnitSizeKg),
          items: Array.isArray(group.items)
            ? group.items.map((item: any) => ({
                ...item,
                unitWeightKgSnapshot: decimalToNumber(item.unitWeightKgSnapshot),
                unitLengthCmSnapshot: decimalToNumber(item.unitLengthCmSnapshot),
                unitWidthCmSnapshot: decimalToNumber(item.unitWidthCmSnapshot),
                unitHeightCmSnapshot: decimalToNumber(item.unitHeightCmSnapshot),
              }))
            : [],
        }))
      : [],
    addressSnapshot: order.addressSnapshot
      ? {
          ...order.addressSnapshot,
          latitude: decimalToNumber(order.addressSnapshot.latitude),
          longitude: decimalToNumber(order.addressSnapshot.longitude),
        }
      : null,
  };
}

export function parseProductStatus(input: string | null) {
  if (!input) {
    return ProductStatus.ACTIVE;
  }

  const normalized = input.toUpperCase();
  return Object.values(ProductStatus).includes(normalized as ProductStatus)
    ? (normalized as ProductStatus)
    : ProductStatus.ACTIVE;
}
