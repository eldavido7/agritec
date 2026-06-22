"use client";

export const logisticsApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://agritec-api.vercel.app";

type RequestOptions = RequestInit & {
  token?: string | null;
};

type ApiError = {
  success?: false;
  message?: string;
};

export async function logisticsApiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const url = `${logisticsApiBaseUrl}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & ApiError)
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
}
