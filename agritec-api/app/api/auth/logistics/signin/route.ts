import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import {
  findAuthUserByEmail,
  serializeAuthUser,
  signAuthToken,
  verifyUserCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await findAuthUserByEmail(email, UserRole.LOGISTICS);
    if (existingUser?.role === UserRole.LOGISTICS && existingUser.logisticsProfile) {
      if (
        existingUser.logisticsProfile.verificationStatus === "PENDING_VERIFICATION" ||
        existingUser.logisticsProfile.isVerified === false
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Your logistics company is pending admin verification.",
          },
          { status: 403 }
        );
      }

      if (
        existingUser.logisticsProfile.verificationStatus === "SUSPENDED" ||
        existingUser.isActive === false
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Your logistics company account is suspended. Please contact admin for assistance.",
          },
          { status: 403 }
        );
      }
    }

    const user = await verifyUserCredentials({
      email,
      password,
      role: UserRole.LOGISTICS,
    });

    if (!user || !user.logisticsProfile) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signAuthToken({ userId: user.id, role: user.role });

    return NextResponse.json({
      success: true,
      token,
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("[LOGISTICS_SIGNIN_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
