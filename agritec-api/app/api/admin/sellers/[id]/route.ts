import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeOrder, serializeProduct } from "@/lib/marketplace-serializers";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/wallet-utils";

const sellerPatchSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  farmName: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  locationLabel: z.string().trim().nullable().optional(),
  fullAddress: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

function serializeSellerDetail(seller: any) {
  return {
    id: seller.id,
    userId: seller.userId,
    fullName: seller.user.fullName,
    email: seller.user.email,
    phone: seller.user.phone,
    isActive: seller.user.isActive,
    emailVerifiedAt: seller.user.emailVerifiedAt,
    lastActiveAt: seller.user.lastActiveAt,
    farmName: seller.farmName,
    description: seller.description,
    locationLabel: seller.locationLabel,
    fullAddress: seller.fullAddress,
    city: seller.city,
    state: seller.state,
    latitude: seller.latitude == null ? null : Number(seller.latitude),
    longitude: seller.longitude == null ? null : Number(seller.longitude),
    autoPayoutEnabled: seller.autoPayoutEnabled,
    bankAccount: seller.bankAccount,
    wallet: seller.wallet,
    productCount: seller._count.products,
    discountCount: seller._count.discounts,
    orderGroupCount: seller._count.sellerGroups,
    withdrawalCount: seller._count.withdrawalRequests,
    recentProducts: seller.products.map(serializeProduct),
    recentOrderGroups: seller.sellerGroups.map((group: any) => ({
      ...group,
      totalChargeableWeightKg: group.totalChargeableWeightKg == null ? null : Number(group.totalChargeableWeightKg),
      parentOrder: serializeOrder(group.parentOrder),
    })),
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
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
    const seller = await prisma.sellerProfile.findUnique({
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
        bankAccount: true,
        wallet: true,
        products: {
          where: { isDeleted: false },
          include: {
            category: true,
            variants: true,
            seller: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        sellerGroups: {
          include: {
            items: true,
            parentOrder: {
              include: {
                addressSnapshot: true,
                payment: true,
                sellerGroups: { include: { items: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            products: true,
            discounts: true,
            sellerGroups: true,
            withdrawalRequests: true,
          },
        },
      },
    });

    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, seller: serializeSellerDetail(seller) });
  } catch (error) {
    console.error("[ADMIN_SELLER_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller" }, { status: 500 });
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
    const payload = sellerPatchSchema.parse(await request.json());

    const seller = await prisma.sellerProfile.findUnique({ where: { id }, include: { user: true } });
    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: seller.userId },
        data: {
          ...(typeof payload.fullName === "string" ? { fullName: payload.fullName } : {}),
          ...(typeof payload.email === "string" ? { email: payload.email.toLowerCase() } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
          ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
        },
      });

      await tx.sellerProfile.update({
        where: { id: seller.id },
        data: {
          ...(typeof payload.farmName === "string" ? { farmName: payload.farmName } : {}),
          ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
          ...(payload.locationLabel !== undefined ? { locationLabel: payload.locationLabel?.trim() || null } : {}),
          ...(payload.fullAddress !== undefined ? { fullAddress: payload.fullAddress?.trim() || null } : {}),
          ...(payload.city !== undefined ? { city: payload.city?.trim() || null } : {}),
          ...(payload.state !== undefined ? { state: payload.state?.trim() || null } : {}),
          ...(payload.latitude !== undefined ? { latitude: payload.latitude } : {}),
          ...(payload.longitude !== undefined ? { longitude: payload.longitude } : {}),
        },
      });

      await createAuditLog(tx, {
        adminId: admin.id,
        action: "seller.update",
        targetType: "sellerProfile",
        targetId: seller.id,
        metadata: JSON.parse(JSON.stringify({
          userId: seller.userId,
          changedFields: Object.keys(payload),
        })) as Prisma.InputJsonValue,
      });

      return tx.sellerProfile.findUniqueOrThrow({
        where: { id: seller.id },
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
          bankAccount: true,
          wallet: true,
          products: {
            where: { isDeleted: false },
            include: {
              category: true,
              variants: true,
              seller: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          sellerGroups: {
            include: {
              items: true,
              parentOrder: {
                include: {
                  addressSnapshot: true,
                  payment: true,
                  sellerGroups: { include: { items: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: {
              products: true,
              discounts: true,
              sellerGroups: true,
              withdrawalRequests: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, seller: serializeSellerDetail(updated) });
  } catch (error: any) {
    console.error("[ADMIN_SELLER_PATCH_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to update seller" }, { status: 500 });
  }
}
