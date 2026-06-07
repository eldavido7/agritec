import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payouts = await prisma.withdrawalRequest.findMany({
      include: {
        seller: { include: { user: true } },
        wallet: true,
        bankAccount: true,
        approvedByAdmin: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ success: true, payouts });
  } catch (error) {
    console.error("[ADMIN_PAYOUTS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch payouts" }, { status: 500 });
  }
}
