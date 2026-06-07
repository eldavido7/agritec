import { NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  createPaystackTransferRecipient,
  getPaystackBankByCode,
  resolvePaystackAccountNumber,
} from "@/lib/paystack";
import { assertSellerPayoutEligible } from "@/lib/payout-eligibility";
import { reserveSequentialId } from "@/lib/id-sequence";

const saveBankAccountSchema = z
  .object({
    bankCode: z.string().trim().min(1).optional(),
    accountNumber: z.string().trim().optional(),
    autoPayoutEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      (value.bankCode && value.accountNumber) ||
      (typeof value.autoPayoutEnabled === "boolean" && !value.bankCode && !value.accountNumber),
    {
      message: "Provide bank details to save an account or only autoPayoutEnabled to update payout preference",
      path: ["bankCode"],
    }
  );

function serializeBankAccount(record: {
  bankAccount: {
    id: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    isVerified: boolean;
    paystackRecipientCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  autoPayoutEnabled: boolean;
}) {
  return {
    bankAccount: record.bankAccount
      ? {
          id: record.bankAccount.id,
          bankName: record.bankAccount.bankName,
          bankCode: record.bankAccount.bankCode,
          accountNumber: record.bankAccount.accountNumber,
          accountName: record.bankAccount.accountName,
          isVerified: record.bankAccount.isVerified,
          paystackRecipientCode: record.bankAccount.paystackRecipientCode,
          createdAt: record.bankAccount.createdAt,
          updatedAt: record.bankAccount.updatedAt,
        }
      : null,
    autoPayoutEnabled: record.autoPayoutEnabled,
    canReceivePayouts:
      Boolean(record.bankAccount?.isVerified) && Boolean(record.bankAccount?.paystackRecipientCode),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { id: user.sellerProfile.id },
      select: {
        autoPayoutEnabled: true,
        bankAccount: true,
      },
    });

    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...serializeBankAccount(seller),
    });
  } catch (error) {
    console.error("[SELLER_BANK_ACCOUNT_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch seller bank account" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const rawBody = await request.json();
    const payload = saveBankAccountSchema.parse(rawBody);

    if (!payload.bankCode && !payload.accountNumber && typeof payload.autoPayoutEnabled === "boolean") {
      if (payload.autoPayoutEnabled) {
        await assertSellerPayoutEligible(sellerProfile.id);
      }

      const updatedSeller = await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { autoPayoutEnabled: payload.autoPayoutEnabled },
        select: {
          autoPayoutEnabled: true,
          bankAccount: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Payout preference updated successfully",
        ...serializeBankAccount(updatedSeller),
      });
    }

    const bankCode = payload.bankCode!;
    const accountNumber = payload.accountNumber!;

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { success: false, message: "Account number must be 10 digits" },
        { status: 400 }
      );
    }

    const bank = await getPaystackBankByCode(bankCode);
    if (!bank) {
      return NextResponse.json({ success: false, message: "Selected bank was not found" }, { status: 400 });
    }

    const resolved = await resolvePaystackAccountNumber(accountNumber, bankCode);
    const recipient = await createPaystackTransferRecipient({
      name: resolved.account_name,
      accountNumber: resolved.account_number,
      bankCode,
    });

    const updatedSeller = await prisma.$transaction(async (tx) => {
      const bankAccountId = await reserveSequentialId(tx, "seller_bank_account");
      await tx.sellerBankAccount.upsert({
        where: { sellerId: sellerProfile.id },
        update: {
          bankName: bank.name,
          bankCode,
          accountNumber: resolved.account_number,
          accountName: resolved.account_name,
          isVerified: true,
          paystackRecipientCode: recipient.recipient_code,
        },
        create: {
          id: bankAccountId,
          sellerId: sellerProfile.id,
          bankName: bank.name,
          bankCode,
          accountNumber: resolved.account_number,
          accountName: resolved.account_name,
          isVerified: true,
          paystackRecipientCode: recipient.recipient_code,
        },
      });

      if (typeof payload.autoPayoutEnabled === "boolean") {
        await tx.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: { autoPayoutEnabled: payload.autoPayoutEnabled },
        });
      }

      return tx.sellerProfile.findUniqueOrThrow({
        where: { id: sellerProfile.id },
        select: {
          autoPayoutEnabled: true,
          bankAccount: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Bank account verified and saved successfully",
      ...serializeBankAccount(updatedSeller),
    });
  } catch (error) {
    console.error("[SELLER_BANK_ACCOUNT_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid bank account payload" },
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

      if (error.message === "BANK_ACCOUNT_NOT_VERIFIED_FOR_PAYOUTS") {
        return NextResponse.json(
          { success: false, message: "Please verify your bank account before receiving payouts." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Bank verification failed. Please confirm the bank and account number." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to save seller bank account" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.SELLER]);
    if (!user || !user.sellerProfile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sellerProfile = user.sellerProfile;
    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfile.id },
      select: {
        autoPayoutEnabled: true,
        bankAccount: true,
      },
    });

    if (!seller?.bankAccount) {
      return NextResponse.json(
        { success: false, message: "No bank account found to remove" },
        { status: 404 }
      );
    }

    const updatedSeller = await prisma.$transaction(async (tx) => {
      await tx.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { autoPayoutEnabled: false },
      });

      await tx.sellerBankAccount.delete({
        where: { sellerId: sellerProfile.id },
      });

      return tx.sellerProfile.findUniqueOrThrow({
        where: { id: sellerProfile.id },
        select: {
          autoPayoutEnabled: true,
          bankAccount: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Bank account removed successfully",
      ...serializeBankAccount(updatedSeller),
    });
  } catch (error) {
    console.error("[SELLER_BANK_ACCOUNT_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove seller bank account" },
      { status: 500 }
    );
  }
}
