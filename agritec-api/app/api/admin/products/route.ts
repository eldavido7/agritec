import { ProductStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeProduct } from "@/lib/marketplace-serializers";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      20,
      Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10),
    );
    const sellerId = searchParams.get("sellerId")?.trim();
    const search = searchParams.get("search")?.trim();

    if (!sellerId) {
      return NextResponse.json(
        { success: false, message: "sellerId is required" },
        { status: 400 },
      );
    }

    const where = {
      sellerId,
      isDeleted: false,
      status: ProductStatus.ACTIVE,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          seller: {
            select: {
              id: true,
              farmName: true,
              locationLabel: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
            },
          },
          variants: true,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map(serializeProduct),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_PRODUCTS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch admin products" },
      { status: 500 },
    );
  }
}
