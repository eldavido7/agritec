"use client";

export const adminApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

export type AdminApiError = {
  success?: false;
  message?: string;
};

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function adminApiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const url = `${adminApiBaseUrl}${path}`;

  console.log("[Admin API] Request", {
    method,
    url,
    hasToken: Boolean(token),
  });

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
    | (T & AdminApiError)
    | null;

  console.log("[Admin API] Response", {
    method,
    url,
    status: response.status,
    ok: response.ok,
    payload,
  });

  if (!response.ok) {
    console.error("[Admin API] Error", {
      method,
      url,
      status: response.status,
      payload,
    });
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
}
