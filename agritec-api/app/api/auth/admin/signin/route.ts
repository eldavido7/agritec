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

    const existingUser = await findAuthUserByEmail(email, UserRole.ADMIN);
    if (existingUser?.role === UserRole.ADMIN && existingUser.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Your admin account is disabled." },
        { status: 403 },
      );
    }

    const user = await verifyUserCredentials({
      email,
      password,
      role: UserRole.ADMIN,
    });

    if (!user) {
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
    console.error("[ADMIN_SIGNIN_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

