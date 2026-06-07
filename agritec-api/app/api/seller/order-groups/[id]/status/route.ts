import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      message: "Sellers can view order groups, but only admins can update order group statuses.",
    },
    { status: 403 }
  );
}
