import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeProduct } from "@/lib/marketplace-serializers";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
        seller: { user: { isActive: true } },
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
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: serializeProduct(product),
    });
  } catch (error) {
    console.error("[PRODUCT_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
