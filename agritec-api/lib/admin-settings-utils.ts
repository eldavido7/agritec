import { Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value);
}

export function serializePlatformSettings(platform: any, shipping: any, commission: any, payout: any) {
  return {
    platform: {
      id: platform.id,
      marketplaceName: platform.marketplaceName,
      currencyCode: platform.currencyCode,
      countryCode: platform.countryCode,
      supportEmail: platform.supportEmail,
      createdAt: platform.createdAt,
      updatedAt: platform.updatedAt,
    },
    shipping: {
      id: shipping.id,
      abujaMinimumFee: shipping.abujaMinimumFee,
      abujaAdditionalUnitFee: shipping.abujaAdditionalUnitFee,
      outsideMinimumFee: shipping.outsideMinimumFee,
      outsideAdditionalUnitFee: shipping.outsideAdditionalUnitFee,
      weightUnitSizeKg: decimalToNumber(shipping.weightUnitSizeKg),
      volumetricDivisor: shipping.volumetricDivisor,
      createdAt: shipping.createdAt,
      updatedAt: shipping.updatedAt,
    },
    commission: {
      id: commission.id,
      commissionRateBps: commission.commissionRateBps,
      commissionRatePercent: commission.commissionRateBps / 100,
      createdAt: commission.createdAt,
      updatedAt: commission.updatedAt,
    },
    payout: {
      id: payout.id,
      autoPayoutThreshold: payout.autoPayoutThreshold,
      weeklyPayoutDay: payout.weeklyPayoutDay,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    },
  };
}
