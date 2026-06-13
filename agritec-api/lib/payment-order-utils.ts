import {
  InventoryMovementType,
  ParentOrderStatus,
  PaymentStatus,
  Prisma,
  SellerOrderGroupStatus,
  WalletTransactionType,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { buildCheckoutQuote } from "@/lib/checkout-quote";
import { buildAdminAssistedQuote } from "@/lib/admin-assisted-order-utils";
import { reserveSequentialId, reserveSequentialIds } from "@/lib/id-sequence";
import {
  computeSellerEarnings,
  createWalletTransaction,
  getCommissionRateBps,
  getOrCreateSellerWallet,
} from "@/lib/wallet-utils";

const parentOrderInclude = {
  addressSnapshot: true,
  payment: true,
  sellerGroups: {
    include: {
      items: true,
    },
  },
} satisfies Prisma.ParentOrderInclude;

type CheckoutQuote = Awaited<ReturnType<typeof buildCheckoutQuote>>;
type AssistedQuote = Awaited<ReturnType<typeof buildAdminAssistedQuote>>;

type BuyerCheckoutUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  buyerProfile: { id: string };
};

type PaymentVerificationPayload = {
  status: string;
  reference: string;
  amount: number;
  currency?: string | null;
  paid_at?: string | null;
  customer?: { email?: string | null } | null;
  [key: string]: unknown;
};

type ProductImageRecord = {
  secureUrl?: string;
  displayOrder?: number;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function firstProductImageUrl(images: Prisma.JsonValue | null) {
  if (!Array.isArray(images)) {
    return null;
  }

  const normalized = images
    .map((entry) => {
      if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
        return entry as ProductImageRecord;
      }
      return null;
    })
    .filter((entry): entry is ProductImageRecord => entry !== null)
    .sort((left, right) => {
      const leftOrder = typeof left.displayOrder === "number" ? left.displayOrder : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.displayOrder === "number" ? right.displayOrder : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });

  for (const image of normalized) {
    if (typeof image.secureUrl === "string" && image.secureUrl.trim().length > 0) {
      return image.secureUrl;
    }
  }

  return null;
}

function parseCartItemIds(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [] as string[];
  }

  const cartItemIds = (metadata as Record<string, unknown>).cartItemIds;
  if (!Array.isArray(cartItemIds)) {
    return [] as string[];
  }

  return cartItemIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function nairaToSubunit(amount: number) {
  return amount * 100;
}

