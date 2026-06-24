import nodemailer from "nodemailer";
import { SellerOrderGroupStatus, UserRole } from "@prisma/client";

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

function statusMessage(
  status: SellerOrderGroupStatus,
  args: {
    farmName: string;
    actorLabel?: string | null;
  },
) {
  const actor = args.actorLabel?.trim() || args.farmName;
  switch (status) {
    case SellerOrderGroupStatus.CONFIRMED:
      return `${args.farmName} has confirmed this part of your order.`;
    case SellerOrderGroupStatus.PROCESSING:
      return `${args.farmName} is now preparing your items.`;
    case SellerOrderGroupStatus.SHIPPED:
      return `${actor} has marked this delivery as shipped.`;
    case SellerOrderGroupStatus.DELIVERED:
      return `${actor} has marked this delivery as completed.`;
    case SellerOrderGroupStatus.CANCELLED:
      return `${actor} could not complete this delivery and it has been cancelled.`;
    case SellerOrderGroupStatus.REFUNDED:
      return `This order group has been refunded.`;
    default:
      return `There is an update on your order from ${args.farmName}.`;
  }
}

function chatConversationLabel(value: string) {
  switch (value) {
    case "BUYER_SELLER":
      return "Buyer to seller chat";
    case "BUYER_SUPPORT":
      return "Support chat";
    default:
      return "Chat conversation";
  }
}

function getDashboardChatUrl(role: UserRole, conversationId: string) {
  const buyerBase =
    process.env.BUYER_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000";
  const sellerBase =
    process.env.SELLER_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000";
  const adminBase =
    process.env.ADMIN_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3001";

  if (role === UserRole.BUYER) {
    return `${buyerBase.replace(/\/+$/, "")}/account/messages?conversationId=${encodeURIComponent(conversationId)}`;
  }

  const base = role === UserRole.SELLER ? sellerBase : adminBase;
  return `${base.replace(/\/+$/, "")}/dashboard/messages?conversationId=${encodeURIComponent(conversationId)}`;
}

function getAdminPayoutsUrl(withdrawalRequestId: string) {
  const adminBase =
    process.env.ADMIN_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3001";

  return `${adminBase.replace(/\/+$/, "")}/dashboard/payouts?withdrawalId=${encodeURIComponent(withdrawalRequestId)}`;
}

