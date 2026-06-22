import {
  LogisticsCoverageType,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  authUserSelect,
  normalizeEmail,
  requireAuthenticatedUser,
  serializeAuthUser,
} from "@/lib/auth";
import { reserveSequentialIds } from "@/lib/id-sequence";

const pricingConfigSchema = z.object({
  minimumFee: z.number().int().min(0),
  additionalUnitFee: z.number().int().min(0),
  weightUnitSizeKg: z.number().positive(),
  volumetricDivisor: z.number().int().positive(),
});

const statePricingSchema = pricingConfigSchema.extend({
  state: z.string().trim().min(1),
  isActive: z.boolean().default(true),
});

const coverageSettingsSchema = z.object({
  coverageType: z.nativeEnum(LogisticsCoverageType),
  states: z.array(z.string().trim().min(1)).default([]),
});

const logisticsPricingUpdateSchema = z.object({
  nationwidePricing: pricingConfigSchema.nullable().optional(),
  statePricing: z.array(statePricingSchema).default([]),
});

const logisticsProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().nullable().optional(),
  companyName: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  contactPersonName: z.string().trim().nullable().optional(),
  businessAddress: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  lga: z.string().trim().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  coverage: coverageSettingsSchema.optional(),
  pricing: logisticsPricingUpdateSchema.optional(),
});

function normalizeStateName(state: string) {
  return state.trim();
}

function uniqueStates(states: string[]) {
  return Array.from(new Set(states.map(normalizeStateName))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function serializePricingSetting(settings: any) {
  return {
    id: settings.id,
    logisticsCompanyId: settings.logisticsCompanyId,
    pricingScope: settings.pricingScope,
    state: settings.pricingScope === "STATE" ? settings.state : null,
    minimumFee: settings.minimumFee,
    additionalUnitFee: settings.additionalUnitFee,
    weightUnitSizeKg:
      settings.weightUnitSizeKg == null ? null : Number(settings.weightUnitSizeKg),
    volumetricDivisor: settings.volumetricDivisor,
    isActive: settings.isActive,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

function serializeCoverageArea(area: any) {
  return {
    id: area.id,
    logisticsCompanyId: area.logisticsCompanyId,
    coverageType: area.coverageType,
    selectionType: area.selectionType,
    state: area.state,
    lga: area.lga,
    city: area.city,
    area: area.area,
    isActive: area.isActive,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
  };
}

function deriveCoverageType(coverageAreas: any[]) {
  return coverageAreas.some((area) => area.coverageType === "NATIONWIDE")
    ? LogisticsCoverageType.NATIONWIDE
    : LogisticsCoverageType.REGIONAL;
}

function serializeLogisticsProfile(user: any) {
  const coverageAreas = Array.isArray(user.logisticsProfile?.coverageAreas)
    ? user.logisticsProfile.coverageAreas.map(serializeCoverageArea)
    : [];
  const pricingSettings = Array.isArray(user.logisticsProfile?.pricingSettings)
    ? user.logisticsProfile.pricingSettings.map(serializePricingSetting)
    : [];
  const coverageType = deriveCoverageType(coverageAreas);
  const coveredStates = uniqueStates(
    coverageAreas
      .map((area: any) => area.state)
      .filter((state: string | null): state is string => Boolean(state))
  );

  return {
    user: serializeAuthUser(user),
    coverageType,
    coveredStates,
    nationwidePricing:
      pricingSettings.find((entry: any) => entry.pricingScope === "NATIONWIDE") ?? null,
    statePricing: pricingSettings
      .filter((entry: any) => entry.pricingScope === "STATE")
      .sort((left: any, right: any) => (left.state || "").localeCompare(right.state || "")),
    pricingSettings,
    coverageAreas,
  };
}

async function findLogisticsUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...authUserSelect,
      logisticsProfile: {
        include: {
          pricingSettings: {
            where: { isActive: true },
            orderBy: [{ pricingScope: "asc" }, { state: "asc" }],
          },
          coverageAreas: {
            where: { isActive: true },
            orderBy: [{ state: "asc" }, { lga: "asc" }, { city: "asc" }, { area: "asc" }],
          },
        },
      },
    },
  });
}

function buildCoverageAreaRows(
  logisticsCompanyId: string,
  coverage: z.infer<typeof coverageSettingsSchema>
) {
  if (coverage.coverageType === LogisticsCoverageType.NATIONWIDE) {
    return [
      {
        logisticsCompanyId,
        coverageType: LogisticsCoverageType.NATIONWIDE,
        selectionType: null,
        state: null,
        lga: null,
        city: null,
        area: null,
        isActive: true,
      },
    ];
  }

  return uniqueStates(coverage.states).map((state) => ({
    logisticsCompanyId,
    coverageType: LogisticsCoverageType.REGIONAL,
    selectionType: "STATE" as const,
    state,
    lga: null,
    city: null,
    area: null,
    isActive: true,
  }));
}

