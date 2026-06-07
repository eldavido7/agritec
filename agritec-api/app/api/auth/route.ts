import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import {
  serializeAuthUser,
  signAuthToken,
  verifyUserCredentials,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    let normalizedRole: UserRole | undefined;
    if (role) {
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json(
          { success: false, message: "Invalid role" },
          { status: 400 }
        );
      }
      normalizedRole = role;
    }

    const user = await verifyUserCredentials({ email, password, role: normalizedRole });
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
    console.error("[AUTH_SIGNIN_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