function normalizePaidAt(dateValue: string | null | undefined) {
  if (!dateValue) {
    return new Date();
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function generatePaymentReference(paymentId: string) {
  return `AGT-PAY-${paymentId}-${Date.now()}`;
}

export async function getParentOrderWithRelations(parentOrderId: string) {
  return prisma.parentOrder.findUnique({
    where: { id: parentOrderId },
    include: parentOrderInclude,
  });
}

export async function createPendingCheckoutOrder(args: {
  buyerUser: BuyerCheckoutUser;
  quote: CheckoutQuote;
  discountCodes: Record<string, string>;
}) {
  const { buyerUser, quote, discountCodes } = args;

  return prisma.$transaction(async (tx) => {
    const commissionRateBps = await getCommissionRateBps(tx);
    const parentOrderId = await reserveSequentialId(tx, "parent_order");
    const paymentId = await reserveSequentialId(tx, "payment");
    const addressSnapshotId = await reserveSequentialId(tx, "order_address_snapshot");
    const sellerGroupIds = await reserveSequentialIds(tx, "seller_order_group", quote.sellerGroups.length);
    const totalOrderItems = quote.sellerGroups.reduce((sum, group) => sum + group.items.length, 0);
    const orderItemIds = await reserveSequentialIds(tx, "order_item", totalOrderItems);
    const paymentReference = generatePaymentReference(paymentId);
    const cartItemIds = quote.sellerGroups.flatMap((group) => group.items.map((item) => item.cartItemId));

    await tx.parentOrder.create({
      data: {
        id: parentOrderId,
        buyerId: quote.buyerId,
        status: ParentOrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        buyerNameSnapshot: buyerUser.fullName,
        buyerEmailSnapshot: buyerUser.email,
        buyerPhoneSnapshot: buyerUser.phone ?? "",
        productSubtotal: quote.productSubtotal,
        totalShippingFee: quote.totalShippingFee,
        discountTotal: quote.discountTotal,
        grandTotal: quote.grandTotal,
        currencyCode: quote.currencyCode,
      },
    });

    await tx.orderAddressSnapshot.create({
      data: {
        id: addressSnapshotId,
        parentOrderId,
        displayName: quote.address.displayName,
        addressLine: quote.address.addressLine,
        fullAddress: quote.address.fullAddress,
        city: quote.address.city,
        state: quote.address.state,
        landmark: quote.address.landmark,
        latitude: quote.address.latitude,
        longitude: quote.address.longitude,
        isManualAddress: quote.address.isManualAddress,
        isAdminAssisted: quote.address.isAdminAssisted,
        createdByRole: quote.address.createdByRole,
      },
    });

    await tx.payment.create({
      data: {
        id: paymentId,
        parentOrderId,
        reference: paymentReference,
        amount: quote.grandTotal,
        currencyCode: quote.currencyCode,
        status: PaymentStatus.PENDING,
        metadata: toJsonValue({
          addressId: quote.address.id,
          discountCodes,
          cartItemIds,
          sellerIds: quote.sellerGroups.map((group) => group.sellerId),
          amountInSubunit: nairaToSubunit(quote.grandTotal),
        }),
      },
    });

    let orderItemCursor = 0;

    for (const [groupIndex, group] of quote.sellerGroups.entries()) {
      const sellerOrderGroupId = sellerGroupIds[groupIndex];
      const { platformCommissionAmount, sellerEarningsAmount } = computeSellerEarnings({
        productSubtotal: group.productSubtotal,
        discountTotal: group.discountTotal,
        commissionRateBps,
      });

      await tx.sellerOrderGroup.create({
        data: {
          id: sellerOrderGroupId,
          parentOrderId,
          sellerId: group.sellerId,
          status: SellerOrderGroupStatus.PENDING,
          sellerNameSnapshot: group.sellerName,
          farmNameSnapshot: group.farmName,
          productSubtotal: group.productSubtotal,
          shippingFee: group.shippingFee,
          discountTotal: group.discountTotal,
          groupTotal: group.groupTotal,
          commissionRateBpsSnapshot: commissionRateBps,
          platformCommissionAmount,
          sellerEarningsAmount,
          deliveryRegion: group.deliveryRegion,
          totalChargeableWeightKg: group.totalChargeableWeightKg,
          weightUnitSizeKg: group.weightUnitSizeKg,
          shippingUnits: group.shippingUnits,
          minimumFee: group.minimumFee,
          additionalUnitFee: group.additionalUnitFee,
          discountCodeSnapshot: group.discountApplied ? group.discountSummary?.code ?? group.discountCode ?? null : null,
          discountTypeSnapshot: group.discountApplied ? group.discountSummary?.type ?? null : null,
          discountValueSnapshot: group.discountApplied ? group.discountSummary?.value ?? null : null,
          discountDescriptionSnapshot: group.discountApplied ? group.discountSummary?.description ?? null : null,
        },
      });

      for (const item of group.items) {
        const orderItemId = orderItemIds[orderItemCursor++];
        const logisticsSource = item.variant ?? item.product;

        await tx.orderItem.create({
          data: {
            id: orderItemId,
            sellerOrderGroupId,
            productId: item.product.id,
            variantId: item.variant?.id ?? null,
            sellerId: group.sellerId,
            sellerNameSnapshot: group.sellerName,
            farmNameSnapshot: group.farmName,
            productTitleSnapshot: item.product.title,
            productImageUrlSnapshot: firstProductImageUrl(item.product.images as Prisma.JsonValue | null),
            variantTitleSnapshot: item.variant?.name ?? null,
            salesUnitSnapshot: item.salesUnit,
            packageTypeSnapshot: item.packageType,
            unitWeightKgSnapshot: logisticsSource.unitWeightKg ?? null,
            unitLengthCmSnapshot: logisticsSource.unitLengthCm ?? null,
            unitWidthCmSnapshot: logisticsSource.unitWidthCm ?? null,
            unitHeightCmSnapshot: logisticsSource.unitHeightCm ?? null,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineSubtotal: item.lineSubtotal,
            lineDiscountTotal: item.lineDiscountTotal,
            lineTotal: item.lineTotal,
          },
        });
      }
    }

    const createdOrder = await tx.parentOrder.findUnique({
      where: { id: parentOrderId },
      include: parentOrderInclude,
    });

    if (!createdOrder) {
      throw new Error("PENDING_ORDER_CREATION_FAILED");
    }

    return createdOrder;
  });
}

export async function createPendingAssistedOrder(args: {
  buyerUser: BuyerCheckoutUser;
  quote: AssistedQuote;
  discountCodes: Record<string, string>;
}) {
  const { buyerUser, quote, discountCodes } = args;

  return prisma.$transaction(async (tx) => {
    const commissionRateBps = await getCommissionRateBps(tx);
    const parentOrderId = await reserveSequentialId(tx, "parent_order");
    const paymentId = await reserveSequentialId(tx, "payment");
    const addressSnapshotId = await reserveSequentialId(tx, "order_address_snapshot");
    const sellerGroupIds = await reserveSequentialIds(tx, "seller_order_group", quote.sellerGroups.length);
    const totalOrderItems = quote.sellerGroups.reduce((sum, group) => sum + group.items.length, 0);
    const orderItemIds = await reserveSequentialIds(tx, "order_item", totalOrderItems);
    const paymentReference = generatePaymentReference(paymentId);

    await tx.parentOrder.create({
      data: {
        id: parentOrderId,
        buyerId: quote.buyerId,
        status: ParentOrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        buyerNameSnapshot: buyerUser.fullName,
        buyerEmailSnapshot: buyerUser.email,
        buyerPhoneSnapshot: buyerUser.phone ?? "",
        productSubtotal: quote.productSubtotal,
        totalShippingFee: quote.totalShippingFee,
        discountTotal: quote.discountTotal,
        grandTotal: quote.grandTotal,
        currencyCode: quote.currencyCode,
      },
    });

    await tx.orderAddressSnapshot.create({
      data: {
        id: addressSnapshotId,
        parentOrderId,
        displayName: quote.address.displayName ?? null,
        addressLine: quote.address.addressLine,
        fullAddress: quote.address.fullAddress,
        city: quote.address.city,
        state: quote.address.state,
        landmark: quote.address.landmark ?? null,
        latitude: quote.address.latitude ?? null,
        longitude: quote.address.longitude ?? null,
        isManualAddress: quote.address.isManualAddress,
        isAdminAssisted: quote.address.isAdminAssisted,
        createdByRole: quote.address.createdByRole,
      },
    });

    await tx.payment.create({
      data: {
        id: paymentId,
        parentOrderId,
        reference: paymentReference,
        amount: quote.grandTotal,
        currencyCode: quote.currencyCode,
        status: PaymentStatus.PENDING,
        metadata: toJsonValue({
          addressId: quote.address.id ?? null,
          discountCodes,
          cartItemIds: [],
          sellerIds: quote.sellerGroups.map((group) => group.sellerId),
          amountInSubunit: nairaToSubunit(quote.grandTotal),
          isAdminAssisted: true,
        }),
      },
    });

    let orderItemCursor = 0;

    for (const [groupIndex, group] of quote.sellerGroups.entries()) {
      const sellerOrderGroupId = sellerGroupIds[groupIndex];
      const { platformCommissionAmount, sellerEarningsAmount } = computeSellerEarnings({
        productSubtotal: group.productSubtotal,
        discountTotal: group.discountTotal,
        commissionRateBps,
      });

      await tx.sellerOrderGroup.create({
        data: {
          id: sellerOrderGroupId,
          parentOrderId,
          sellerId: group.sellerId,
          status: SellerOrderGroupStatus.PENDING,
          sellerNameSnapshot: group.sellerName,
          farmNameSnapshot: group.farmName,
          productSubtotal: group.productSubtotal,
          shippingFee: group.shippingFee,
          discountTotal: group.discountTotal,
          groupTotal: group.groupTotal,
          commissionRateBpsSnapshot: commissionRateBps,
          platformCommissionAmount,
          sellerEarningsAmount,
          deliveryRegion: group.deliveryRegion,
          totalChargeableWeightKg: group.totalChargeableWeightKg,
          weightUnitSizeKg: group.weightUnitSizeKg,
          shippingUnits: group.shippingUnits,
          minimumFee: group.minimumFee,
          additionalUnitFee: group.additionalUnitFee,
          discountCodeSnapshot: group.discountApplied ? group.discountSummary?.code ?? group.discountCode ?? null : null,
          discountTypeSnapshot: group.discountApplied ? group.discountSummary?.type ?? null : null,
          discountValueSnapshot: group.discountApplied ? group.discountSummary?.value ?? null : null,
          discountDescriptionSnapshot: group.discountApplied ? group.discountSummary?.description ?? null : null,
        },
      });

      for (const item of group.items) {
        const orderItemId = orderItemIds[orderItemCursor++];
        const logisticsSource = item.variant ?? item.product;

        await tx.orderItem.create({
          data: {
            id: orderItemId,
            sellerOrderGroupId,
            productId: item.product.id,
            variantId: item.variant?.id ?? null,
            sellerId: group.sellerId,
            sellerNameSnapshot: group.sellerName,
            farmNameSnapshot: group.farmName,
            productTitleSnapshot: item.product.title,
            productImageUrlSnapshot: firstProductImageUrl(item.product.images as Prisma.JsonValue | null),
            variantTitleSnapshot: item.variant?.name ?? null,
            salesUnitSnapshot: item.salesUnit,
            packageTypeSnapshot: item.packageType,
            unitWeightKgSnapshot: logisticsSource.unitWeightKg ?? null,
            unitLengthCmSnapshot: logisticsSource.unitLengthCm ?? null,
            unitWidthCmSnapshot: logisticsSource.unitWidthCm ?? null,
            unitHeightCmSnapshot: logisticsSource.unitHeightCm ?? null,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineSubtotal: item.lineSubtotal,
            lineDiscountTotal: item.lineDiscountTotal,
            lineTotal: item.lineTotal,
          },
        });
      }
    }

    const createdOrder = await tx.parentOrder.findUnique({
      where: { id: parentOrderId },
      include: parentOrderInclude,
    });

    if (!createdOrder) {
      throw new Error("PENDING_ORDER_CREATION_FAILED");
    }

    return createdOrder;
  });
}

export async function markPaymentInitializationFailed(args: {
  parentOrderId: string;
  paymentId: string;
  rawResponse: unknown;
}) {
  const { parentOrderId, paymentId, rawResponse } = args;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        rawInitializeResponse: toJsonValue(rawResponse),
      },
    });

    await tx.parentOrder.update({
      where: { id: parentOrderId },
      data: {
        status: ParentOrderStatus.FAILED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });
  });
}

