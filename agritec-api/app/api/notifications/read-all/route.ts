import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    console.error("[NOTIFICATIONS_READ_ALL_PATCH_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to mark notifications as read" }, { status: 500 });
  }
}
