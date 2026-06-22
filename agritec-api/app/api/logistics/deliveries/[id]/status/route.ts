import { PaymentStatus, SellerOrderGroupStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { sendBuyerOrderGroupStatusEmail } from "@/lib/email";
import { initiateSellerOrderGroupRefund } from "@/lib/refund-utils";
import { updateSellerOrderGroupStatus } from "@/lib/seller-order-group-utils";

const statusSchema = z.object({
  status: z.nativeEnum(SellerOrderGroupStatus),
  description: z.string().trim().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = statusSchema.parse(await request.json());

    if (
      payload.status === SellerOrderGroupStatus.PENDING ||
      payload.status === SellerOrderGroupStatus.CONFIRMED ||
      payload.status === SellerOrderGroupStatus.REFUNDED
    ) {
      return NextResponse.json(
        { success: false, message: "This status cannot be set by logistics companies." },
        { status: 400 }
      );
    }

    const delivery = await updateSellerOrderGroupStatus({
      sellerOrderGroupId: id,
      nextStatus: payload.status,
      actorRole: "LOGISTICS",
      actorUserId: user.id,
      description: payload.description ?? null,
    });

    let refund = null;
    if (
      payload.status === SellerOrderGroupStatus.CANCELLED &&
      delivery.parentOrder?.payment?.status === PaymentStatus.PAID
    ) {
      try {
        refund = await initiateSellerOrderGroupRefund({
          sellerOrderGroupId: delivery.id,
          adminId: null,
        });
      } catch (refundError) {
        console.error("[LOGISTICS_ORDER_GROUP_REFUND_INIT_ERROR]", refundError);
      }
    }

    const refreshedDelivery = await prisma.sellerOrderGroup.findUnique({
      where: { id: delivery.id },
      include: {
        items: true,
        refunds: true,
        logisticsCompany: { include: { user: true } },
        statusHistory: {
          include: {
            updatedByUser: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
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

    const result = refreshedDelivery ?? delivery;
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
        description: payload.description ?? null,
        productSubtotal: result.productSubtotal,
        shippingFee: result.shippingFee,
        groupTotal: result.groupTotal,
        deliveryRegion: result.deliveryRegion,
        addressLine: addressSnapshot?.addressLine ?? null,
        fullAddress: addressSnapshot?.fullAddress ?? null,
      }).catch((error) => {
        console.error("[LOGISTICS_ORDER_GROUP_STATUS_EMAIL_ERROR]", error);
      });
    }

    return NextResponse.json({
      success: true,
      message:
        payload.status === SellerOrderGroupStatus.CANCELLED
          ? refund
            ? "Delivery cancelled and refund initiated successfully"
            : "Delivery cancelled successfully"
          : "Delivery status updated successfully",
      delivery: result,
      refund,
    });
  } catch (error) {
    console.error("[LOGISTICS_DELIVERY_STATUS_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid status payload" },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to update delivery status";
    switch (message) {
      case "SELLER_ORDER_GROUP_NOT_FOUND":
        return NextResponse.json({ success: false, message: "Delivery not found" }, { status: 404 });
      case "ORDER_GROUP_ALREADY_CLOSED":
      case "DELIVERED_GROUP_CANNOT_BE_CANCELLED_HERE":
      case "INVALID_LOGISTICS_STATUS_TRANSITION":
      case "LOGISTICS_NOT_ASSIGNED_TO_ORDER_GROUP":
      case "SELLER_ORDER_GROUP_MUST_BE_CANCELLED_BEFORE_REFUND":
      case "SELLER_ORDER_GROUP_PAYMENT_NOT_ELIGIBLE_FOR_REFUND":
        return NextResponse.json({ success: false, message }, { status: 400 });
      default:
        return NextResponse.json({ success: false, message: "Failed to update delivery status" }, { status: 500 });
    }
  }
}
