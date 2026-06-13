import { DevicePlatform, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { reserveSequentialId } from "@/lib/id-sequence";
import prisma from "@/lib/prisma";

const registerSchema = z.object({
  token: z.string().trim().min(1),
  platform: z.nativeEnum(DevicePlatform),
  deviceId: z.string().trim().min(1).optional(),
});

const deleteSchema = z.object({
  token: z.string().trim().min(1).optional(),
  deviceId: z.string().trim().min(1).optional(),
}).refine((value) => Boolean(value.token || value.deviceId), {
  message: "Provide token or deviceId",
  path: ["token"],
});

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = registerSchema.parse(await request.json());
    const token = payload.token.trim();
    const now = new Date();

    const existingByToken = await prisma.deviceToken.findUnique({
      where: { token },
    });

    let deviceToken;
    if (existingByToken) {
      deviceToken = await prisma.deviceToken.update({
        where: { token },
        data: {
          userId: user.id,
          platform: payload.platform,
          deviceId: payload.deviceId?.trim() || null,
          isActive: true,
          lastUsedAt: now,
        },
      });
    } else if (payload.deviceId) {
      const existingByDevice = await prisma.deviceToken.findFirst({
        where: {
          userId: user.id,
          deviceId: payload.deviceId.trim(),
        },
      });

      if (existingByDevice) {
        deviceToken = await prisma.deviceToken.update({
          where: { id: existingByDevice.id },
          data: {
            token,
            platform: payload.platform,
            isActive: true,
            lastUsedAt: now,
          },
        });
      }
    }

    if (!deviceToken) {
      deviceToken = await prisma.$transaction(async (tx) => {
        const id = await reserveSequentialId(tx, "device_token");
        return tx.deviceToken.create({
          data: {
            id,
            userId: user.id,
            token,
            platform: payload.platform,
            deviceId: payload.deviceId?.trim() || null,
            isActive: true,
            lastUsedAt: now,
          },
        });
      });
    }

    return NextResponse.json({ success: true, deviceToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid device token payload" }, { status: 400 });
    }

    console.error("[DEVICE_TOKEN_POST_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to register device token" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN]);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = deleteSchema.parse(await request.json());
    await prisma.deviceToken.updateMany({
      where: {
        userId: user.id,
        ...(payload.token ? { token: payload.token.trim() } : {}),
        ...(payload.deviceId ? { deviceId: payload.deviceId.trim() } : {}),
      },
      data: {
        isActive: false,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Device token deactivated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Invalid device token payload" }, { status: 400 });
    }

    console.error("[DEVICE_TOKEN_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to deactivate device token" }, { status: 500 });
  }
}
