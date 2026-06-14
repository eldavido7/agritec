import { PaymentStatus, SellerOrderGroupStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendBuyerOrderGroupStatusEmail } from "@/lib/email";
import { initiateSellerOrderGroupRefund } from "@/lib/refund-utils";
import { updateSellerOrderGroupStatus } from "@/lib/seller-order-group-utils";

const statusSchema = z.object({
  status: z.nativeEnum(SellerOrderGroupStatus),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = statusSchema.parse(await request.json());

    if (payload.status === SellerOrderGroupStatus.REFUNDED) {
      return NextResponse.json(
        { success: false, message: "Refunded status is system-managed and cannot be set manually." },
        { status: 400 },
      );
    }

    const sellerOrderGroup = await updateSellerOrderGroupStatus({
      sellerOrderGroupId: id,
      nextStatus: payload.status,
      actorRole: "ADMIN",
      actorAdminId: user.id,
    });

    let refund = null;
    if (
      payload.status === SellerOrderGroupStatus.CANCELLED &&
      sellerOrderGroup.parentOrder?.payment?.status === PaymentStatus.PAID
    ) {
      try {
        refund = await initiateSellerOrderGroupRefund({
          sellerOrderGroupId: sellerOrderGroup.id,
          adminId: user.id,
        });
      } catch (refundError) {
        console.error("[ADMIN_ORDER_GROUP_REFUND_INIT_ERROR]", refundError);
      }
    }

    const refreshedOrderGroup = await prisma.sellerOrderGroup.findUnique({
      where: { id: sellerOrderGroup.id },
      include: {
        items: true,
        refunds: true,
        seller: { include: { user: true } },
        parentOrder: {
          include: {
            addressSnapshot: true,
            refunds: true,
            payment: { include: { refunds: true } },
            buyer: { include: { user: true } },
          },
        },
      },
    });

    const result = refreshedOrderGroup ?? sellerOrderGroup;
    const buyerUser = result.parentOrder?.buyer?.user;
    const addressSnapshot = result.parentOrder?.addressSnapshot;

    if (buyerUser?.email) {
      sendBuyerOrderGroupStatusEmail({
        toEmail: buyerUser.email,
        buyerName: buyerUser.fullName,
        parentOrderId: result.parentOrderId,
        sellerOrderGroupId: result.id,
        farmName: result.farmNameSnapshot,
        status: result.status,
        productSubtotal: result.productSubtotal,
        shippingFee: result.shippingFee,
        groupTotal: result.groupTotal,
        deliveryRegion: result.deliveryRegion,
        addressLine: addressSnapshot?.addressLine ?? null,
        fullAddress: addressSnapshot?.fullAddress ?? null,
      }).catch((error) => {
        console.error("[ORDER_GROUP_STATUS_EMAIL_ERROR]", error);
      });
    }

    return NextResponse.json({
      success: true,
      message: payload.status === SellerOrderGroupStatus.CANCELLED
        ? refund
          ? "Order group cancelled and refund initiated successfully"
          : "Order group cancelled successfully"
        : "Order group status updated successfully",
      sellerOrderGroup: result,
      refund,
    });
  } catch (error) {
    console.error("[ADMIN_ORDER_GROUP_STATUS_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid status" },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to update order group status";
    switch (message) {
      case "SELLER_ORDER_GROUP_NOT_FOUND":
        return NextResponse.json({ success: false, message: "Order group not found" }, { status: 404 });
      case "ORDER_GROUP_ALREADY_CLOSED":
      case "DELIVERED_GROUP_CANNOT_BE_CANCELLED_HERE":
      case "SELLER_ORDER_GROUP_MUST_BE_CANCELLED_BEFORE_REFUND":
      case "SELLER_ORDER_GROUP_PAYMENT_NOT_ELIGIBLE_FOR_REFUND":
        return NextResponse.json({ success: false, message }, { status: 400 });
      default:
        return NextResponse.json({ success: false, message: "Failed to update order group status" }, { status: 500 });
    }
  }
}
