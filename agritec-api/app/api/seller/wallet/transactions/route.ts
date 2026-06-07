import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const wallet = await prisma.sellerWallet.findUnique({
      where: { sellerId: user.sellerProfile.id },
      select: { id: true },
    });

    if (!wallet) {
      return NextResponse.json({ success: true, transactions: [] });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error("[SELLER_WALLET_TRANSACTIONS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch wallet transactions" }, { status: 500 });
  }
}
