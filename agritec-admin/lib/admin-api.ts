"use client";

export const adminApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";

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

export async function adminUploadRequest(
  file: File,
  type: "chat",
  token?: string | null,
) {
  const signatureUrl = `${adminApiBaseUrl}/api/upload`;

  const signatureResponse = await fetch(signatureUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ type }),
    cache: "no-store",
  });

  const signaturePayload = await signatureResponse.json().catch(() => null);
  if (!signatureResponse.ok) {
    throw new Error(signaturePayload?.message || "Failed to prepare upload");
  }

  const upload = signaturePayload?.upload as {
    cloudName: string;
    apiKey: string;
    folder: string;
    timestamp: number;
    signature: string;
    resourceType: "image" | "auto";
  };

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${upload.cloudName}/${upload.resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", upload.apiKey);
  formData.append("timestamp", String(upload.timestamp));
  formData.append("signature", upload.signature);
  formData.append("folder", upload.folder);

  const cloudinaryResponse = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  const cloudinaryPayload = await cloudinaryResponse.json().catch(() => null);
  if (!cloudinaryResponse.ok) {
    const errorMessage =
      cloudinaryPayload?.error?.message ||
      cloudinaryPayload?.message ||
      "Upload failed";
    throw new Error(errorMessage);
  }

  return {
    success: true as const,
    asset: {
      secureUrl: cloudinaryPayload.secure_url,
      publicId: cloudinaryPayload.public_id,
      originalFilename: cloudinaryPayload.original_filename ?? file.name,
      bytes: cloudinaryPayload.bytes ?? file.size,
      mimeType: file.type,
      folder: upload.folder,
    },
  };
}
