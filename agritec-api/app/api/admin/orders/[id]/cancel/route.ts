import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";
import { cancelParentOrderAndInitiateRefunds } from "@/lib/refund-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await cancelParentOrderAndInitiateRefunds({
      parentOrderId: id,
      adminId: admin.id,
    });

    return NextResponse.json({
      success: true,
      message: "Order cancellation processed successfully",
      order: serializeOrder(result.order),
      refunds: result.refunds,
    });
  } catch (error) {
    console.error("[ADMIN_ORDER_CANCEL_POST_ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to cancel order";

    switch (message) {
      case "PARENT_ORDER_NOT_FOUND":
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      case "DELIVERED_GROUP_CANNOT_BE_CANCELLED_HERE":
        return NextResponse.json(
          { success: false, message: "Delivered seller groups cannot be cancelled or refunded automatically." },
          { status: 400 },
        );
      default:
        return NextResponse.json({ success: false, message: "Failed to cancel order" }, { status: 500 });
    }
  }
}
