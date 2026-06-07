import prisma from "@/lib/prisma";

export async function assertSellerPayoutEligible(sellerId: string) {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    include: {
      bankAccount: true,
    },
  });

  if (!seller) {
    throw new Error("SELLER_NOT_FOUND");
  }

  if (!seller.bankAccount || !seller.bankAccount.isVerified || !seller.bankAccount.paystackRecipientCode) {
    throw new Error("BANK_ACCOUNT_NOT_VERIFIED_FOR_PAYOUTS");
  }

  return {
    seller,
    bankAccount: seller.bankAccount,
  };
}
