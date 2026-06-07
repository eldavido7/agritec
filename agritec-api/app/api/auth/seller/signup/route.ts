import { NextResponse } from "next/server";
import { createSellerAccount, serializeAuthUser, signAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      password,
      phone,
      farmName,
      description,
      locationLabel,
      fullAddress,
      city,
      state,
      latitude,
      longitude,
    } = body;

    if (!fullName || !email || !password || !farmName) {
      return NextResponse.json(
        { success: false, message: "Full name, farm name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await createSellerAccount({
      fullName,
      email,
      password,
      phone,
      farmName,
      description,
      locationLabel,
      fullAddress,
      city,
      state,
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
    });

    const token = signAuthToken({ userId: user.id, role: user.role });

    return NextResponse.json(
      {
        success: true,
        token,
        user: serializeAuthUser(user),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json(
        { success: false, message: "Email already exists" },
        { status: 409 }
      );
    }

    console.error("[SELLER_SIGNUP_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
