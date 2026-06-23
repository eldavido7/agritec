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
import {
  allocateCombinedShippingFees,
  buildEligibleLogisticsCompanies,
  calculateLogisticsShippingBreakdown,
  type EligibleLogisticsCompany,
} from "@/lib/logistics-utils";
import { serializeProduct } from "@/lib/marketplace-serializers";
import { ensureSellerHasCompleteLocation } from "@/lib/seller-location-utils";

type LogisticsSelections = Record<string, string>;

export async function buildCheckoutQuote(args: {
  buyerId: string;
  addressId: string;
  discountCodes?: Record<string, string>;
  logisticsSelections?: LogisticsSelections;
  allGroupsLogisticsCompanyId?: string | null;
  allowPlatformFallbackWithoutSelection?: boolean;
  allowUnpricedWithoutSelection?: boolean;
}) {
  const {
    buyerId,
    addressId,
    discountCodes = {},
    logisticsSelections = {},
    allGroupsLogisticsCompanyId = null,
    allowPlatformFallbackWithoutSelection = false,
    allowUnpricedWithoutSelection = false,
  } = args;

  const [address, cart, shippingSettings, logisticsCompanies] = await Promise.all([
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
    prisma.logisticsCompanyProfile.findMany({
      where: {
        isVerified: true,
        verificationStatus: "VERIFIED",
        user: { isActive: true, role: "LOGISTICS" },
      },
      include: {
        user: { select: { isActive: true } },
        pricingSettings: true,
        coverageAreas: true,
      },
      orderBy: { companyName: "asc" },
    }),
  ]);

  if (!address) throw new Error("ADDRESS_NOT_FOUND");
  if (!cart) throw new Error("CART_NOT_FOUND");
  if (!shippingSettings) throw new Error("SHIPPING_SETTINGS_NOT_CONFIGURED");

  const activeItems = cart.items.filter(
    (item) => !item.product.isDeleted && item.product.status !== "ARCHIVED"
  );
  if (activeItems.length === 0) throw new Error("CART_EMPTY");

  const itemsBySeller = new Map<string, typeof activeItems>();
  for (const item of activeItems) {
    const sellerItems = itemsBySeller.get(item.product.sellerId) ?? [];
    sellerItems.push(item);
    itemsBySeller.set(item.product.sellerId, sellerItems);
  }

  const initialSellerGroups = await Promise.all(
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

      const seller = sellerItems[0].product.seller;
      ensureSellerHasCompleteLocation(seller);
      const eligibleLogisticsCompanies = buildEligibleLogisticsCompanies({
        companies: logisticsCompanies,
        buyerDeliveryRegion: address,
      });

      if (eligibleLogisticsCompanies.length === 0) {
        throw new Error("NO_ELIGIBLE_LOGISTICS_COMPANIES");
      }

      const items = sellerItems.map((item) => {
        const availableInventory = item.variant
          ? Math.max(0, item.variant.inventory - item.variant.reservedInventory)
          : Math.max(0, item.product.inventory - item.product.reservedInventory);

        if (item.quantity > availableInventory) {
          throw new Error(
            `INSUFFICIENT_INVENTORY:${item.variant?.id ?? item.product.id}`
          );
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
        const volumetricDivisor =
          eligibleLogisticsCompanies[0]?.pricing.volumetricDivisor ??
          shippingSettings.volumetricDivisor;
        const volumetricWeight = volumetricWeightKg(logisticsSource, volumetricDivisor);
        const unitChargeableWeight = chargeableWeightKg(
          logisticsSource,
          volumetricDivisor
        );
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

      return {
        sellerId,
        sellerName: seller.user.fullName,
        sellerEmail: seller.user.email,
        sellerPhone: seller.user.phone,
        farmName: seller.farmName,
        sellerPickupState: seller.state,
        sellerPickupCity: seller.city,
        sellerPickupLga: seller.lga,
        buyerDeliveryState: address.state,
        buyerDeliveryCity: address.city,
        buyerDeliveryLga: address.lga,
        productSubtotal: groupProductSubtotal,
        discountTotal: groupDiscountTotal,
        totalChargeableWeightKg: Number(totalChargeableWeight.toFixed(3)),
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
        eligibleLogisticsCompanies,
        items,
      };
    })
  );

  const computedSellerGroups = initialSellerGroups.map((group) => {
    const selectedLogisticsCompanyId =
      allGroupsLogisticsCompanyId || logisticsSelections[group.sellerId] || null;
    const selectedLogisticsCompany = selectedLogisticsCompanyId
      ? group.eligibleLogisticsCompanies.find(
          (company) => company.id === selectedLogisticsCompanyId
        ) ?? null
      : null;

    if (
      selectedLogisticsCompanyId &&
      !selectedLogisticsCompany
    ) {
      throw new Error(`LOGISTICS_COMPANY_NOT_ELIGIBLE:${group.sellerId}`);
    }

    if (
      !allowPlatformFallbackWithoutSelection &&
      !allowUnpricedWithoutSelection &&
      !selectedLogisticsCompany
    ) {
      throw new Error(`LOGISTICS_SELECTION_REQUIRED:${group.sellerId}`);
    }

    if (selectedLogisticsCompany) {
      const shippingBreakdown = calculateLogisticsShippingBreakdown({
        totalChargeableWeightKg: group.totalChargeableWeightKg,
        buyerDeliveryRegion: address,
        pricing: selectedLogisticsCompany.pricing,
      });

      return {
        ...group,
        logisticsCompanyId: selectedLogisticsCompany.id,
        logisticsCompanyName: selectedLogisticsCompany.companyName,
        deliveryRegion: shippingBreakdown.deliveryRegion,
        shippingFee: shippingBreakdown.shippingFee,
        groupTotal:
          group.productSubtotal - group.discountTotal + shippingBreakdown.shippingFee,
        weightUnitSizeKg: shippingBreakdown.weightUnitSizeKg,
        shippingUnits: shippingBreakdown.shippingUnits,
        minimumFee: shippingBreakdown.minimumFee,
        additionalUnitFee: shippingBreakdown.additionalUnitFee,
        shippingPricedBy:
          "LOGISTICS" as
            | "LOGISTICS"
            | "PLATFORM_FALLBACK"
            | "LOGISTICS_COMBINED"
            | "PENDING_SELECTION",
        logisticsSelectionPending: false,
      };
    }

    if (allowUnpricedWithoutSelection) {
      return {
        ...group,
        logisticsCompanyId: null,
        logisticsCompanyName: null,
        deliveryRegion:
          [address.city, address.state].filter(Boolean).join(", ") ||
          address.state ||
          address.city ||
          "Selected delivery region",
        shippingFee: 0,
        groupTotal: group.productSubtotal - group.discountTotal,
        weightUnitSizeKg: null,
        shippingUnits: null,
        minimumFee: null,
        additionalUnitFee: null,
        shippingPricedBy:
          "PENDING_SELECTION" as
            | "LOGISTICS"
            | "PLATFORM_FALLBACK"
            | "LOGISTICS_COMBINED"
            | "PENDING_SELECTION",
        logisticsSelectionPending: true,
      };
    }

    const shippingBreakdown = calculatePlatformShippingBreakdown({
      totalChargeableWeightKg: group.totalChargeableWeightKg,
      address,
      settings: shippingSettings,
    });

    return {
      ...group,
      logisticsCompanyId: null,
      logisticsCompanyName: null,
      deliveryRegion: shippingBreakdown.deliveryRegion,
      shippingFee: shippingBreakdown.shippingFee,
      groupTotal:
        group.productSubtotal - group.discountTotal + shippingBreakdown.shippingFee,
      weightUnitSizeKg: shippingBreakdown.weightUnitSizeKg,
      shippingUnits: shippingBreakdown.shippingUnits,
      minimumFee: shippingBreakdown.minimumFee,
      additionalUnitFee: shippingBreakdown.additionalUnitFee,
      shippingPricedBy:
        "PLATFORM_FALLBACK" as
          | "LOGISTICS"
          | "PLATFORM_FALLBACK"
          | "LOGISTICS_COMBINED"
          | "PENDING_SELECTION",
      logisticsSelectionPending: false,
    };
  });

  if (allGroupsLogisticsCompanyId) {
    const combinedSelectedCompany = computedSellerGroups[0]?.eligibleLogisticsCompanies.find(
      (company) => company.id === allGroupsLogisticsCompanyId
    );
    if (!combinedSelectedCompany) {
      throw new Error("LOGISTICS_COMPANY_NOT_FOUND");
    }

    const combinedWeight = computedSellerGroups.reduce(
      (sum, group) => sum + group.totalChargeableWeightKg,
      0
    );
    const combinedBreakdown = calculateLogisticsShippingBreakdown({
      totalChargeableWeightKg: combinedWeight,
      buyerDeliveryRegion: address,
      pricing: {
        minimumFee: combinedSelectedCompany.pricing.minimumFee,
        additionalUnitFee: combinedSelectedCompany.pricing.additionalUnitFee,
        weightUnitSizeKg: combinedSelectedCompany.pricing.weightUnitSizeKg,
      },
    });

    const allocatedFees = allocateCombinedShippingFees({
      totalShippingFee: combinedBreakdown.shippingFee,
      groupChargeableWeightsKg: computedSellerGroups.map((group) => ({
        sellerId: group.sellerId,
        totalChargeableWeightKg: group.totalChargeableWeightKg,
      })),
    });

    computedSellerGroups.forEach((group, index) => {
      const allocatedFee = Math.max(0, allocatedFees.get(group.sellerId) ?? 0);
      computedSellerGroups[index] = {
        ...group,
        shippingFee: allocatedFee,
        groupTotal: group.productSubtotal - group.discountTotal + allocatedFee,
        deliveryRegion: combinedBreakdown.deliveryRegion,
        weightUnitSizeKg: combinedBreakdown.weightUnitSizeKg,
        shippingUnits: combinedBreakdown.shippingUnits,
        minimumFee: combinedBreakdown.minimumFee,
        additionalUnitFee: combinedBreakdown.additionalUnitFee,
        shippingPricedBy: "LOGISTICS_COMBINED" as const,
        logisticsSelectionPending: false,
      };
    });
  }

  const productSubtotal = computedSellerGroups.reduce(
    (sum, group) => sum + group.productSubtotal,
    0
  );
  const totalShippingFee = computedSellerGroups.reduce(
    (sum, group) => sum + group.shippingFee,
    0
  );
  const discountTotal = computedSellerGroups.reduce(
    (sum, group) => sum + group.discountTotal,
    0
  );

  return {
    buyerId,
    address,
    productSubtotal,
    totalShippingFee,
    discountTotal,
    grandTotal: productSubtotal - discountTotal + totalShippingFee,
    sellerGroups: computedSellerGroups,
    currencyCode: "NGN",
    allGroupsLogisticsCompanyId,
  };
}

export async function buildEligibleCheckoutLogistics(args: {
  buyerId: string;
  addressId: string;
}) {
  const quote = await buildCheckoutQuote({
    buyerId: args.buyerId,
    addressId: args.addressId,
    allowPlatformFallbackWithoutSelection: true,
  });

  return {
    buyerId: quote.buyerId,
    address: quote.address,
    sellerGroups: quote.sellerGroups.map((group) => ({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      farmName: group.farmName,
      sellerPickupState: group.sellerPickupState,
      sellerPickupCity: group.sellerPickupCity,
      sellerPickupLga: group.sellerPickupLga,
      buyerDeliveryState: group.buyerDeliveryState,
      buyerDeliveryCity: group.buyerDeliveryCity,
      buyerDeliveryLga: group.buyerDeliveryLga,
      totalChargeableWeightKg: group.totalChargeableWeightKg,
      eligibleLogisticsCompanies: group.eligibleLogisticsCompanies,
    })),
  };
}
