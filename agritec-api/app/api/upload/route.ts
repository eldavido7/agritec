import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

const uploadTypeSchema = z.enum(["product", "chat"]);

const FOLDER_BY_TYPE = {
  product: "agritec/products",
  chat: "agritec/chats",
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = uploadTypeSchema.parse(String(formData.get("type") || ""));

    if (type === "product" && user.role !== UserRole.SELLER) {
      return NextResponse.json({ success: false, message: "Only sellers can upload product images" }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "Only image uploads are supported" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const folder = FOLDER_BY_TYPE[type];

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "image",
          },
          (error, uploadResult) => {
            if (error) reject(error);
            else resolve(uploadResult);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      success: true,
      asset: {
        secureUrl: result.secure_url,
        publicId: result.public_id,
        originalFilename: result.original_filename ?? file.name,
        bytes: result.bytes ?? file.size,
        mimeType: file.type,
        folder,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid upload type" }, { status: 400 });
    }

    console.error("[UPLOAD_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
