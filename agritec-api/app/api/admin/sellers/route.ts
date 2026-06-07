import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanFilter(value: string | null) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function serializeSellerListItem(seller: any) {
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
    productCount: seller._count.products,
    discountCount: seller._count.discounts,
    orderGroupCount: seller._count.sellerGroups,
    withdrawalCount: seller._count.withdrawalRequests,
    bankAccountVerified: Boolean(seller.bankAccount?.isVerified && seller.bankAccount?.paystackRecipientCode),
    wallet: seller.wallet
      ? {
          availableBalance: seller.wallet.availableBalance,
          pendingBalance: seller.wallet.pendingBalance,
          processingBalance: seller.wallet.processingBalance,
          withdrawnBalance: seller.wallet.withdrawnBalance,
          totalEarnings: seller.wallet.totalEarnings,
        }
      : null,
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 10), 50);
    const search = searchParams.get("search")?.trim() ?? "";
    const isActive = parseBooleanFilter(searchParams.get("isActive"));

    const where: Prisma.SellerProfileWhereInput = {
      user: {
        role: UserRole.SELLER,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      ...(search
        ? {
            OR: [
              { farmName: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { state: { contains: search, mode: "insensitive" } },
              { user: { fullName: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { user: { phone: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, sellers] = await Promise.all([
      prisma.sellerProfile.count({ where }),
      prisma.sellerProfile.findMany({
        where,
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
          bankAccount: {
            select: {
              isVerified: true,
              paystackRecipientCode: true,
            },
          },
          wallet: {
            select: {
              availableBalance: true,
              pendingBalance: true,
              processingBalance: true,
              withdrawnBalance: true,
              totalEarnings: true,
            },
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      sellers: sellers.map(serializeSellerListItem),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_SELLERS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch sellers" }, { status: 500 });
  }
}
