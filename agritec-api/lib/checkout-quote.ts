import { DiscountType } from "@prisma/client";
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

export async function buildCheckoutQuote(args: {
  buyerId: string;
  addressId: string;
  discountCodes?: Record<string, string>;
}) {
  const { buyerId, addressId, discountCodes = {} } = args;

  const [address, cart, shippingSettings] = await Promise.all([
    prisma.address.findFirst({ where: { id: addressId, buyerId } }),
    prisma.cart.findUnique({
      where: { buyerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                seller: {
                  include: {
                    user: { select: { fullName: true, email: true, phone: true } },
                  },
                },
                variants: true,
              },
            },
            variant: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.shippingSettings.findUnique({ where: { id: "shipping" } }),
  ]);

  if (!address) throw new Error("ADDRESS_NOT_FOUND");
  if (!cart) throw new Error("CART_NOT_FOUND");
  if (!shippingSettings) throw new Error("SHIPPING_SETTINGS_NOT_CONFIGURED");

  const activeItems = cart.items.filter((item) => !item.product.isDeleted && item.product.status !== "ARCHIVED");
  if (activeItems.length === 0) throw new Error("CART_EMPTY");

  const itemsBySeller = new Map<string, typeof activeItems>();
  for (const item of activeItems) {
    const sellerItems = itemsBySeller.get(item.product.sellerId) ?? [];
    sellerItems.push(item);
    itemsBySeller.set(item.product.sellerId, sellerItems);
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

      const items = sellerItems.map((item) => {
        const availableInventory = item.variant
          ? Math.max(0, item.variant.inventory - item.variant.reservedInventory)
          : Math.max(0, item.product.inventory - item.product.reservedInventory);

        if (item.quantity > availableInventory) {
          throw new Error(`INSUFFICIENT_INVENTORY:${item.variant?.id ?? item.product.id}`);
        }

        const product = item.product;
        const variant = item.variant;
        const logisticsSource = variant ?? product;
        const unitPrice = variant?.price ?? product.basePrice;
        const lineSubtotal = unitPrice * item.quantity;
        const lineDiscount = lineDiscountAmount({
          discount,
          productId: product.id,
          variantId: variant?.id ?? null,
          unitPrice,
          quantity: item.quantity,
        });
        const lineTotal = lineSubtotal - lineDiscount;
        const actualWeight = decimalToNumber(logisticsSource.unitWeightKg ?? null) ?? 0;
        const volumetricWeight = volumetricWeightKg(logisticsSource, volumetricDivisor);
        const unitChargeableWeight = chargeableWeightKg(logisticsSource, volumetricDivisor);
        const lineChargeableWeight = unitChargeableWeight * item.quantity;

        groupProductSubtotal += lineSubtotal;
        groupDiscountTotal += lineDiscount;
        totalChargeableWeight += lineChargeableWeight;

        return {
          cartItemId: item.id,
          lineKey: item.lineKey,
          quantity: item.quantity,
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
        items,
      };
    })
  );

  return {
    buyerId,
    address,
    productSubtotal,
    totalShippingFee,
    discountTotal,
    grandTotal: productSubtotal - discountTotal + totalShippingFee,
    sellerGroups,
    currencyCode: "NGN",
  };
}
