import {
  LogisticsCoverageSelectionType,
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
import { reserveSequentialId, reserveSequentialIds } from "@/lib/id-sequence";

const pricingSettingsSchema = z.object({
  abujaMinimumFee: z.number().int().min(0),
  abujaAdditionalUnitFee: z.number().int().min(0),
  outsideMinimumFee: z.number().int().min(0),
  outsideAdditionalUnitFee: z.number().int().min(0),
  weightUnitSizeKg: z.number().positive(),
  volumetricDivisor: z.number().int().positive(),
  weeklyAutoPayoutDay: z.number().int().min(0).max(6).nullable().optional(),
});

const coverageAreaInputSchema = z.object({
  selectionType: z.nativeEnum(LogisticsCoverageSelectionType),
  state: z.string().trim().min(1),
  lga: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  area: z.string().trim().nullable().optional(),
});

const coverageSettingsSchema = z.object({
  coverageType: z.nativeEnum(LogisticsCoverageType),
  areas: z.array(coverageAreaInputSchema).default([]),
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
  pricingSettings: pricingSettingsSchema.optional(),
  coverage: coverageSettingsSchema.optional(),
});

function serializePricingSettings(settings: any) {
  if (!settings) {
    return null;
  }

  return {
    ...settings,
    weightUnitSizeKg:
      settings.weightUnitSizeKg == null ? null : Number(settings.weightUnitSizeKg),
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

function serializeLogisticsProfile(user: any) {
  return {
    user: serializeAuthUser(user),
    pricingSettings: serializePricingSettings(user.logisticsProfile?.pricingSettings ?? null),
    coverageAreas: Array.isArray(user.logisticsProfile?.coverageAreas)
      ? user.logisticsProfile.coverageAreas.map(serializeCoverageArea)
      : [],
  };
}

async function findLogisticsUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...authUserSelect,
      logisticsProfile: {
        include: {
          pricingSettings: true,
          coverageAreas: {
            where: { isActive: true },
            orderBy: [{ state: "asc" }, { lga: "asc" }, { city: "asc" }, { area: "asc" }],
          },
        },
      },
    },
  });
}

function normalizeCoverageAreas(
  coverageType: LogisticsCoverageType,
  areas: z.infer<typeof coverageAreaInputSchema>[]
) {
  if (coverageType === LogisticsCoverageType.NATIONWIDE) {
    return [
      {
        coverageType: LogisticsCoverageType.NATIONWIDE,
        selectionType: null,
        state: null,
        lga: null,
        city: null,
        area: null,
      },
    ];
  }

  const normalized = areas.map((area) => ({
    coverageType: LogisticsCoverageType.REGIONAL,
    selectionType: area.selectionType,
    state: area.state.trim(),
    lga: area.lga?.trim() || null,
    city: area.city?.trim() || null,
    area: area.area?.trim() || null,
  }));

  const unique = new Map<string, (typeof normalized)[number]>();
  for (const area of normalized) {
    const key = [
      area.coverageType,
      area.selectionType,
      area.state,
      area.lga,
      area.city,
      area.area,
    ].join("::");
    unique.set(key, area);
  }

  return Array.from(unique.values());
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

      if (payload.pricingSettings) {
        const existingPricingSettings = await tx.logisticsPricingSettings.findUnique({
          where: { logisticsCompanyId },
          select: { id: true },
        });

        if (existingPricingSettings) {
          await tx.logisticsPricingSettings.update({
            where: { logisticsCompanyId },
            data: payload.pricingSettings,
          });
        } else {
          const pricingSettingsId = await reserveSequentialId(
            tx,
            "logistics_pricing_settings"
          );

          await tx.logisticsPricingSettings.create({
            data: {
              id: pricingSettingsId,
              logisticsCompanyId,
              ...payload.pricingSettings,
            },
          });
        }
      }

      if (payload.coverage) {
        const normalizedCoverageAreas = normalizeCoverageAreas(
          payload.coverage.coverageType,
          payload.coverage.areas
        );

        await tx.logisticsCoverageArea.deleteMany({
          where: { logisticsCompanyId },
        });

        if (normalizedCoverageAreas.length > 0) {
          const coverageAreaIds = await reserveSequentialIds(
            tx,
            "logistics_coverage_area",
            normalizedCoverageAreas.length
          );

          await tx.logisticsCoverageArea.createMany({
            data: normalizedCoverageAreas.map((area, index) => ({
              id: coverageAreaIds[index],
              logisticsCompanyId,
              coverageType: area.coverageType,
              selectionType: area.selectionType,
              state: area.state,
              lga: area.lga,
              city: area.city,
              area: area.area,
              isActive: true,
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
