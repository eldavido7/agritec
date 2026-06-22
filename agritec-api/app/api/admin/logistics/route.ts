import {
  LogisticsCompanyVerificationStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseVerificationStatus(value: string | null) {
  if (!value) return undefined;
  return Object.values(LogisticsCompanyVerificationStatus).includes(
    value as LogisticsCompanyVerificationStatus
  )
    ? (value as LogisticsCompanyVerificationStatus)
    : undefined;
}

function serializeLogisticsListItem(company: any) {
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
    pricingConfigured: company.pricingSettings.length > 0,
    coverageType,
    coveredStates,
    coverageCount: company._count.coverageAreas,
    pricingCount: company.pricingSettings.length,
    assignedGroupCount: company._count.assignedGroups,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const admin = await requireAuthenticatedUser(request, [UserRole.ADMIN]);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 10), 50);
    const search = searchParams.get("search")?.trim() ?? "";
    const verificationStatus = parseVerificationStatus(searchParams.get("verificationStatus"));

    const where: Prisma.LogisticsCompanyProfileWhereInput = {
      user: { role: UserRole.LOGISTICS },
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { state: { contains: search, mode: "insensitive" } },
              { user: { fullName: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { user: { phone: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, logisticsCompanies] = await Promise.all([
      prisma.logisticsCompanyProfile.count({ where }),
      prisma.logisticsCompanyProfile.findMany({
        where,
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
          coverageAreas: {
            where: { isActive: true },
            select: { state: true, coverageType: true },
          },
          pricingSettings: {
            select: { id: true },
          },
          _count: {
            select: {
              coverageAreas: true,
              assignedGroups: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      logisticsCompanies: logisticsCompanies.map(serializeLogisticsListItem),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_LOGISTICS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch logistics companies" },
      { status: 500 }
    );
  }
}
