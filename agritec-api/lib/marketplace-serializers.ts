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

function serializeRefund(refund: any) {
  return {
    ...refund,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
    processedAt: refund.processedAt ?? null,
    failedAt: refund.failedAt ?? null,
  };
}

function serializeStatusHistoryEntry(entry: any) {
  return {
    ...entry,
    updatedByUser: entry.updatedByUser
      ? {
          ...entry.updatedByUser,
        }
      : null,
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
    refunds: Array.isArray(order.refunds) ? order.refunds.map(serializeRefund) : [],
    payment: order.payment
      ? {
          ...order.payment,
          refunds: Array.isArray(order.payment.refunds)
            ? order.payment.refunds.map(serializeRefund)
            : [],
        }
      : null,
    sellerGroups: Array.isArray(order.sellerGroups)
      ? order.sellerGroups.map((group: any) => ({
          ...group,
          totalChargeableWeightKg: decimalToNumber(group.totalChargeableWeightKg),
          weightUnitSizeKg: decimalToNumber(group.weightUnitSizeKg),
          logisticsCompany: group.logisticsCompany
            ? {
                ...group.logisticsCompany,
                latitude: decimalToNumber(group.logisticsCompany.latitude),
                longitude: decimalToNumber(group.logisticsCompany.longitude),
              }
            : null,
          seller: group.seller
            ? {
                ...group.seller,
                latitude: decimalToNumber(group.seller.latitude),
                longitude: decimalToNumber(group.seller.longitude),
              }
            : null,
          statusHistory: Array.isArray(group.statusHistory)
            ? group.statusHistory.map(serializeStatusHistoryEntry)
            : [],
          refunds: Array.isArray(group.refunds) ? group.refunds.map(serializeRefund) : [],
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