export async function sendBuyerOrderGroupStatusEmail(args: {
  toEmail: string;
  buyerName: string;
  parentOrderId: string;
  sellerOrderGroupId: string;
  farmName: string;
  sellerName?: string | null;
  actorLabel?: string | null;
  status: SellerOrderGroupStatus;
  description?: string | null;
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
  const message = statusMessage(args.status, {
    farmName: args.farmName,
    actorLabel: args.actorLabel ?? null,
  });

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
          ${args.description?.trim() ? `
            <div style="margin-top: 12px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <strong>Update note:</strong> ${args.description.trim()}
            </div>
          ` : ""}
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">Seller group summary</h2>
          <div style="display: grid; gap: 8px; font-size: 14px; color: #374151;">
            <div><strong>Farm:</strong> ${args.farmName}</div>
            ${args.sellerName?.trim() ? `<div><strong>Seller:</strong> ${args.sellerName.trim()}</div>` : ""}
            <div><strong>Order group:</strong> ${args.sellerOrderGroupId}</div>
            <div><strong>Product subtotal:</strong> ${currency(args.productSubtotal)}</div>
            <div><strong>Shipping fee:</strong> ${currency(args.shippingFee)}</div>
            <div><strong>Group total:</strong> ${currency(args.groupTotal)}</div>
            ${args.deliveryRegion ? `<div><strong>Delivery region:</strong> ${args.deliveryRegion}</div>` : ""}
            ${args.actorLabel?.trim() ? `<div><strong>Updated by:</strong> ${args.actorLabel.trim()}</div>` : ""}
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

export async function sendPasswordResetEmail(args: {
  toEmail: string;
  fullName: string;
  role: UserRole;
  resetUrl: string;
  expiresInHours: number;
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER as string;
  const brand = process.env.MARKETPLACE_NAME || process.env.STORE_NAME || "Agritec";
  const roleLabel = args.role === UserRole.SELLER ? "seller" : args.role === UserRole.BUYER ? "buyer" : "admin";

  await transporter.sendMail({
    from: `"${brand}" <${from}>`,
    to: args.toEmail,
    subject: `Reset your ${brand} password`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f7f4; color: #1f2937;">
        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px; font-size: 24px; color: #14532d;">Reset your password</h1>
          <p style="margin: 0; font-size: 15px; color: #4b5563;">Hi ${args.fullName}, we received a request to reset your ${brand} ${roleLabel} account password.</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
            Use the button below to choose a new password. This link will expire in ${args.expiresInHours} hour${args.expiresInHours === 1 ? "" : "s"}.
          </p>
          <a href="${args.resetUrl}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
            Reset password
          </a>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563; line-height: 1.6;">
            If the button does not open, use this link:
          </p>
          <p style="margin: 0; font-size: 14px; word-break: break-all; color: #166534;">${args.resetUrl}</p>
        </div>
      </div>
    `,
  });
}

export async function sendChatMessageAlertEmail(args: {
  toEmail: string;
  recipientName: string;
  recipientRole: "BUYER" | "SELLER" | "ADMIN";
  senderName: string;
  messagePreview: string;
  conversationType: string;
  conversationId: string;
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER as string;
  const brand = process.env.MARKETPLACE_NAME || process.env.STORE_NAME || "Agritec";
  const chatUrl = getDashboardChatUrl(args.recipientRole, args.conversationId);
  const preview = args.messagePreview.trim().slice(0, 160);

  await transporter.sendMail({
    from: `"${brand}" <${from}>`,
    to: args.toEmail,
    subject: `New chat message from ${args.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f7f4; color: #1f2937;">
        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px; font-size: 24px; color: #14532d;">New chat message</h1>
          <p style="margin: 0; font-size: 15px; color: #4b5563;">Hi ${args.recipientName}, you received a new message on ${brand}.</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <div style="display: grid; gap: 8px; font-size: 14px; color: #374151;">
            <div><strong>Sender:</strong> ${args.senderName}</div>
            <div><strong>Conversation:</strong> ${chatConversationLabel(args.conversationType)}</div>
            <div><strong>Message preview:</strong> ${preview}</div>
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb;">
          <a href="${chatUrl}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
            Open chat
          </a>
          <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280; word-break: break-all;">${chatUrl}</p>
        </div>
      </div>
    `,
  });
}

export async function sendSupportAssignmentAlertEmail(args: {
  toEmail: string;
  adminName: string;
  conversationId: string;
  conversationType: string;
  assignedByName?: string | null;
  note?: string | null;
  subjectLabel: string;
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER as string;
  const brand = process.env.MARKETPLACE_NAME || process.env.STORE_NAME || "Agritec";
  const chatUrl = getDashboardChatUrl(UserRole.ADMIN, args.conversationId);

  await transporter.sendMail({
    from: `"${brand}" <${from}>`,
    to: args.toEmail,
    subject: args.subjectLabel,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f7f4; color: #1f2937;">
        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px; font-size: 24px; color: #14532d;">Support conversation assigned</h1>
          <p style="margin: 0; font-size: 15px; color: #4b5563;">Hi ${args.adminName}, a support conversation has been assigned to you on ${brand}.</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <div style="display: grid; gap: 8px; font-size: 14px; color: #374151;">
            <div><strong>Conversation:</strong> ${chatConversationLabel(args.conversationType)}</div>
            ${args.assignedByName ? `<div><strong>Assigned by:</strong> ${args.assignedByName}</div>` : ""}
            ${args.note?.trim() ? `<div><strong>Note:</strong> ${args.note.trim()}</div>` : ""}
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb;">
          <a href="${chatUrl}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
            Open support workspace
          </a>
          <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280; word-break: break-all;">${chatUrl}</p>
        </div>
      </div>
    `,
  });
}


export async function sendAdminPayoutRequestAlertEmail(args: {
  toEmail: string;
  adminName: string;
  sellerName: string;
  farmName: string;
  amount: number;
  withdrawalRequestId: string;
  trigger: "manual" | "auto";
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER as string;
  const brand = process.env.MARKETPLACE_NAME || process.env.STORE_NAME || "Agritec";
  const payoutsUrl = getAdminPayoutsUrl(args.withdrawalRequestId);
  const requestLabel = args.trigger === "auto" ? "Automatic payout request" : "New payout request";

  await transporter.sendMail({
    from: `"${brand}" <${from}>`,
    to: args.toEmail,
    subject: `${requestLabel} from ${args.farmName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f7f4; color: #1f2937;">
        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px; font-size: 24px; color: #14532d;">${requestLabel}</h1>
          <p style="margin: 0; font-size: 15px; color: #4b5563;">Hi ${args.adminName}, a seller payout request is awaiting review.</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <div style="display: grid; gap: 8px; font-size: 14px; color: #374151;">
            <div><strong>Seller:</strong> ${args.sellerName}</div>
            <div><strong>Farm:</strong> ${args.farmName}</div>
            <div><strong>Amount:</strong> ${currency(args.amount)}</div>
            <div><strong>Withdrawal ID:</strong> ${args.withdrawalRequestId}</div>
            <div><strong>Trigger:</strong> ${args.trigger === "auto" ? "Automatic weekly payout" : "Manual seller request"}</div>
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb;">
          <a href="${payoutsUrl}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
            Review payout
          </a>
          <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280; word-break: break-all;">${payoutsUrl}</p>
        </div>
      </div>
    `,
  });
}
