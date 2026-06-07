import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeShippingSettings } from "@/lib/marketplace-serializers";

export async function GET() {
  try {
    const [platformSettings, shippingSettings, commissionSettings, payoutSettings] = await Promise.all([
      prisma.platformSettings.findUnique({ where: { id: "platform" } }),
      prisma.shippingSettings.findUnique({ where: { id: "shipping" } }),
      prisma.commissionSettings.findUnique({ where: { id: "commission" } }),
      prisma.payoutSettings.findUnique({ where: { id: "payout" } }),
    ]);

    return NextResponse.json({
      success: true,
      platformSettings,
      shippingSettings: shippingSettings ? serializeShippingSettings(shippingSettings) : null,
      commissionSettings,
      payoutSettings,
    });
  } catch (error) {
    console.error("[PLATFORM_SETTINGS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch platform settings" },
      { status: 500 }
    );
  }
}
