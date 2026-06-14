import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

const signatureRequestSchema = z.object({
  type: z.enum(["product", "chat"]),
});

const FOLDER_BY_TYPE = {
  product: "agritec/products",
  chat: "agritec/chats",
} as const;

const RESOURCE_TYPE_BY_TYPE = {
  product: "image",
  chat: "auto",
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = signatureRequestSchema.parse(await request.json());

    if (payload.type === "product" && user.role !== UserRole.SELLER) {
      return NextResponse.json({ success: false, message: "Only sellers can upload product images" }, { status: 403 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ success: false, message: "Cloudinary is not configured" }, { status: 500 });
    }

    const folder = FOLDER_BY_TYPE[payload.type];
    const resourceType = RESOURCE_TYPE_BY_TYPE[payload.type];
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      success: true,
      upload: {
        cloudName,
        apiKey,
        folder,
        timestamp,
        signature,
        resourceType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid upload request" }, { status: 400 });
    }

    console.error("[UPLOAD_SIGNATURE_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to generate upload signature" }, { status: 500 });
  }
}