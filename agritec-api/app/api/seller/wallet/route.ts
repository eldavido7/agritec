import { NextResponse } from "next/server";
import { UserRole, WithdrawalStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getOrCreateSellerWallet } from "@/lib/wallet-utils";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { id: user.sellerProfile.id },
      include: {
        bankAccount: true,
        wallet: true,
        withdrawalRequests: {
          where: {
            status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING] },
          },
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }

    const wallet = seller.wallet ?? (await prisma.$transaction((tx) => getOrCreateSellerWallet(tx, seller.id)));

    return NextResponse.json({
      success: true,
      wallet,
      bankAccount: seller.bankAccount,
      autoPayoutEnabled: seller.autoPayoutEnabled,
      activeWithdrawal: seller.withdrawalRequests[0] ?? null,
      canRequestPayout:
        wallet.availableBalance > 0 &&
        wallet.processingBalance === 0 &&
        Boolean(seller.bankAccount?.isVerified) &&
        Boolean(seller.bankAccount?.paystackRecipientCode),
    });
  } catch (error) {
    console.error("[SELLER_WALLET_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller wallet" }, { status: 500 });
  }
}
