import { Prisma } from "@prisma/client";
import {
  calculateFlatRateShippingBreakdown,
  decimalToNumber,
} from "@/lib/checkout-utils";

type RegionLike = {
  state?: string | null;
  city?: string | null;
  lga?: string | null;
  area?: string | null;
};

type CoverageAreaRecord = {
  id: string;
  coverageType: "NATIONWIDE" | "REGIONAL";
  selectionType: "STATE" | "LGA" | "CITY" | "AREA" | null;
  state: string | null;
  lga: string | null;
  city: string | null;
  area: string | null;
  isActive: boolean;
};

type PricingSettingRecord = {
  id: string;
  pricingScope: "NATIONWIDE" | "STATE";
  state: string;
  minimumFee: number;
  additionalUnitFee: number;
  weightUnitSizeKg: Prisma.Decimal | number;
  volumetricDivisor: number;
  isActive: boolean;
};

export type EligibleLogisticsCompany = {
  id: string;
  companyName: string;
  verificationStatus: string;
  pricing: {
    id: string;
    pricingScope: "NATIONWIDE" | "STATE";
    state: string | null;
    minimumFee: number;
    additionalUnitFee: number;
    weightUnitSizeKg: number;
    volumetricDivisor: number;
    isActive: boolean;
  };
  coverageSummary: {
    coverageType: "NATIONWIDE" | "REGIONAL";
    hasNationwideCoverage: boolean;
    matchingRegionalCoverage: boolean;
    coveredStates: string[];
    coverageAreas: Array<{
      id: string;
      coverageType: "NATIONWIDE" | "REGIONAL";
      selectionType: "STATE" | "LGA" | "CITY" | "AREA" | null;
      state: string | null;
      lga: string | null;
      city: string | null;
      area: string | null;
    }>;
  };
};

function normalizeLocationValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizeStateKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function matchesCoverageArea(region: RegionLike, coverageArea: CoverageAreaRecord) {
  if (!coverageArea.isActive) return false;
  if (coverageArea.coverageType === "NATIONWIDE") return true;

  const regionState = normalizeLocationValue(region.state);
  const coverageState = normalizeLocationValue(coverageArea.state);
  if (!regionState || !coverageState || regionState !== coverageState) {
    return false;
  }

  switch (coverageArea.selectionType) {
    case null:
    case "STATE":
      return true;
    case "LGA":
      return normalizeLocationValue(region.lga) === normalizeLocationValue(coverageArea.lga);
    case "CITY":
      return normalizeLocationValue(region.city) === normalizeLocationValue(coverageArea.city);
    case "AREA":
      return normalizeLocationValue(region.area) === normalizeLocationValue(coverageArea.area);
    default:
      return false;
  }
}

function resolvePricingForRegion(args: {
  pricingSettings: PricingSettingRecord[];
  hasNationwideCoverage: boolean;
  buyerDeliveryRegion: RegionLike;
}) {
  const activePricing = args.pricingSettings.filter((setting) => setting.isActive);

  if (args.hasNationwideCoverage) {
    return (
      activePricing.find((setting) => setting.pricingScope === "NATIONWIDE") ?? null
    );
  }

  const buyerState = normalizeStateKey(args.buyerDeliveryRegion.state);
  if (!buyerState) {
    return null;
  }

  return (
    activePricing.find(
      (setting) =>
        setting.pricingScope === "STATE" &&
        normalizeStateKey(setting.state) === buyerState
    ) ?? null
  );
}

export function calculateLogisticsShippingBreakdown(args: {
  totalChargeableWeightKg: number;
  buyerDeliveryRegion: RegionLike;
  pricing: {
    minimumFee: number;
    additionalUnitFee: number;
    weightUnitSizeKg: Prisma.Decimal | number;
  };
}) {
  const deliveryRegionLabel = args.buyerDeliveryRegion.state?.trim() || "Nationwide";
  return calculateFlatRateShippingBreakdown({
    totalChargeableWeightKg: args.totalChargeableWeightKg,
    deliveryRegionLabel,
    settings: args.pricing,
  });
}

export function allocateCombinedShippingFees(args: {
  totalShippingFee: number;
  groupChargeableWeightsKg: Array<{ sellerId: string; totalChargeableWeightKg: number }>;
}) {
  const { totalShippingFee, groupChargeableWeightsKg } = args;
  if (groupChargeableWeightsKg.length === 0) {
    return new Map<string, number>();
  }

  const totalWeight = groupChargeableWeightsKg.reduce(
    (sum, group) => sum + Math.max(0, group.totalChargeableWeightKg),
    0
  );

  const allocations = new Map<string, number>();
  let allocatedSoFar = 0;

  groupChargeableWeightsKg.forEach((group, index) => {
    if (index === groupChargeableWeightsKg.length - 1) {
      allocations.set(group.sellerId, totalShippingFee - allocatedSoFar);
      return;
    }

    const ratio =
      totalWeight > 0
        ? Math.max(0, group.totalChargeableWeightKg) / totalWeight
        : 1 / groupChargeableWeightsKg.length;
    const allocated = Math.round(totalShippingFee * ratio);
    allocations.set(group.sellerId, allocated);
    allocatedSoFar += allocated;
  });

  return allocations;
}

