import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { buildEligibleCheckoutLogistics } from "@/lib/checkout-quote";

const eligibleLogisticsSchema = z.object({
  addressId: z.string().trim().min(1, "Address is required"),
});

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, message: error.issues[0]?.message ?? "Invalid eligible logistics payload" },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed to load eligible logistics companies";
  switch (message) {
    case "ADDRESS_NOT_FOUND":
      return NextResponse.json({ success: false, message: "Selected address was not found" }, { status: 404 });
    case "CART_NOT_FOUND":
      return NextResponse.json({ success: false, message: "Cart not found" }, { status: 404 });
    case "CART_EMPTY":
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    case "NO_ELIGIBLE_LOGISTICS_COMPANIES":
      return NextResponse.json(
        { success: false, message: "No eligible logistics companies are available for this address" },
        { status: 400 }
      );
    default:
      return NextResponse.json(
        { success: false, message: "Failed to load eligible logistics companies" },
        { status: 500 }
      );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = eligibleLogisticsSchema.parse(await request.json());
    const result = await buildEligibleCheckoutLogistics({
      buyerId: user.buyerProfile.id,
      addressId: payload.addressId,
    });

    return NextResponse.json({ success: true, eligibleLogistics: result });
  } catch (error) {
    console.error("[CHECKOUT_ELIGIBLE_LOGISTICS_POST_ERROR]", error);
    return errorResponse(error);
  }
}
