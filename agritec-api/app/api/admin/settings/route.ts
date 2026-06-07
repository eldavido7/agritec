import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializePlatformSettings } from "@/lib/admin-settings-utils";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/wallet-utils";

const patchSchema = z.object({
  platform: z.object({
    marketplaceName: z.string().trim().min(1).optional(),
    currencyCode: z.string().trim().min(1).optional(),
    countryCode: z.string().trim().min(1).optional(),
    supportEmail: z.string().trim().email().nullable().optional(),
  }).optional(),
  shipping: z.object({
    abujaRatePerShippingUnit: z.number().int().nonnegative().optional(),
    outsideAbujaRatePerShippingUnit: z.number().int().nonnegative().optional(),
    weightUnitSizeKg: z.number().positive().optional(),
    volumetricDivisor: z.number().int().positive().optional(),
  }).optional(),
  commission: z.object({
    commissionRateBps: z.number().int().min(0).max(10000).optional(),
    commissionRatePercent: z.number().min(0).max(100).optional(),
  }).optional(),
  payout: z.object({
    autoPayoutThreshold: z.number().int().nonnegative().optional(),
    weeklyPayoutDay: z.number().int().min(0).max(6).nullable().optional(),
  }).optional(),
}).refine((value) => Boolean(value.platform || value.shipping || value.commission || value.payout), {
  message: "At least one settings section must be provided",
});

export async function GET(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const [platform, shipping, commission, payout] = await Promise.all([
      prisma.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
      prisma.shippingSettings.findUniqueOrThrow({ where: { id: "shipping" } }),
      prisma.commissionSettings.findUniqueOrThrow({ where: { id: "commission" } }),
      prisma.payoutSettings.findUniqueOrThrow({ where: { id: "payout" } }),
    ]);

    return NextResponse.json({
      success: true,
      settings: serializePlatformSettings(platform, shipping, commission, payout),
    });
  } catch (error) {
    console.error("[ADMIN_SETTINGS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch admin settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = patchSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      if (payload.platform) {
        await tx.platformSettings.update({
          where: { id: "platform" },
          data: {
            ...(payload.platform.marketplaceName !== undefined ? { marketplaceName: payload.platform.marketplaceName } : {}),
            ...(payload.platform.currencyCode !== undefined ? { currencyCode: payload.platform.currencyCode.toUpperCase() } : {}),
            ...(payload.platform.countryCode !== undefined ? { countryCode: payload.platform.countryCode.toUpperCase() } : {}),
            ...(payload.platform.supportEmail !== undefined ? { supportEmail: payload.platform.supportEmail?.toLowerCase() ?? null } : {}),
          },
        });
      }

      if (payload.shipping) {
        await tx.shippingSettings.update({
          where: { id: "shipping" },
          data: {
            ...(payload.shipping.abujaRatePerShippingUnit !== undefined ? { abujaRatePerShippingUnit: payload.shipping.abujaRatePerShippingUnit } : {}),
            ...(payload.shipping.outsideAbujaRatePerShippingUnit !== undefined ? { outsideAbujaRatePerShippingUnit: payload.shipping.outsideAbujaRatePerShippingUnit } : {}),
            ...(payload.shipping.weightUnitSizeKg !== undefined ? { weightUnitSizeKg: payload.shipping.weightUnitSizeKg } : {}),
            ...(payload.shipping.volumetricDivisor !== undefined ? { volumetricDivisor: payload.shipping.volumetricDivisor } : {}),
          },
        });
      }

      if (payload.commission) {
        const commissionRateBps = payload.commission.commissionRateBps ?? (payload.commission.commissionRatePercent !== undefined ? Math.round(payload.commission.commissionRatePercent * 100) : undefined);
        if (commissionRateBps !== undefined) {
          await tx.commissionSettings.update({
            where: { id: "commission" },
            data: { commissionRateBps },
          });
        }
      }

      if (payload.payout) {
        await tx.payoutSettings.update({
          where: { id: "payout" },
          data: {
            ...(payload.payout.autoPayoutThreshold !== undefined ? { autoPayoutThreshold: payload.payout.autoPayoutThreshold } : {}),
            ...(payload.payout.weeklyPayoutDay !== undefined ? { weeklyPayoutDay: payload.payout.weeklyPayoutDay } : {}),
          },
        });
      }

      await createAuditLog(tx, {
        adminId: admin.id,
        action: "platform.settings.update",
        targetType: "platformSettings",
        targetId: "platform",
        metadata: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      });

      const [platform, shipping, commission, payout] = await Promise.all([
        tx.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
        tx.shippingSettings.findUniqueOrThrow({ where: { id: "shipping" } }),
        tx.commissionSettings.findUniqueOrThrow({ where: { id: "commission" } }),
        tx.payoutSettings.findUniqueOrThrow({ where: { id: "payout" } }),
      ]);

      return serializePlatformSettings(platform, shipping, commission, payout);
    });

    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error("[ADMIN_SETTINGS_PATCH_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid settings payload" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update admin settings" }, { status: 500 });
  }
}

