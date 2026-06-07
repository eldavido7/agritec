import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

const decimal = (value: number | null | undefined) =>
  value == null ? null : new Prisma.Decimal(value);

const updateAddressSchema = z.object({
  displayName: z.string().trim().min(1).max(80).nullable().optional(),
  addressLine: z.string().trim().min(1).optional(),
  fullAddress: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  landmark: z.string().trim().min(1).max(120).nullable().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  isDefault: z.boolean().optional(),
});

function serializeAddress(address: any) {
  return {
    ...address,
    latitude: address.latitude ? Number(address.latitude) : null,
    longitude: address.longitude ? Number(address.longitude) : null,
  };
}

async function getOwnedAddress(addressId: string, buyerId: string) {
  return prisma.address.findFirst({ where: { id: addressId, buyerId } });
}

async function clearOtherDefaults(tx: Prisma.TransactionClient, buyerId: string, addressId: string) {
  await tx.address.updateMany({
    where: { buyerId, id: { not: addressId }, isDefault: true },
    data: { isDefault: false },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const buyerProfile = user.buyerProfile;
    const { id } = await params;
    const address = await getOwnedAddress(id, buyerProfile.id);
    if (!address) {
      return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
    }

    const rawBody = await request.json();
    const payload = updateAddressSchema.parse(rawBody);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.address.update({
        where: { id },
        data: {
          ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
          ...(payload.addressLine !== undefined ? { addressLine: payload.addressLine } : {}),
          ...(payload.fullAddress !== undefined ? { fullAddress: payload.fullAddress } : {}),
          ...(payload.city !== undefined ? { city: payload.city } : {}),
          ...(payload.state !== undefined ? { state: payload.state } : {}),
          ...(payload.landmark !== undefined ? { landmark: payload.landmark } : {}),
          ...(payload.latitude !== undefined ? { latitude: decimal(payload.latitude) } : {}),
          ...(payload.longitude !== undefined ? { longitude: decimal(payload.longitude) } : {}),
          ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
          ...(payload.latitude !== undefined || payload.longitude !== undefined
            ? {
                isManualAddress:
                  payload.latitude != null && payload.longitude != null ? false : address.isManualAddress,
                isAdminAssisted:
                  payload.latitude != null && payload.longitude != null ? false : address.isAdminAssisted,
              }
            : {}),
        },
      });

      if (payload.isDefault === true) {
        await clearOtherDefaults(tx, buyerProfile.id, id);
      }

      return next;
    });

    return NextResponse.json({ success: true, address: serializeAddress(updated) });
  } catch (error) {
    console.error("[BUYER_ADDRESS_PATCH_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid address payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.BUYER]);
    if (!user || !user.buyerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const buyerProfile = user.buyerProfile;
    const { id } = await params;
    const address = await getOwnedAddress(id, buyerProfile.id);
    if (!address) {
      return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      if (address.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { buyerId: buyerProfile.id },
          orderBy: { updatedAt: "desc" },
        });

        if (nextAddress) {
          await tx.address.update({ where: { id: nextAddress.id }, data: { isDefault: true } });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("[BUYER_ADDRESS_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Failed to delete address" }, { status: 500 });
  }
}
