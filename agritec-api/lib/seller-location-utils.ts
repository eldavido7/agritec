import type { Prisma } from "@prisma/client";

export const SELLER_LOCATION_REQUIRED_MESSAGE =
  "Please add your farm/pickup location before listing products.";

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function hasCompleteSellerLocation(
  seller:
    | {
        fullAddress?: unknown;
        state?: unknown;
        city?: unknown;
        lga?: unknown;
        latitude?: unknown;
        longitude?: unknown;
      }
    | null
    | undefined,
) {
  if (!seller) {
    return false;
  }

  const latitude = toNumber(seller.latitude);
  const longitude = toNumber(seller.longitude);

  return (
    hasText(seller.fullAddress) &&
    hasText(seller.state) &&
    (hasText(seller.city) || hasText(seller.lga)) &&
    latitude != null &&
    longitude != null
  );
}

export function ensureSellerHasCompleteLocation(
  seller:
    | {
        fullAddress?: unknown;
        state?: unknown;
        city?: unknown;
        lga?: unknown;
        latitude?: unknown;
        longitude?: unknown;
      }
    | null
    | undefined,
) {
  if (!hasCompleteSellerLocation(seller)) {
    throw new Error("SELLER_LOCATION_INCOMPLETE");
  }
}

export function sellerLocationIncompleteErrorResponseMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "SELLER_LOCATION_INCOMPLETE") {
    return SELLER_LOCATION_REQUIRED_MESSAGE;
  }
  return null;
}

export function sellerLocationFilter(): Prisma.SellerProfileWhereInput {
  return {
    AND: [
      { fullAddress: { not: null } },
      { fullAddress: { not: "" } },
      { state: { not: null } },
      { state: { not: "" } },
      { latitude: { not: null } },
      { longitude: { not: null } },
      {
        OR: [
          {
            AND: [{ city: { not: null } }, { city: { not: "" } }],
          },
          {
            AND: [{ lga: { not: null } }, { lga: { not: "" } }],
          },
        ],
      },
    ],
  };
}
