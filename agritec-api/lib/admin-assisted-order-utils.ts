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
import {
  allocateCombinedShippingFees,
  buildEligibleLogisticsCompanies,
  calculateLogisticsShippingBreakdown,
  isNationwideCompany,
} from "@/lib/logistics-utils";
import { serializeProduct } from "@/lib/marketplace-serializers";

export type AssistedAddressInput = {
  id?: string | null;
  displayName?: string | null;
  addressLine: string;
  fullAddress: string;
  city: string;
  state: string;
  lga?: string | null;
  area?: string | null;
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
  logisticsSelections?: Record<string, string>;
  allGroupsLogisticsCompanyId?: string | null;
  allowPlatformFallbackWithoutSelection?: boolean;
}) {
  const {
    buyerId,
    items,
    address,
    discountCodes = {},
    logisticsSelections = {},
    allGroupsLogisticsCompanyId = null,
    allowPlatformFallbackWithoutSelection = false,
  } = args;

  const [buyer, shippingSettings, logisticsCompanies] = await Promise.all([
    prisma.buyerProfile.findUnique({
      where: { id: buyerId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
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

    const variant = item.variantId
      ? product.variants.find((entry) => entry.id === item.variantId) ?? null
      : null;
    if (item.variantId && !variant) {
      throw new Error(`VARIANT_NOT_FOUND:${item.variantId}`);
    }

    const availableInventory = variant
      ? Math.max(0, variant.inventory - variant.reservedInventory)
      : Math.max(0, product.inventory - product.reservedInventory);

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
      const eligibleLogisticsCompanies = buildEligibleLogisticsCompanies({
        companies: logisticsCompanies,
        buyerDeliveryRegion: address,
      });

      if (eligibleLogisticsCompanies.length === 0) {
        throw new Error("NO_ELIGIBLE_LOGISTICS_COMPANIES");
      }

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
        const volumetricDivisor =
          eligibleLogisticsCompanies[0]?.pricing.volumetricDivisor ??
          shippingSettings.volumetricDivisor;
        const volumetricWeight = volumetricWeightKg(logisticsSource, volumetricDivisor);
        const unitChargeableWeight = chargeableWeightKg(
          logisticsSource,
          volumetricDivisor
        );
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
        buyerDeliveryLga: address.lga ?? null,
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
        items: normalizedItems,
      };
    })
  );

  if (allGroupsLogisticsCompanyId) {
    const selectedNationwideCompany = logisticsCompanies.find(
      (company) => company.id === allGroupsLogisticsCompanyId
    );
    if (!selectedNationwideCompany) {
      throw new Error("LOGISTICS_COMPANY_NOT_FOUND");
    }
    if (!isNationwideCompany(selectedNationwideCompany)) {
      throw new Error("ALL_GROUPS_LOGISTICS_MUST_BE_NATIONWIDE");
    }
  }

  const computedSellerGroups = initialSellerGroups.map((group) => {
    const selectedLogisticsCompanyId =
      allGroupsLogisticsCompanyId || logisticsSelections[group.sellerId] || null;
    const selectedLogisticsCompany = selectedLogisticsCompanyId
      ? group.eligibleLogisticsCompanies.find(
          (company) => company.id === selectedLogisticsCompanyId
        ) ?? null
      : null;

    if (selectedLogisticsCompanyId && !selectedLogisticsCompany) {
      throw new Error(`LOGISTICS_COMPANY_NOT_ELIGIBLE:${group.sellerId}`);
    }

    if (!allowPlatformFallbackWithoutSelection && !selectedLogisticsCompany) {
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
            | "LOGISTICS_NATIONWIDE_COMBINED",
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
            | "LOGISTICS_NATIONWIDE_COMBINED",
    };
  });

  if (allGroupsLogisticsCompanyId) {
    const selectedCompany = logisticsCompanies.find(
      (company) => company.id === allGroupsLogisticsCompanyId
    );
    const nationwidePricing = selectedCompany?.pricingSettings.find(
      (pricing) => pricing.pricingScope === "NATIONWIDE" && pricing.isActive
    );
    if (!selectedCompany || !nationwidePricing) {
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
        minimumFee: nationwidePricing.minimumFee,
        additionalUnitFee: nationwidePricing.additionalUnitFee,
        weightUnitSizeKg: nationwidePricing.weightUnitSizeKg,
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
        shippingPricedBy: "LOGISTICS_NATIONWIDE_COMBINED" as const,
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
    buyer,
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
