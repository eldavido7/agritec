import { AddressCreatorRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  calculatePlatformShippingBreakdown,
  chargeableWeightKg,
  decimalToNumber,
  getActiveSellerDiscountByCode,
  lineDiscountAmount,
  normalizeDiscountCode,
  volumetricWeightKg,
} from "@/lib/checkout-utils";
import { serializeProduct } from "@/lib/marketplace-serializers";

export type AssistedAddressInput = {
  id?: string | null;
  displayName?: string | null;
  addressLine: string;
  fullAddress: string;
  city: string;
  state: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isManualAddress: boolean;
  isAdminAssisted: boolean;
  createdByRole: AddressCreatorRole;
};

export async function buildAdminAssistedQuote(args: {
  buyerId: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
  }>;
  address: AssistedAddressInput;
  discountCodes?: Record<string, string>;
}) {
  const { buyerId, items, address, discountCodes = {} } = args;

  const [buyer, shippingSettings] = await Promise.all([
    prisma.buyerProfile.findUnique({
      where: { id: buyerId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
      },
    }),
    prisma.shippingSettings.findUnique({ where: { id: "shipping" } }),
  ]);

  if (!buyer) throw new Error("BUYER_NOT_FOUND");
  if (!shippingSettings) throw new Error("SHIPPING_SETTINGS_NOT_CONFIGURED");
  if (items.length === 0) throw new Error("ASSISTED_ORDER_ITEMS_EMPTY");

  const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueProductIds },
      isDeleted: false,
      NOT: { status: "ARCHIVED" },
    },
    include: {
      category: true,
      seller: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      variants: true,
    },
  });

  const productsById = new Map(products.map((product) => [product.id, product]));
  const requestedLines = items.map((item, index) => {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
    }

    const variant = item.variantId ? product.variants.find((entry) => entry.id === item.variantId) ?? null : null;
    if (item.variantId && !variant) {
      throw new Error(`VARIANT_NOT_FOUND:${item.variantId}`);
    }

    const availableInventory = variant?.inventory ?? product.inventory;
    if (item.quantity <= 0) {
      throw new Error(`INVALID_QUANTITY:${item.productId}`);
    }
    if (availableInventory < item.quantity) {
      throw new Error(`INSUFFICIENT_INVENTORY:${variant?.id ?? product.id}`);
    }

    return {
      lineKey: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
      syntheticCartItemId: `assisted-${index + 1}`,
      quantity: item.quantity,
      product,
      variant,
    };
  });

  const itemsBySeller = new Map<string, typeof requestedLines>();
  for (const line of requestedLines) {
    const sellerItems = itemsBySeller.get(line.product.sellerId) ?? [];
    sellerItems.push(line);
    itemsBySeller.set(line.product.sellerId, sellerItems);
  }

  const volumetricDivisor = shippingSettings.volumetricDivisor;

  let productSubtotal = 0;
  let totalShippingFee = 0;
  let discountTotal = 0;

  const sellerGroups = await Promise.all(
    Array.from(itemsBySeller.entries()).map(async ([sellerId, sellerItems]) => {
      const requestedDiscountCode = discountCodes[sellerId]
        ? normalizeDiscountCode(discountCodes[sellerId])
        : null;

      const discount = requestedDiscountCode
        ? await getActiveSellerDiscountByCode(sellerId, requestedDiscountCode)
        : null;

      let groupProductSubtotal = 0;
      let groupDiscountTotal = 0;
      let totalChargeableWeight = 0;

      const normalizedItems = sellerItems.map((line) => {
        const product = line.product;
        const variant = line.variant;
        const logisticsSource = variant ?? product;
        const unitPrice = variant?.price ?? product.basePrice;
        const lineSubtotal = unitPrice * line.quantity;
        const lineDiscount = lineDiscountAmount({
          discount,
          productId: product.id,
          variantId: variant?.id ?? null,
          unitPrice,
          quantity: line.quantity,
        });
        const lineTotal = lineSubtotal - lineDiscount;
        const actualWeight = decimalToNumber(logisticsSource.unitWeightKg ?? null) ?? 0;
        const volumetricWeight = volumetricWeightKg(logisticsSource, volumetricDivisor);
        const unitChargeableWeight = chargeableWeightKg(logisticsSource, volumetricDivisor);
        const lineChargeableWeight = unitChargeableWeight * line.quantity;

        groupProductSubtotal += lineSubtotal;
        groupDiscountTotal += lineDiscount;
        totalChargeableWeight += lineChargeableWeight;

        return {
          cartItemId: line.syntheticCartItemId,
          lineKey: line.lineKey,
          quantity: line.quantity,
          product,
          variant,
          productSerialized: serializeProduct(product),
          salesUnit: variant?.salesUnit ?? product.salesUnit,
          packageType: variant?.packageType ?? product.packageType,
          unitPrice,
          actualWeightKg: actualWeight,
          volumetricWeightKg: volumetricWeight,
          unitChargeableWeightKg: unitChargeableWeight,
          lineChargeableWeightKg: lineChargeableWeight,
          lineSubtotal,
          lineDiscountTotal: lineDiscount,
          lineTotal,
        };
      });

      const shippingBreakdown = calculatePlatformShippingBreakdown({
        totalChargeableWeightKg: totalChargeableWeight,
        address,
        settings: shippingSettings,
      });
      const shippingFee = shippingBreakdown.shippingFee;
      const groupTotal = groupProductSubtotal - groupDiscountTotal + shippingFee;

      productSubtotal += groupProductSubtotal;
      discountTotal += groupDiscountTotal;
      totalShippingFee += shippingFee;

      const seller = sellerItems[0].product.seller;

      return {
        sellerId,
        sellerName: seller.user.fullName,
        sellerEmail: seller.user.email,
        sellerPhone: seller.user.phone,
        farmName: seller.farmName,
        deliveryRegion: shippingBreakdown.deliveryRegion,
        productSubtotal: groupProductSubtotal,
        discountTotal: groupDiscountTotal,
        shippingFee,
        groupTotal,
        totalChargeableWeightKg: Number(totalChargeableWeight.toFixed(3)),
        weightUnitSizeKg: shippingBreakdown.weightUnitSizeKg,
        shippingUnits: shippingBreakdown.shippingUnits,
        minimumFee: shippingBreakdown.minimumFee,
        additionalUnitFee: shippingBreakdown.additionalUnitFee,
        discountCode: discount ? discount.code : requestedDiscountCode,
        discountApplied: Boolean(discount),
        discountSummary: discount
          ? {
              id: discount.id,
              code: discount.code,
              type: discount.type,
              value: discount.value,
              description: discount.description,
            }
          : null,
        items: normalizedItems,
      };
    })
  );

  return {
    buyerId,
    buyer,
    address,
    productSubtotal,
    totalShippingFee,
    discountTotal,
    grandTotal: productSubtotal - discountTotal + totalShippingFee,
    sellerGroups,
    currencyCode: "NGN",
  };
}
