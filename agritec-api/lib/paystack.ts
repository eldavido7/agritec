import crypto from "node:crypto";
import { z } from "zod";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackBank = {
  id: number;
  name: string;
  slug?: string;
  code: string;
  longcode?: string;
  gateway?: string | null;
  pay_with_bank?: boolean;
  active?: boolean;
  country?: string;
  currency?: string;
  type?: string;
  is_deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaystackResolvedAccount = {
  account_number: string;
  account_name: string;
  bank_id?: number;
};

export type PaystackTransferRecipient = {
  active: boolean;
  createdAt: string;
  currency: string;
  domain: string;
  id: number;
  integration: number;
  name: string;
  recipient_code: string;
  type: string;
  updatedAt: string;
  details?: {
    authorization_code?: string;
    account_number?: string;
    account_name?: string;
    bank_code?: string;
    bank_name?: string;
  };
};

export type PaystackInitializeTransactionResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackTransaction = {
  id: number | string;
  domain?: string;
  status: string;
  reference: string;
  amount: number;
  message?: string | null;
  gateway_response?: string | null;
  paid_at?: string | null;
  created_at?: string;
  channel?: string | null;
  currency?: string | null;
  customer?: {
    email?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
};

export type PaystackTransfer = {
  id?: number | string;
  transfer_code?: string | null;
  reference: string;
  amount: number;
  currency?: string | null;
  status: string;
  reason?: string | null;
  gateway_response?: string | null;
  recipient?: {
    recipient_code?: string | null;
    name?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  transferred_at?: string | null;
  failures?: unknown;
};

function getPaystackSecretKey() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY_NOT_CONFIGURED");
  }
  return secret;
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<PaystackResponse<T>> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await response.json()) as PaystackResponse<T> & { message?: string };

  if (!response.ok || !data.status) {
    const error = new Error(data.message || "PAYSTACK_REQUEST_FAILED");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return data;
}

const initializeTransactionSchema = z.object({
  email: z.string().trim().email(),
  amount: z.number().int().positive(),
  currency: z.string().trim().min(3).default("NGN"),
  reference: z.string().trim().min(1),
  callback_url: z.string().trim().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(z.string().trim().min(1)).optional(),
});

export async function initializePaystackTransaction(input: {
  email: string;
  amountInSubunit: number;
  reference: string;
  currencyCode?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}) {
  const payload = initializeTransactionSchema.parse({
    email: input.email,
    amount: input.amountInSubunit,
    currency: input.currencyCode ?? "NGN",
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: input.metadata,
    channels: input.channels,
  });

  const result = await paystackRequest<PaystackInitializeTransactionResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      amount: String(payload.amount),
    }),
  });

  return result.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const result = await paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
  return result.data;
}

const initiateTransferSchema = z.object({
  source: z.literal("balance").default("balance"),
  amount: z.number().int().positive(),
  recipient: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  currency: z.string().trim().min(3).default("NGN"),
  reference: z.string().trim().min(16).max(50).regex(/^[a-z0-9_-]+$/),
});

export async function initiatePaystackTransfer(input: {
  recipientCode: string;
  amountInSubunit: number;
  reason: string;
  reference: string;
  currencyCode?: string;
}) {
  const payload = initiateTransferSchema.parse({
    source: "balance",
    amount: input.amountInSubunit,
    recipient: input.recipientCode,
    reason: input.reason,
    currency: input.currencyCode ?? "NGN",
    reference: input.reference,
  });

  const result = await paystackRequest<PaystackTransfer>("/transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result.data;
}

const finalizeTransferSchema = z.object({
  transfer_code: z.string().trim().min(1),
  otp: z.string().trim().min(1),
});

export async function finalizePaystackTransfer(input: { transferCode: string; otp: string }) {
  const payload = finalizeTransferSchema.parse({
    transfer_code: input.transferCode,
    otp: input.otp,
  });

  const result = await paystackRequest<PaystackTransfer>("/transfer/finalize_transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result.data;
}

export async function verifyPaystackTransfer(reference: string) {
  const result = await paystackRequest<PaystackTransfer>(`/transfer/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });

  return result.data;
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto.createHmac("sha512", getPaystackSecretKey()).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function listPaystackBanks() {
  const result = await paystackRequest<PaystackBank[]>("/bank?country=nigeria&currency=NGN");
  return result.data
    .filter((bank) => bank.active !== false && bank.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPaystackBankByCode(bankCode: string) {
  const banks = await listPaystackBanks();
  return banks.find((bank) => bank.code === bankCode) ?? null;
}

export async function resolvePaystackAccountNumber(accountNumber: string, bankCode: string) {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });
  const result = await paystackRequest<PaystackResolvedAccount>(`/bank/resolve?${params.toString()}`);
  return result.data;
}

const transferRecipientSchema = z.object({
  type: z.literal("nuban").default("nuban"),
  name: z.string().trim().min(1),
  account_number: z.string().trim().min(10),
  bank_code: z.string().trim().min(1),
  currency: z.literal("NGN").default("NGN"),
});

export async function createPaystackTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}) {
  const payload = transferRecipientSchema.parse({
    type: "nuban",
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: "NGN",
  });

  const result = await paystackRequest<PaystackTransferRecipient>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result.data;
}
