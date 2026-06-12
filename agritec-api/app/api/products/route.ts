import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseProductStatus, serializeProduct } from "@/lib/marketplace-serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
    const sellerId = searchParams.get("sellerId");
    const categorySlug = searchParams.get("categorySlug");
    const search = searchParams.get("search")?.trim();
    const status = parseProductStatus(searchParams.get("status"));

    const where = {
      isDeleted: false,
      seller: { user: { isActive: true } },
      ...(sellerId ? { sellerId } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      status,
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
              description: true,
              locationLabel: true,
              fullAddress: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          variants: true,
        },
        orderBy: { createdAt: "desc" },
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
    console.error("[PRODUCTS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
