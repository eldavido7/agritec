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

const logisticsProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().nullable().optional(),
  companyName: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  contactPersonName: z.string().trim().nullable().optional(),
  businessAddress: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  lga: z.string().trim().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("[LOGISTICS_PROFILE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch logistics profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.LOGISTICS]);
    if (!user || !user.logisticsProfile) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = logisticsProfileUpdateSchema.parse(await request.json());

    if (payload.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email: normalizeEmail(payload.email) },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(payload.fullName !== undefined
          ? { fullName: payload.fullName.trim() }
          : {}),
        ...(payload.email !== undefined
          ? { email: normalizeEmail(payload.email) }
          : {}),
        ...(payload.phone !== undefined
          ? { phone: payload.phone?.trim() || null }
          : {}),
        logisticsProfile: {
          update: {
            ...(payload.companyName !== undefined
              ? { companyName: payload.companyName.trim() }
              : {}),
            ...(payload.description !== undefined
              ? { description: payload.description?.trim() || null }
              : {}),
            ...(payload.contactPersonName !== undefined
              ? { contactPersonName: payload.contactPersonName?.trim() || null }
              : {}),
            ...(payload.phone !== undefined
              ? { phone: payload.phone?.trim() || null }
              : {}),
            ...(payload.businessAddress !== undefined
              ? { businessAddress: payload.businessAddress?.trim() || null }
              : {}),
            ...(payload.city !== undefined
              ? { city: payload.city?.trim() || null }
              : {}),
            ...(payload.state !== undefined
              ? { state: payload.state?.trim() || null }
              : {}),
            ...(payload.lga !== undefined
              ? { lga: payload.lga?.trim() || null }
              : {}),
            ...(payload.area !== undefined
              ? { area: payload.area?.trim() || null }
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
      message: "Logistics profile updated successfully",
      user: serializeAuthUser(updatedUser),
    });
  } catch (error) {
    console.error("[LOGISTICS_PROFILE_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message ?? "Invalid logistics profile payload",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update logistics profile" },
      { status: 500 }
    );
  }
}
