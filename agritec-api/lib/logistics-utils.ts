import { Prisma } from "@prisma/client";
import { calculateShippingBreakdown, decimalToNumber } from "@/lib/checkout-utils";

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

type PricingRecord = {
  abujaMinimumFee: number;
  abujaAdditionalUnitFee: number;
  outsideMinimumFee: number;
  outsideAdditionalUnitFee: number;
  weightUnitSizeKg: Prisma.Decimal | number;
  volumetricDivisor: number;
};

export type EligibleLogisticsCompany = {
  id: string;
  companyName: string;
  verificationStatus: string;
  pricing: {
    abujaMinimumFee: number;
    abujaAdditionalUnitFee: number;
    outsideMinimumFee: number;
    outsideAdditionalUnitFee: number;
    weightUnitSizeKg: number;
    volumetricDivisor: number;
    weeklyAutoPayoutDay: number | null;
  };
  coverageSummary: {
    hasNationwideCoverage: boolean;
    matchingRegionalCoverage: boolean;
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

export function calculateLogisticsShippingBreakdown(args: {
  totalChargeableWeightKg: number;
  address: RegionLike;
  pricing: PricingRecord;
}) {
  return calculateShippingBreakdown({
    totalChargeableWeightKg: args.totalChargeableWeightKg,
    address: args.address,
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
      totalWeight > 0 ? Math.max(0, group.totalChargeableWeightKg) / totalWeight : 1 / groupChargeableWeightsKg.length;
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
    pricingSettings: {
      abujaMinimumFee: number;
      abujaAdditionalUnitFee: number;
      outsideMinimumFee: number;
      outsideAdditionalUnitFee: number;
      weightUnitSizeKg: Prisma.Decimal | number;
      volumetricDivisor: number;
      weeklyAutoPayoutDay: number | null;
    } | null;
    coverageAreas: CoverageAreaRecord[];
    user: { isActive: boolean };
    isVerified: boolean;
  }>;
  buyerDeliveryRegion: RegionLike;
}) {
  const eligibleCompanies = args.companies
    .filter((company) => company.user.isActive && company.isVerified && company.pricingSettings)
    .map((company) => {
      const hasNationwideCoverage = isNationwideCompany(company);
      const matchingRegionalCoverageAreas = company.coverageAreas.filter(
        (coverageArea) =>
          coverageArea.coverageType === "REGIONAL" &&
          matchesCoverageArea(args.buyerDeliveryRegion, coverageArea)
      );

      return {
        company,
        hasNationwideCoverage,
        matchingRegionalCoverageAreas,
      };
    })
    .filter(
      ({ hasNationwideCoverage, matchingRegionalCoverageAreas }) =>
        hasNationwideCoverage || matchingRegionalCoverageAreas.length > 0
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
    .map(({ company, hasNationwideCoverage, matchingRegionalCoverageAreas }) => ({
      id: company.id,
      companyName: company.companyName,
      verificationStatus: company.verificationStatus,
      pricing: {
        abujaMinimumFee: company.pricingSettings!.abujaMinimumFee,
        abujaAdditionalUnitFee: company.pricingSettings!.abujaAdditionalUnitFee,
        outsideMinimumFee: company.pricingSettings!.outsideMinimumFee,
        outsideAdditionalUnitFee: company.pricingSettings!.outsideAdditionalUnitFee,
        weightUnitSizeKg: decimalToNumber(company.pricingSettings!.weightUnitSizeKg) ?? 10,
        volumetricDivisor: company.pricingSettings!.volumetricDivisor,
        weeklyAutoPayoutDay: company.pricingSettings!.weeklyAutoPayoutDay,
      },
      coverageSummary: {
        hasNationwideCoverage,
        matchingRegionalCoverage: matchingRegionalCoverageAreas.length > 0,
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
    }));

  return eligibleCompanies;
}
