import {
  LogisticsCompanyVerificationStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/wallet-utils";

const logisticsActionSchema = z.object({
  action: z.enum(["verify", "suspend", "reactivate"]),
});

function serializeCoverageArea(area: any) {
  return {
    id: area.id,
    coverageType: area.coverageType,
    selectionType: area.selectionType,
    state: area.state,
    lga: area.lga,
    city: area.city,
    area: area.area,
    isActive: area.isActive,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
  };
}

function serializeLogisticsDetail(company: any) {
  const coveredStates = Array.from(
    new Set(
      company.coverageAreas
        .map((area: any) => area.state)
        .filter((state: string | null): state is string => Boolean(state))
    )
  ).sort();
  const coverageType = company.coverageAreas.some(
    (area: any) => area.coverageType === "NATIONWIDE"
  )
    ? "NATIONWIDE"
    : "REGIONAL";

  return {
    id: company.id,
    userId: company.userId,
    fullName: company.user.fullName,
    email: company.user.email,
    phone: company.user.phone,
    isActive: company.user.isActive,
    emailVerifiedAt: company.user.emailVerifiedAt,
    lastActiveAt: company.user.lastActiveAt,
    companyName: company.companyName,
    description: company.description,
    contactPersonName: company.contactPersonName,
    businessAddress: company.businessAddress,
    city: company.city,
    state: company.state,
    lga: company.lga,
    area: company.area,
    latitude: company.latitude == null ? null : Number(company.latitude),
    longitude: company.longitude == null ? null : Number(company.longitude),
    verificationStatus: company.verificationStatus,
    isVerified: company.isVerified,
    coverageType,
    coveredStates,
    pricingSettings: company.pricingSettings.map((pricing: any) => ({
      ...pricing,
      state: pricing.pricingScope === "STATE" ? pricing.state : null,
      weightUnitSizeKg:
        pricing.weightUnitSizeKg == null ? null : Number(pricing.weightUnitSizeKg),
    })),
    coverageAreas: company.coverageAreas.map(serializeCoverageArea),
    assignedGroupCount: company._count.assignedGroups,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

async function findLogisticsCompany(id: string) {
  return prisma.logisticsCompanyProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          emailVerifiedAt: true,
          lastActiveAt: true,
        },
      },
      pricingSettings: {
        orderBy: [{ pricingScope: "asc" }, { state: "asc" }],
      },
      coverageAreas: {
        orderBy: [{ state: "asc" }, { lga: "asc" }, { city: "asc" }, { area: "asc" }],
      },
      _count: {
        select: {
          assignedGroups: true,
        },
      },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const company = await findLogisticsCompany(id);
    if (!company) {
      return NextResponse.json(
        { success: false, message: "Logistics company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      logisticsCompany: serializeLogisticsDetail(company),
    });
  } catch (error) {
    console.error("[ADMIN_LOGISTICS_DETAIL_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch logistics company" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = logisticsActionSchema.parse(await request.json());

    const company = await prisma.logisticsCompanyProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Logistics company not found" },
        { status: 404 }
      );
    }

    const nextState =
      payload.action === "verify"
        ? {
            verificationStatus: LogisticsCompanyVerificationStatus.VERIFIED,
            isVerified: true,
            isActive: true,
          }
        : payload.action === "suspend"
          ? {
              verificationStatus: LogisticsCompanyVerificationStatus.SUSPENDED,
              isVerified: company.isVerified,
              isActive: false,
            }
          : {
              verificationStatus: LogisticsCompanyVerificationStatus.VERIFIED,
              isVerified: true,
              isActive: true,
            };

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: company.userId },
        data: { isActive: nextState.isActive },
      });

      await tx.logisticsCompanyProfile.update({
        where: { id: company.id },
        data: {
          verificationStatus: nextState.verificationStatus,
          isVerified: nextState.isVerified,
        },
      });

      await createAuditLog(tx, {
        adminId: admin.id,
        action: `logistics.${payload.action}`,
        targetType: "logisticsCompanyProfile",
        targetId: company.id,
        metadata: JSON.parse(
          JSON.stringify({
            userId: company.userId,
            previousVerificationStatus: company.verificationStatus,
            nextVerificationStatus: nextState.verificationStatus,
            previousIsActive: company.user.isActive,
            nextIsActive: nextState.isActive,
          })
        ) as Prisma.InputJsonValue,
      });
    });

    const updatedCompany = await findLogisticsCompany(id);
    if (!updatedCompany) {
      return NextResponse.json(
        { success: false, message: "Logistics company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      logisticsCompany: serializeLogisticsDetail(updatedCompany),
    });
  } catch (error) {
    console.error("[ADMIN_LOGISTICS_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update logistics company" },
      { status: 500 }
    );
  }
}
