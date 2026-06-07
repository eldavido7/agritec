import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/marketplace-serializers";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/wallet-utils";

const buyerPatchSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

function serializeBuyerDetail(buyer: any) {
  return {
    id: buyer.id,
    userId: buyer.userId,
    fullName: buyer.user.fullName,
    email: buyer.user.email,
    phone: buyer.user.phone,
    isActive: buyer.user.isActive,
    emailVerifiedAt: buyer.user.emailVerifiedAt,
    lastActiveAt: buyer.user.lastActiveAt,
    createdAt: buyer.createdAt,
    updatedAt: buyer.updatedAt,
    addressCount: buyer._count.addresses,
    wishlistCount: buyer._count.wishlistItems,
    orderCount: buyer._count.orders,
    cartItemCount: buyer.cart?._count?.items ?? 0,
    addresses: buyer.addresses.map((address: any) => ({
      ...address,
      latitude: address.latitude == null ? null : Number(address.latitude),
      longitude: address.longitude == null ? null : Number(address.longitude),
    })),
    recentOrders: buyer.orders.map(serializeOrder),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const buyer = await prisma.buyerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            emailVerifiedAt: true,
            lastActiveAt: true,
          },
        },
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        cart: {
          select: {
            _count: { select: { items: true } },
          },
        },
        orders: {
          include: {
            addressSnapshot: true,
            payment: true,
            sellerGroups: { include: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            addresses: true,
            wishlistItems: true,
            orders: true,
          },
        },
      },
    });

    if (!buyer) {
      return NextResponse.json({ success: false, message: "Buyer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, buyer: serializeBuyerDetail(buyer) });
  } catch (error) {
    console.error("[ADMIN_BUYER_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch buyer" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = buyerPatchSchema.parse(await request.json());

    const buyer = await prisma.buyerProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!buyer) {
      return NextResponse.json({ success: false, message: "Buyer not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: buyer.userId },
        data: {
          ...(typeof payload.fullName === "string" ? { fullName: payload.fullName } : {}),
          ...(typeof payload.email === "string" ? { email: payload.email.toLowerCase() } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
          ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
        },
      });

      await createAuditLog(tx, {
        adminId: admin.id,
        action: "buyer.update",
        targetType: "buyerProfile",
        targetId: buyer.id,
        metadata: JSON.parse(JSON.stringify({
          userId: buyer.userId,
          changedFields: Object.keys(payload),
        })) as Prisma.InputJsonValue,
      });

      return tx.buyerProfile.findUniqueOrThrow({
        where: { id: buyer.id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              isActive: true,
              emailVerifiedAt: true,
              lastActiveAt: true,
            },
          },
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
          cart: { select: { _count: { select: { items: true } } } },
          orders: {
            include: {
              addressSnapshot: true,
              payment: true,
              sellerGroups: { include: { items: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: {
              addresses: true,
              wishlistItems: true,
              orders: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, buyer: serializeBuyerDetail(updated) });
  } catch (error: any) {
    console.error("[ADMIN_BUYER_PATCH_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to update buyer" }, { status: 500 });
  }
}
