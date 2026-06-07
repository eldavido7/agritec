import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { listPaystackBanks } from "@/lib/paystack";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const banks = await listPaystackBanks();

    return NextResponse.json({
      success: true,
      banks: banks.map((bank) => ({
        id: bank.id,
        name: bank.name,
        code: bank.code,
      })),
    });
  } catch (error) {
    console.error("[SELLER_BANKS_GET_ERROR]", error);
    if (error instanceof Error && error.message === "PAYSTACK_SECRET_KEY_NOT_CONFIGURED") {
      return NextResponse.json(
        { success: false, message: "Paystack is not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}
