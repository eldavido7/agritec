import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { serializeProduct } from "@/lib/marketplace-serializers";
import { buildProductUpdateInput, parseSellerProductPayload } from "@/lib/seller-product-utils";
import { reserveSequentialIds } from "@/lib/id-sequence";
import { ZodError } from "zod";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getProductImagePublicIds(images: unknown) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const publicId = (image as { publicId?: unknown }).publicId;
      return typeof publicId === "string" && publicId.trim() ? publicId : null;
    })
    .filter((publicId): publicId is string => Boolean(publicId));
}

function getNormalizedProductImages(images: unknown) {
  if (!Array.isArray(images)) {
    return [] as Array<{ secureUrl: string; publicId: string | null; altText: string | null; displayOrder: number }>;
  }

  return images
    .map((image, index) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const secureUrl = (image as { secureUrl?: unknown; url?: unknown }).secureUrl;
      const fallbackUrl = (image as { url?: unknown }).url;
      const publicId = (image as { publicId?: unknown }).publicId;
      const altText = (image as { altText?: unknown }).altText;
      const displayOrder = (image as { displayOrder?: unknown }).displayOrder;
      const resolvedUrl =
        typeof secureUrl === "string" && secureUrl.trim()
          ? secureUrl.trim()
          : typeof fallbackUrl === "string" && fallbackUrl.trim()
            ? fallbackUrl.trim()
            : null;

      if (!resolvedUrl) {
        return null;
      }

      return {
        secureUrl: resolvedUrl,
        publicId: typeof publicId === "string" && publicId.trim() ? publicId : null,
        altText: typeof altText === "string" && altText.trim() ? altText : null,
        displayOrder: typeof displayOrder === "number" && Number.isFinite(displayOrder) ? displayOrder : index,
      };
    })
    .filter((image): image is { secureUrl: string; publicId: string | null; altText: string | null; displayOrder: number } => Boolean(image));
}

async function deleteCloudinaryImages(publicIds: string[]) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return;
  }

  await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image" }))
  );
}

async function getSellerOwnedProduct(productId: string, sellerId: string) {
  return prisma.product.findFirst({
    where: { id: productId, sellerId },
    include: {
      category: true,
      variants: true,
      orderItems: { select: { id: true }, take: 1 },
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const product = await getSellerOwnedProduct(id, sellerProfile.id);

    if (!product || (product.isDeleted && !includeDeleted)) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[SELLER_PRODUCT_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch seller product" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const { id } = await params;
    const existingProduct = await getSellerOwnedProduct(id, sellerProfile.id);

    if (!existingProduct) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const rawBody = await request.json();
    const payload = await parseSellerProductPayload(rawBody);
    const existingImages = getNormalizedProductImages(existingProduct.images);
    payload.images = payload.images.map((image, index) => {
      const matchedImage = existingImages.find((existingImage) => existingImage.secureUrl === image.secureUrl);
      return {
        ...image,
        publicId: image.publicId ?? matchedImage?.publicId ?? null,
        altText: image.altText ?? matchedImage?.altText ?? payload.title,
        displayOrder: image.displayOrder ?? matchedImage?.displayOrder ?? index,
      };
    });
    const removedImagePublicIds = existingImages
      .filter(
        (existingImage) =>
          existingImage.publicId &&
          !payload.images.some(
            (image) =>
              image.secureUrl === existingImage.secureUrl ||
              (image.publicId && image.publicId === existingImage.publicId)
          )
      )
      .map((image) => image.publicId as string);
    const missingVariantIdCount = payload.variants.filter((variant) => !variant.id?.trim()).length;

    const updated = await prisma.$transaction(async (tx) => {
      const generatedVariantIds = missingVariantIdCount
        ? await reserveSequentialIds(tx, "product_variant", missingVariantIdCount)
        : [];

      return tx.product.update({
        where: { id },
        data: {
          ...buildProductUpdateInput(payload, { variantIds: generatedVariantIds }),
          isDeleted: false,
          deletedAt: null,
        },
        include: { category: true, variants: true },
      });
    });

    await deleteCloudinaryImages(removedImagePublicIds);

    return NextResponse.json({ success: true, product: serializeProduct(updated) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid product payload" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return NextResponse.json({ success: false, message: "Invalid category" }, { status: 400 });
    }

    console.error("[SELLER_PRODUCT_PATCH_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const product = await getSellerOwnedProduct(id, sellerProfile.id);

    if (!product || (product.isDeleted && !includeDeleted)) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const imagePublicIds = getProductImagePublicIds(product.images);
    await deleteCloudinaryImages(imagePublicIds);

    const archivedProduct = await prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "ARCHIVED",
        images: [],
      },
      include: { category: true, variants: true },
    });

    return NextResponse.json({ success: true, product: serializeProduct(archivedProduct) });
  } catch (error) {
    console.error("[SELLER_PRODUCT_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to archive product" }, { status: 500 });
  }
}
