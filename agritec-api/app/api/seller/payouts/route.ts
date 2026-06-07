import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { requestSellerFullPayout } from "@/lib/payout-utils";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payouts = await prisma.withdrawalRequest.findMany({
      where: { sellerId: user.sellerProfile.id },
      include: {
        bankAccount: true,
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ success: true, payouts });
  } catch (error) {
    console.error("[SELLER_PAYOUTS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payout = await requestSellerFullPayout({
      sellerId: user.sellerProfile.id,
      trigger: "manual",
    });

    return NextResponse.json({
      success: true,
      message: "Payout request created successfully",
      payout,
    });
  } catch (error) {
    console.error("[SELLER_PAYOUTS_POST_ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to request payout";

    switch (message) {
      case "BANK_ACCOUNT_NOT_VERIFIED_FOR_PAYOUTS":
        return NextResponse.json(
          { success: false, message: "Please verify your bank account before receiving payouts." },
          { status: 400 }
        );
      case "PAYOUT_ALREADY_IN_PROGRESS":
        return NextResponse.json(
          { success: false, message: "A payout is already in progress for this seller." },
          { status: 409 }
        );
      case "NO_AVAILABLE_BALANCE_FOR_PAYOUT":
        return NextResponse.json(
          { success: false, message: "You can only request payout of your full available balance." },
          { status: 400 }
        );
      default:
        return NextResponse.json({ success: false, message: "Failed to request payout" }, { status: 500 });
    }
  }
}
