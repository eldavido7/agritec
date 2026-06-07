import nodemailer from "nodemailer";
import { SellerOrderGroupStatus } from "@prisma/client";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

function currency(amount: number) {
  return `NGN ${amount.toLocaleString()}`;
}

function statusLabel(status: SellerOrderGroupStatus) {
  switch (status) {
    case SellerOrderGroupStatus.PENDING:
      return "Pending";
    case SellerOrderGroupStatus.CONFIRMED:
      return "Confirmed";
    case SellerOrderGroupStatus.PROCESSING:
      return "Processing";
    case SellerOrderGroupStatus.SHIPPED:
      return "Shipped";
    case SellerOrderGroupStatus.DELIVERED:
      return "Delivered";
    case SellerOrderGroupStatus.CANCELLED:
      return "Cancelled";
    case SellerOrderGroupStatus.REFUNDED:
      return "Refunded";
    default:
      return status;
  }
}

function statusMessage(status: SellerOrderGroupStatus, farmName: string) {
  switch (status) {
    case SellerOrderGroupStatus.CONFIRMED:
      return `${farmName} has confirmed its part of your order.`;
    case SellerOrderGroupStatus.PROCESSING:
      return `${farmName} is now preparing your items.`;
    case SellerOrderGroupStatus.SHIPPED:
      return `${farmName} has shipped its part of your order.`;
    case SellerOrderGroupStatus.DELIVERED:
      return `${farmName} has completed delivery for this order group.`;
    case SellerOrderGroupStatus.CANCELLED:
      return `${farmName} could not complete this order group and it has been cancelled.`;
    case SellerOrderGroupStatus.REFUNDED:
      return `${farmName} has marked this order group as refunded.`;
    default:
      return `There is an update on your order from ${farmName}.`;
  }
}

export async function sendBuyerOrderGroupStatusEmail(args: {
  toEmail: string;
  buyerName: string;
  parentOrderId: string;
  sellerOrderGroupId: string;
  farmName: string;
  status: SellerOrderGroupStatus;
  productSubtotal: number;
  shippingFee: number;
  groupTotal: number;
  deliveryRegion?: string | null;
  addressLine?: string | null;
  fullAddress?: string | null;
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER as string;
  const brand = process.env.MARKETPLACE_NAME || process.env.STORE_NAME || "Agritec";
  const readableStatus = statusLabel(args.status);
  const message = statusMessage(args.status, args.farmName);

  await transporter.sendMail({
    from: `"${brand}" <${from}>`,
    to: args.toEmail,
    subject: `Order update - #${args.parentOrderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f7f4; color: #1f2937;">
        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px; font-size: 24px; color: #14532d;">Order status update</h1>
          <p style="margin: 0; font-size: 15px; color: #4b5563;">Hi ${args.buyerName}, there is an update on your Agritec order.</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Order #${args.parentOrderId}</div>
          <div style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px;">${readableStatus}</div>
          <div style="font-size: 15px; color: #374151; line-height: 1.6;">${message}</div>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">Seller group summary</h2>
          <div style="display: grid; gap: 8px; font-size: 14px; color: #374151;">
            <div><strong>Farm:</strong> ${args.farmName}</div>
            <div><strong>Order group:</strong> ${args.sellerOrderGroupId}</div>
            <div><strong>Product subtotal:</strong> ${currency(args.productSubtotal)}</div>
            <div><strong>Shipping fee:</strong> ${currency(args.shippingFee)}</div>
            <div><strong>Group total:</strong> ${currency(args.groupTotal)}</div>
            ${args.deliveryRegion ? `<div><strong>Delivery region:</strong> ${args.deliveryRegion}</div>` : ""}
          </div>
        </div>

        ${(args.fullAddress || args.addressLine) ? `
          <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">Delivery address</h2>
            <div style="font-size: 14px; color: #374151; line-height: 1.6;">${args.fullAddress || args.addressLine}</div>
          </div>
        ` : ""}
      </div>
    `,
  });
}