export async function markPaymentVerificationState(args: {
  reference: string;
  paymentStatus: "FAILED" | "CANCELLED";
  rawVerifyResponse: unknown;
}) {
  const { reference, paymentStatus, rawVerifyResponse } = args;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { reference } });
    if (!payment || payment.status === PaymentStatus.PAID) {
      return;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        verifiedAt: new Date(),
        rawVerifyResponse: toJsonValue(rawVerifyResponse),
      },
    });

    await tx.parentOrder.update({
      where: { id: payment.parentOrderId },
      data: {
        paymentStatus,
        status: paymentStatus === "CANCELLED" ? ParentOrderStatus.CANCELLED : ParentOrderStatus.FAILED,
        cancelledAt: paymentStatus === "CANCELLED" ? new Date() : undefined,
      },
    });
  });
}

export async function finalizeSuccessfulPayment(args: {
  reference: string;
  verification: PaymentVerificationPayload;
}) {
  const { reference, verification } = args;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference },
      include: {
        parentOrder: {
          include: parentOrderInclude,
        },
      },
    });

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (payment.reference !== verification.reference) {
      throw new Error("PAYMENT_REFERENCE_MISMATCH");
    }

    if (verification.amount !== nairaToSubunit(payment.amount)) {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }

    const verificationCurrency = verification.currency?.toUpperCase();
    if (verificationCurrency && verificationCurrency !== payment.currencyCode.toUpperCase()) {
      throw new Error("PAYMENT_CURRENCY_MISMATCH");
    }

    const verificationEmail = verification.customer?.email?.trim().toLowerCase();
    if (
      verificationEmail &&
      verificationEmail !== payment.parentOrder.buyerEmailSnapshot.trim().toLowerCase()
    ) {
      throw new Error("PAYMENT_CUSTOMER_MISMATCH");
    }

    if (payment.status === PaymentStatus.PAID) {
      const existingOrder = await tx.parentOrder.findUnique({
        where: { id: payment.parentOrderId },
        include: parentOrderInclude,
      });

      if (!existingOrder) {
        throw new Error("ORDER_NOT_FOUND");
      }

      return { alreadyProcessed: true, order: existingOrder };
    }

    const paidAt = normalizePaidAt(verification.paid_at);

    const updateResult = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: {
          not: PaymentStatus.PAID,
        },
      },
      data: {
        status: PaymentStatus.PAID,
        verifiedAt: new Date(),
        paidAt,
        rawVerifyResponse: toJsonValue(verification),
      },
    });

    if (updateResult.count === 0) {
      const existingOrder = await tx.parentOrder.findUnique({
        where: { id: payment.parentOrderId },
        include: parentOrderInclude,
      });

      if (!existingOrder) {
        throw new Error("ORDER_NOT_FOUND");
      }

      return { alreadyProcessed: true, order: existingOrder };
    }

    await tx.parentOrder.update({
      where: { id: payment.parentOrderId },
      data: {
        status: ParentOrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paidAt,
      },
    });

    await tx.sellerOrderGroup.updateMany({
      where: {
        parentOrderId: payment.parentOrderId,
        status: SellerOrderGroupStatus.PENDING,
      },
      data: {
        status: SellerOrderGroupStatus.CONFIRMED,
      },
    });

    for (const group of payment.parentOrder.sellerGroups) {
      const wallet = await getOrCreateSellerWallet(tx, group.sellerId);
      const pendingCreditAmount = group.sellerEarningsAmount;
      const pendingWallet = await tx.sellerWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: {
            increment: pendingCreditAmount,
          },
          totalEarnings: {
            increment: pendingCreditAmount,
          },
        },
      });

      await createWalletTransaction(tx, {
        walletId: wallet.id,
        type: WalletTransactionType.ORDER_PENDING_CREDIT,
        amount: pendingCreditAmount,
        pendingBalanceAfter: pendingWallet.pendingBalance,
        availableBalanceAfter: pendingWallet.availableBalance,
        processingBalanceAfter: pendingWallet.processingBalance,
        withdrawnBalanceAfter: pendingWallet.withdrawnBalance,
        description: `Pending credit for seller order group ${group.id}`,
        parentOrderId: payment.parentOrderId,
        sellerOrderGroupId: group.id,
        idempotencyKey: `payment:${payment.id}:wallet_pending:${group.id}`,
        metadata: toJsonValue({
          paymentId: payment.id,
          paymentReference: payment.reference,
          sellerEarningsAmount: group.sellerEarningsAmount,
          platformCommissionAmount: group.platformCommissionAmount,
        }),
      });

      if (group.discountTotal > 0 && group.discountCodeSnapshot) {
        await tx.discount.updateMany({
          where: {
            sellerId: group.sellerId,
            code: group.discountCodeSnapshot,
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        });
      }

      for (const item of group.items) {
        const movementId = await reserveSequentialId(tx, "inventory_movement");
        const idempotencyKey = `payment:${payment.id}:reservation:${item.id}`;

        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { inventory: true, reservedInventory: true },
          });

          const variantAvailableInventory = variant
            ? Math.max(0, variant.inventory - variant.reservedInventory)
            : 0;

          if (!variant || variantAvailableInventory < item.quantity) {
            throw new Error(`INSUFFICIENT_VARIANT_INVENTORY:${item.variantId}`);
          }

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              reservedInventory: {
                increment: item.quantity,
              },
            },
          });

          if (item.productId) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: { inventory: true, reservedInventory: true },
            });

            const productAvailableInventory = product
              ? Math.max(0, product.inventory - product.reservedInventory)
              : 0;

            if (!product || productAvailableInventory < item.quantity) {
              throw new Error(`INSUFFICIENT_PRODUCT_INVENTORY:${item.productId}`);
            }

            await tx.product.update({
              where: { id: item.productId },
              data: {
                reservedInventory: {
                  increment: item.quantity,
                },
              },
            });
          }
        } else if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { inventory: true, reservedInventory: true },
          });

          const productAvailableInventory = product
            ? Math.max(0, product.inventory - product.reservedInventory)
            : 0;

          if (!product || productAvailableInventory < item.quantity) {
            throw new Error(`INSUFFICIENT_PRODUCT_INVENTORY:${item.productId}`);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              reservedInventory: {
                increment: item.quantity,
              },
            },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            id: movementId,
            sellerId: item.sellerId,
            productId: item.productId,
            variantId: item.variantId,
            orderItemId: item.id,
            type: InventoryMovementType.RESERVATION,
            quantityDelta: -item.quantity,
            idempotencyKey,
            metadata: toJsonValue({
              paymentId: payment.id,
              paymentReference: payment.reference,
              parentOrderId: payment.parentOrderId,
              sellerOrderGroupId: group.id,
            }),
          },
        });
      }
    }

    const cartItemIds = parseCartItemIds(payment.metadata);
    if (cartItemIds.length > 0) {
      const cart = await tx.cart.findUnique({
        where: { buyerId: payment.parentOrder.buyerId },
        select: { id: true },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            id: { in: cartItemIds },
          },
        });
      }
    }

    const finalizedOrder = await tx.parentOrder.findUnique({
      where: { id: payment.parentOrderId },
      include: parentOrderInclude,
    });

    if (!finalizedOrder) {
      throw new Error("ORDER_NOT_FOUND");
    }

    return { alreadyProcessed: false, order: finalizedOrder };
  });
}

