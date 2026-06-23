import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializePublicSeller } from "@/lib/marketplace-serializers";
import { sellerLocationFilter } from "@/lib/seller-location-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
    const search = searchParams.get("search")?.trim();
    const location = searchParams.get("location")?.trim();

    const where = {
      user: { isActive: true },
      ...sellerLocationFilter(),
      products: { some: { isDeleted: false, status: "ACTIVE" as const } },
      ...(location
        ? {
            OR: [
              { locationLabel: { contains: location, mode: "insensitive" as const } },
              { city: { contains: location, mode: "insensitive" as const } },
              { state: { contains: location, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { farmName: { contains: search, mode: "insensitive" as const } },
              { user: { fullName: { contains: search, mode: "insensitive" as const } } },
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
              fullName: true,
            },
          },
          _count: {
            select: {
              products: {
                where: {
                  isDeleted: false,
                  status: "ACTIVE",
                },
              },
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
      sellers: sellers.map((seller) => ({
        ...serializePublicSeller(seller),
        productCount: seller._count.products,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[SELLERS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
