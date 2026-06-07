import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getPaystackBankByCode, resolvePaystackAccountNumber } from "@/lib/paystack";

const verifyBankAccountSchema = z.object({
  bankCode: z.string().trim().min(1, "Bank code is required"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Account number must be 10 digits"),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const payload = verifyBankAccountSchema.parse(rawBody);

    const bank = await getPaystackBankByCode(payload.bankCode);
    if (!bank) {
      return NextResponse.json({ success: false, message: "Selected bank was not found" }, { status: 400 });
    }

    const resolved = await resolvePaystackAccountNumber(payload.accountNumber, payload.bankCode);

    return NextResponse.json({
      success: true,
      verification: {
        bankName: bank.name,
        bankCode: bank.code,
        accountNumber: resolved.account_number,
        accountName: resolved.account_name,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("[SELLER_BANK_ACCOUNT_VERIFY_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid bank account details" },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === "PAYSTACK_SECRET_KEY_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, message: "Paystack is not configured" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Bank account verification failed. Please confirm the bank and account number." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Bank account verification failed" },
      { status: 400 }
    );
  }
}