export function isNationwideCompany(company: {
  coverageAreas: CoverageAreaRecord[];
}) {
  return company.coverageAreas.some(
    (coverageArea) => coverageArea.isActive && coverageArea.coverageType === "NATIONWIDE"
  );
}

export function buildEligibleLogisticsCompanies(args: {
  companies: Array<{
    id: string;
    companyName: string;
    verificationStatus: string;
    pricingSettings: PricingSettingRecord[];
    coverageAreas: CoverageAreaRecord[];
    user: { isActive: boolean };
    isVerified: boolean;
  }>;
  buyerDeliveryRegion: RegionLike;
}) {
  const eligibleCompanies = args.companies
    .filter((company) => company.user.isActive && company.isVerified)
    .map((company) => {
      const hasNationwideCoverage = isNationwideCompany(company);
      const matchingRegionalCoverageAreas = company.coverageAreas.filter(
        (coverageArea) =>
          coverageArea.coverageType === "REGIONAL" &&
          matchesCoverageArea(args.buyerDeliveryRegion, coverageArea)
      );
      const resolvedPricing = resolvePricingForRegion({
        pricingSettings: company.pricingSettings,
        hasNationwideCoverage,
        buyerDeliveryRegion: args.buyerDeliveryRegion,
      });

      return {
        company,
        hasNationwideCoverage,
        matchingRegionalCoverageAreas,
        resolvedPricing,
      };
    })
    .filter(
      ({ hasNationwideCoverage, matchingRegionalCoverageAreas, resolvedPricing }) =>
        Boolean(resolvedPricing) &&
        (hasNationwideCoverage || matchingRegionalCoverageAreas.length > 0)
    )
    .sort((left, right) => {
      const leftRegional = left.matchingRegionalCoverageAreas.length > 0 ? 1 : 0;
      const rightRegional = right.matchingRegionalCoverageAreas.length > 0 ? 1 : 0;
      if (leftRegional !== rightRegional) {
        return rightRegional - leftRegional;
      }

      const leftNationwide = left.hasNationwideCoverage ? 1 : 0;
      const rightNationwide = right.hasNationwideCoverage ? 1 : 0;
      if (leftNationwide !== rightNationwide) {
        return leftNationwide - rightNationwide;
      }

      return left.company.companyName.localeCompare(right.company.companyName);
    })
    .map(
      ({ company, hasNationwideCoverage, matchingRegionalCoverageAreas, resolvedPricing }) => ({
        id: company.id,
        companyName: company.companyName,
        verificationStatus: company.verificationStatus,
        pricing: {
          id: resolvedPricing!.id,
          pricingScope: resolvedPricing!.pricingScope,
          state:
            resolvedPricing!.pricingScope === "STATE" ? resolvedPricing!.state : null,
          minimumFee: resolvedPricing!.minimumFee,
          additionalUnitFee: resolvedPricing!.additionalUnitFee,
          weightUnitSizeKg: decimalToNumber(resolvedPricing!.weightUnitSizeKg) ?? 10,
          volumetricDivisor: resolvedPricing!.volumetricDivisor,
          isActive: resolvedPricing!.isActive,
        },
        coverageSummary: {
          coverageType: hasNationwideCoverage ? "NATIONWIDE" : "REGIONAL",
          hasNationwideCoverage,
          matchingRegionalCoverage: matchingRegionalCoverageAreas.length > 0,
          coveredStates: Array.from(
            new Set(
              company.coverageAreas
                .filter((coverageArea) => coverageArea.isActive && coverageArea.state)
                .map((coverageArea) => coverageArea.state as string)
            )
          ).sort(),
          coverageAreas: company.coverageAreas
            .filter(
              (coverageArea) =>
                coverageArea.coverageType === "NATIONWIDE" ||
                matchingRegionalCoverageAreas.some((match) => match.id === coverageArea.id)
            )
            .map((coverageArea) => ({
              id: coverageArea.id,
              coverageType: coverageArea.coverageType,
              selectionType: coverageArea.selectionType,
              state: coverageArea.state,
              lga: coverageArea.lga,
              city: coverageArea.city,
              area: coverageArea.area,
            })),
        },
      })
    );

  return eligibleCompanies;
}
