import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const order = await prisma.parentOrder.findUnique({
      where: { id },
      include: {
        addressSnapshot: true,
        refunds: true,
        payment: { include: { refunds: true } },
        sellerGroups: {
          include: {
            items: true,
            refunds: true,
            seller: {
              select: {
                id: true,
                fullAddress: true,
                latitude: true,
                longitude: true,
              },
            },
            logisticsCompany: { include: { user: true } },
            statusHistory: {
              include: {
                updatedByUser: {
                  select: { id: true, fullName: true, role: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 },
      );
    }

    if (user.role === UserRole.BUYER && user.buyerProfile && order.buyerId !== user.buyerProfile.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const visibleOrder =
      user.role === UserRole.SELLER && user.sellerProfile
        ? {
            ...order,
            sellerGroups: order.sellerGroups.filter((group) => group.sellerId === user.sellerProfile?.id),
          }
        : order;

    if (user.role === UserRole.SELLER && (!visibleOrder.sellerGroups || visibleOrder.sellerGroups.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      order: serializeOrder(visibleOrder),
    });
  } catch (error) {
    console.error("[ORDER_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      message: "Order updates will be handled by dedicated buyer, seller, and admin order workflows and are not implemented on this legacy endpoint.",
    },
    { status: 501 },
  );
}
