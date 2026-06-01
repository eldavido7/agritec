"use client";

import { mockSellers } from "@/lib/mock-data";

const SESSION_KEY = "agritecSellerSession";

export type SellerSession = {
  sellerId: string;
  email: string;
  username: string;
  name: string;
};

export const authenticateSeller = (identifier: string, password: string) => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const seller = mockSellers.find(
    (item) =>
      (item.email.toLowerCase() === normalizedIdentifier ||
        item.username.toLowerCase() === normalizedIdentifier) &&
      item.password === password,
  );

  if (!seller) return null;

  const session: SellerSession = {
    sellerId: seller.id,
    email: seller.email,
    username: seller.username,
    name: seller.name,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getSellerSession = (): SellerSession | null => {
  if (typeof window === "undefined") return null;
  const rawSession = localStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as SellerSession;
    if (!session.sellerId) return null;
    return session;
  } catch {
    return null;
  }
};

export const getAuthenticatedSeller = () => {
  const session = getSellerSession();
  if (!session) return null;
  return mockSellers.find((seller) => seller.id === session.sellerId) || null;
};

export const logoutSeller = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
};
