import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  authUserSelect,
  normalizeEmail,
  requireAuthenticatedUser,
  serializeAuthUser,
} from "@/lib/auth";

const sellerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().nullable().optional(),
  farmName: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  locationLabel: z.string().trim().nullable().optional(),
  fullAddress: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("[SELLER_PROFILE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch seller profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = sellerProfileUpdateSchema.parse(await request.json());
    const normalizedIncomingEmail =
      payload.email !== undefined ? normalizeEmail(payload.email) : undefined;
    const normalizedCurrentEmail = normalizeEmail(user.email);
    const shouldUpdateEmail =
      normalizedIncomingEmail !== undefined &&
      normalizedIncomingEmail !== normalizedCurrentEmail;

    if (shouldUpdateEmail && normalizedIncomingEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: normalizedIncomingEmail },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 409 },
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(payload.fullName !== undefined
          ? { fullName: payload.fullName.trim() }
          : {}),
        ...(shouldUpdateEmail
          ? { email: normalizedIncomingEmail }
          : {}),
        ...(payload.phone !== undefined
          ? { phone: payload.phone?.trim() || null }
          : {}),
        sellerProfile: {
          update: {
            ...(payload.farmName !== undefined
              ? { farmName: payload.farmName.trim() }
              : {}),
            ...(payload.description !== undefined
              ? { description: payload.description?.trim() || null }
              : {}),
            ...(payload.locationLabel !== undefined
              ? { locationLabel: payload.locationLabel?.trim() || null }
              : {}),
            ...(payload.fullAddress !== undefined
              ? { fullAddress: payload.fullAddress?.trim() || null }
              : {}),
            ...(payload.city !== undefined
              ? { city: payload.city?.trim() || null }
              : {}),
            ...(payload.state !== undefined
              ? { state: payload.state?.trim() || null }
              : {}),
            ...(payload.latitude !== undefined
              ? { latitude: payload.latitude }
              : {}),
            ...(payload.longitude !== undefined
              ? { longitude: payload.longitude }
              : {}),
          },
        },
      },
      select: authUserSelect,
    });

    return NextResponse.json({
      success: true,
      message: "Seller profile updated successfully",
      user: serializeAuthUser(updatedUser),
    });
  } catch (error) {
    console.error("[SELLER_PROFILE_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message ?? "Invalid seller profile payload",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update seller profile" },
      { status: 500 },
    );
  }
}

