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

function logApi(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[Logistics API] ${event}`, payload);
}

export async function logisticsApiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const url = `${logisticsApiBaseUrl}${path}`;

  logApi("Request", {
    method,
    url,
    hasToken: Boolean(token),
    body: typeof rest.body === "string" ? rest.body : undefined,
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
    | (T & ApiError)
    | null;

  logApi("Response", {
    method,
    url,
    status: response.status,
    ok: response.ok,
    payload,
  });

  if (!response.ok) {
    logApi("Error", {
      method,
      url,
      status: response.status,
      payload,
    });
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
}
