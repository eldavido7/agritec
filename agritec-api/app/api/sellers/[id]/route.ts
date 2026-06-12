import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeProduct, serializePublicSeller } from "@/lib/marketplace-serializers";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const seller = await prisma.sellerProfile.findFirst({
      where: {
        id,
        user: { isActive: true },
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        products: {
          where: {
            isDeleted: false,
            status: "ACTIVE",
          },
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
        },
      },
    });

    if (!seller) {
      return NextResponse.json(
        { success: false, message: "Seller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      seller: serializePublicSeller(seller),
      products: seller.products.map(serializeProduct),
    });
  } catch (error) {
    console.error("[SELLER_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch seller" },
      { status: 500 }
    );
  }
}
