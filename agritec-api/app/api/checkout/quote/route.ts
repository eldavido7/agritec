import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { decimalToNumber } from "@/lib/checkout-utils";
import { buildCheckoutQuote } from "@/lib/checkout-quote";

const quoteSchema = z.object({
  addressId: z.string().trim().min(1, "Address is required"),
  discountCodes: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  logisticsSelections: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  allGroupsLogisticsCompanyId: z.string().trim().min(1).optional().nullable(),
});

function quoteErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, message: error.issues[0]?.message ?? "Invalid checkout quote payload" },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed to generate checkout quote";

  switch (message) {
    case "ADDRESS_NOT_FOUND":
      return NextResponse.json({ success: false, message: "Selected address was not found" }, { status: 404 });
    case "CART_NOT_FOUND":
      return NextResponse.json({ success: false, message: "Cart not found" }, { status: 404 });
    case "SHIPPING_SETTINGS_NOT_CONFIGURED":
      return NextResponse.json(
        { success: false, message: "Shipping settings are not configured" },
        { status: 500 }
      );
    case "LOGISTICS_COMPANY_NOT_FOUND":
      return NextResponse.json(
        { success: false, message: "Selected logistics company was not found" },
        { status: 404 }
      );
    case "NO_ELIGIBLE_LOGISTICS_COMPANIES":
      return NextResponse.json(
        { success: false, message: "No eligible logistics companies are available for this address" },
        { status: 400 }
      );
    case "CART_EMPTY":
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    default:
      if (message.startsWith("LOGISTICS_SELECTION_REQUIRED:")) {
        return NextResponse.json(
          { success: false, message: "Logistics selection is required for each seller group" },
          { status: 400 }
        );
      }
      if (message.startsWith("LOGISTICS_COMPANY_NOT_ELIGIBLE:")) {
        return NextResponse.json(
          { success: false, message: "Selected logistics company is not eligible for one or more seller groups" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, message: "Failed to generate checkout quote" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const payload = quoteSchema.parse(rawBody);
    const quote = await buildCheckoutQuote({
      buyerId: user.buyerProfile.id,
      addressId: payload.addressId,
      discountCodes: payload.discountCodes,
      logisticsSelections: payload.logisticsSelections,
      allGroupsLogisticsCompanyId: payload.allGroupsLogisticsCompanyId ?? null,
      allowPlatformFallbackWithoutSelection: true,
    });

    return NextResponse.json({
      success: true,
      quote: {
        buyerId: quote.buyerId,
        address: {
          ...quote.address,
          latitude: quote.address.latitude ? Number(quote.address.latitude) : null,
          longitude: quote.address.longitude ? Number(quote.address.longitude) : null,
        },
        productSubtotal: quote.productSubtotal,
        totalShippingFee: quote.totalShippingFee,
        discountTotal: quote.discountTotal,
        grandTotal: quote.grandTotal,
        currencyCode: quote.currencyCode,
        allGroupsLogisticsCompanyId: quote.allGroupsLogisticsCompanyId,
        sellerGroups: quote.sellerGroups.map((group) => ({
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          farmName: group.farmName,
          logisticsCompanyId: group.logisticsCompanyId,
          logisticsCompanyName: group.logisticsCompanyName,
          deliveryRegion: group.deliveryRegion,
          productSubtotal: group.productSubtotal,
          discountTotal: group.discountTotal,
          shippingFee: group.shippingFee,
          groupTotal: group.groupTotal,
          totalChargeableWeightKg: group.totalChargeableWeightKg,
          weightUnitSizeKg: group.weightUnitSizeKg,
          shippingUnits: group.shippingUnits,
          minimumFee: group.minimumFee,
          additionalUnitFee: group.additionalUnitFee,
          shippingPricedBy: group.shippingPricedBy,
          discountCode: group.discountCode,
          discountApplied: group.discountApplied,
          discountSummary: group.discountSummary,
          eligibleLogisticsCompanies: group.eligibleLogisticsCompanies.map((company) => ({
            id: company.id,
            companyName: company.companyName,
            verificationStatus: company.verificationStatus,
            coverageType: company.coverageSummary.coverageType,
            coveredStates: company.coverageSummary.coveredStates,
            pricing: company.pricing,
            coverageSummary: company.coverageSummary,
          })),
          items: group.items.map((item) => ({
            id: item.cartItemId,
            lineKey: item.lineKey,
            quantity: item.quantity,
            product: item.productSerialized,
            variant: item.variant
              ? {
                  ...item.variant,
                  unitWeightKg: decimalToNumber(item.variant.unitWeightKg),
                  unitLengthCm: decimalToNumber(item.variant.unitLengthCm),
                  unitWidthCm: decimalToNumber(item.variant.unitWidthCm),
                  unitHeightCm: decimalToNumber(item.variant.unitHeightCm),
                }
              : null,
            salesUnit: item.salesUnit,
            packageType: item.packageType,
            unitPrice: item.unitPrice,
            actualWeightKg: item.actualWeightKg,
            volumetricWeightKg: item.volumetricWeightKg,
            unitChargeableWeightKg: item.unitChargeableWeightKg,
            lineChargeableWeightKg: item.lineChargeableWeightKg,
            lineSubtotal: item.lineSubtotal,
            lineDiscountTotal: item.lineDiscountTotal,
            lineTotal: item.lineTotal,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("[CHECKOUT_QUOTE_POST_ERROR]", error);
    return quoteErrorResponse(error);
  }
}
