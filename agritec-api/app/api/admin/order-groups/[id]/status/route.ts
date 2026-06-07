import { NextResponse } from "next/server";
import { SellerOrderGroupStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { sendBuyerOrderGroupStatusEmail } from "@/lib/email";
import { updateSellerOrderGroupStatus } from "@/lib/seller-order-group-utils";

const statusSchema = z.object({
  status: z.nativeEnum(SellerOrderGroupStatus),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = statusSchema.parse(await request.json());
    const sellerOrderGroup = await updateSellerOrderGroupStatus({
      sellerOrderGroupId: id,
      nextStatus: payload.status,
      actorRole: "ADMIN",
      actorAdminId: user.id,
    });

    const buyerUser = sellerOrderGroup.parentOrder?.buyer?.user;
    const addressSnapshot = sellerOrderGroup.parentOrder?.addressSnapshot;

    if (buyerUser?.email) {
      sendBuyerOrderGroupStatusEmail({
        toEmail: buyerUser.email,
        buyerName: buyerUser.fullName,
        parentOrderId: sellerOrderGroup.parentOrderId,
        sellerOrderGroupId: sellerOrderGroup.id,
        farmName: sellerOrderGroup.farmNameSnapshot,
        status: sellerOrderGroup.status,
        productSubtotal: sellerOrderGroup.productSubtotal,
        shippingFee: sellerOrderGroup.shippingFee,
        groupTotal: sellerOrderGroup.groupTotal,
        deliveryRegion: sellerOrderGroup.deliveryRegion,
        addressLine: addressSnapshot?.addressLine ?? null,
        fullAddress: addressSnapshot?.fullAddress ?? null,
      }).catch((error) => {
        console.error("[ORDER_GROUP_STATUS_EMAIL_ERROR]", error);
      });
    }

    return NextResponse.json({
      success: true,
      message: "Order group status updated successfully",
      sellerOrderGroup,
    });
  } catch (error) {
    console.error("[ADMIN_ORDER_GROUP_STATUS_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid status" },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to update order group status";
    switch (message) {
      case "SELLER_ORDER_GROUP_NOT_FOUND":
        return NextResponse.json({ success: false, message: "Order group not found" }, { status: 404 });
      case "ORDER_GROUP_ALREADY_CLOSED":
      case "DELIVERED_GROUP_CANNOT_BE_CANCELLED_HERE":
        return NextResponse.json({ success: false, message }, { status: 400 });
      default:
        return NextResponse.json({ success: false, message: "Failed to update order group status" }, { status: 500 });
    }
  }
}
