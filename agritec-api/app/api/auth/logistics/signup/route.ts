import { NextResponse } from "next/server";
import { createLogisticsAccount, serializeAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      password,
      phone,
      companyName,
      description,
      contactPersonName,
      businessAddress,
      city,
      state,
      lga,
      area,
      latitude,
      longitude,
    } = body;

    if (!fullName || !email || !password || !companyName) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name, company name, email, and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await createLogisticsAccount({
      fullName,
      email,
      password,
      phone,
      companyName,
      description,
      contactPersonName,
      businessAddress,
      city,
      state,
      lga,
      area,
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Signup successful. Your logistics company is pending admin verification.",
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

    console.error("[LOGISTICS_SIGNUP_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
