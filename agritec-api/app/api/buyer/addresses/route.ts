import { NextResponse } from "next/server";
import { z } from "zod";
import { AddressCreatorRole, Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { reserveSequentialId } from "@/lib/id-sequence";

const decimal = (value: number | null | undefined) =>
  value == null ? null : new Prisma.Decimal(value);

const addressSchema = z.object({
  displayName: z.string().trim().min(1).max(80).nullable().optional(),
  addressLine: z.string().trim().min(1, "Address line is required"),
  fullAddress: z.string().trim().min(1, "Full address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  landmark: z.string().trim().min(1).max(120).nullable().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  isDefault: z.boolean().optional().default(false),
  isManualAddress: z.boolean().optional().default(false),
  isAdminAssisted: z.boolean().optional().default(false),
});

function serializeAddress(address: any) {
  return {
    ...address,
    latitude: address.latitude ? Number(address.latitude) : null,
    longitude: address.longitude ? Number(address.longitude) : null,
  };
}

async function normalizeDefaultAddress(tx: Prisma.TransactionClient, buyerId: string, selectedAddressId: string) {
  await tx.address.updateMany({
    where: {
      buyerId,
      id: { not: selectedAddressId },
      isDefault: true,
    },
    data: { isDefault: false },
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { buyerId: user.buyerProfile.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      addresses: addresses.map(serializeAddress),
    });
  } catch (error) {
    console.error("[BUYER_ADDRESSES_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const buyerProfile = user.buyerProfile;
    const rawBody = await request.json();
    const payload = addressSchema.parse(rawBody);

    const existingCount = await prisma.address.count({ where: { buyerId: buyerProfile.id } });
    const shouldBeDefault = payload.isDefault || existingCount === 0;

    const address = await prisma.$transaction(async (tx) => {
      const addressId = await reserveSequentialId(tx, "address");
      const created = await tx.address.create({
        data: {
          id: addressId,
          buyerId: buyerProfile.id,
          displayName: payload.displayName ?? null,
          addressLine: payload.addressLine,
          fullAddress: payload.fullAddress,
          city: payload.city,
          state: payload.state,
          landmark: payload.landmark ?? null,
          latitude: decimal(payload.latitude ?? null),
          longitude: decimal(payload.longitude ?? null),
          isDefault: shouldBeDefault,
          isManualAddress: payload.isManualAddress,
          isAdminAssisted: payload.isAdminAssisted,
          createdByRole: AddressCreatorRole.BUYER,
        },
      });

      if (shouldBeDefault) {
        await normalizeDefaultAddress(tx, buyerProfile.id, created.id);
      }

      return created;
    });

    return NextResponse.json({ success: true, address: serializeAddress(address) }, { status: 201 });
  } catch (error) {
    console.error("[BUYER_ADDRESSES_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid address payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: "Failed to create address" }, { status: 500 });
  }
}