function buildPricingRows(args: {
  logisticsCompanyId: string;
  coverageType: LogisticsCoverageType;
  pricing: z.infer<typeof logisticsPricingUpdateSchema>;
  coveredStates: string[];
}) {
  if (args.coverageType === LogisticsCoverageType.NATIONWIDE) {
    if (!args.pricing.nationwidePricing) {
      return [];
    }

    return [
      {
        logisticsCompanyId: args.logisticsCompanyId,
        pricingScope: "NATIONWIDE" as const,
        state: "",
        minimumFee: args.pricing.nationwidePricing.minimumFee,
        additionalUnitFee: args.pricing.nationwidePricing.additionalUnitFee,
        weightUnitSizeKg: args.pricing.nationwidePricing.weightUnitSizeKg,
        volumetricDivisor: args.pricing.nationwidePricing.volumetricDivisor,
        isActive: true,
      },
    ];
  }

  const coveredStateSet = new Set(args.coveredStates.map((state) => state.toLowerCase()));
  const uniqueStatePricing = new Map<string, z.infer<typeof statePricingSchema>>();
  for (const row of args.pricing.statePricing) {
    uniqueStatePricing.set(row.state.trim().toLowerCase(), {
      ...row,
      state: row.state.trim(),
    });
  }

  return Array.from(uniqueStatePricing.values())
    .filter((row) => coveredStateSet.has(row.state.toLowerCase()))
    .map((row) => ({
      logisticsCompanyId: args.logisticsCompanyId,
      pricingScope: "STATE" as const,
      state: row.state,
      minimumFee: row.minimumFee,
      additionalUnitFee: row.additionalUnitFee,
      weightUnitSizeKg: row.weightUnitSizeKg,
      volumetricDivisor: row.volumetricDivisor,
      isActive: row.isActive,
    }));
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const logisticsUser = await findLogisticsUser(user.id);
    if (!logisticsUser) {
      return NextResponse.json(
        { success: false, message: "Logistics profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...serializeLogisticsProfile(logisticsUser),
    });
  } catch (error) {
    console.error("[LOGISTICS_PROFILE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch logistics profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = logisticsProfileUpdateSchema.parse(await request.json());
    const logisticsCompanyId = user.logisticsProfile.id;
    const currentLogisticsUser: any = await findLogisticsUser(user.id);

    if (!currentLogisticsUser) {
      return NextResponse.json(
        { success: false, message: "Logistics profile not found" },
        { status: 404 }
      );
    }

    if (payload.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email: normalizeEmail(payload.email) },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 409 }
        );
      }
    }

    const nextCoverage =
      payload.coverage ??
      (() => {
        const existingCoverageType = currentLogisticsUser.logisticsProfile?.coverageAreas?.some(
          (area: any) => area.coverageType === LogisticsCoverageType.NATIONWIDE
        )
          ? LogisticsCoverageType.NATIONWIDE
          : LogisticsCoverageType.REGIONAL;
        const existingStates = uniqueStates(
          (currentLogisticsUser.logisticsProfile?.coverageAreas ?? [])
            .map((area: any) => area.state)
            .filter((state: string | null): state is string => Boolean(state))
        );

        return {
          coverageType: existingCoverageType,
          states: existingStates,
        };
      })();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(payload.fullName !== undefined
            ? { fullName: payload.fullName.trim() }
            : {}),
          ...(payload.email !== undefined
            ? { email: normalizeEmail(payload.email) }
            : {}),
          ...(payload.phone !== undefined
            ? { phone: payload.phone?.trim() || null }
            : {}),
          logisticsProfile: {
            update: {
              ...(payload.companyName !== undefined
                ? { companyName: payload.companyName.trim() }
                : {}),
              ...(payload.description !== undefined
                ? { description: payload.description?.trim() || null }
                : {}),
              ...(payload.contactPersonName !== undefined
                ? { contactPersonName: payload.contactPersonName?.trim() || null }
                : {}),
              ...(payload.phone !== undefined
                ? { phone: payload.phone?.trim() || null }
                : {}),
              ...(payload.businessAddress !== undefined
                ? { businessAddress: payload.businessAddress?.trim() || null }
                : {}),
              ...(payload.city !== undefined
                ? { city: payload.city?.trim() || null }
                : {}),
              ...(payload.state !== undefined
                ? { state: payload.state?.trim() || null }
                : {}),
              ...(payload.lga !== undefined
                ? { lga: payload.lga?.trim() || null }
                : {}),
              ...(payload.area !== undefined
                ? { area: payload.area?.trim() || null }
                : {}),
              ...(payload.latitude !== undefined
                ? { latitude: payload.latitude }
                : {}),
              ...(payload.longitude !== undefined
                ? { longitude: payload.longitude }
                : {}),
            },
          },
        },
      });

      if (payload.coverage) {
        const coverageRows = buildCoverageAreaRows(logisticsCompanyId, payload.coverage);
        await tx.logisticsCoverageArea.deleteMany({
          where: { logisticsCompanyId },
        });

        if (coverageRows.length > 0) {
          const coverageIds = await reserveSequentialIds(
            tx,
            "logistics_coverage_area",
            coverageRows.length
          );
          await tx.logisticsCoverageArea.createMany({
            data: coverageRows.map((row, index) => ({
              id: coverageIds[index],
              ...row,
            })),
          });
        }
      }

      if (payload.pricing) {
        const coveredStates = uniqueStates(nextCoverage.states);
        const pricingRows = buildPricingRows({
          logisticsCompanyId,
          coverageType: nextCoverage.coverageType,
          pricing: payload.pricing,
          coveredStates,
        });

        await tx.logisticsPricingSetting.deleteMany({
          where: { logisticsCompanyId },
        });

        if (pricingRows.length > 0) {
          const pricingIds = await reserveSequentialIds(
            tx,
            "logistics_pricing_settings",
            pricingRows.length
          );
          await tx.logisticsPricingSetting.createMany({
            data: pricingRows.map((row, index) => ({
              id: pricingIds[index],
              ...row,
            })),
          });
        }
      }
    });

    const updatedUser = await findLogisticsUser(user.id);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "Logistics profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Logistics profile updated successfully",
      ...serializeLogisticsProfile(updatedUser),
    });
  } catch (error) {
    console.error("[LOGISTICS_PROFILE_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message ?? "Invalid logistics profile payload",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update logistics profile" },
      { status: 500 }
    );
  }
}
