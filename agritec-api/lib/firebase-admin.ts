import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

type ServiceAccountConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function parseServiceAccountFromEnv(): ServiceAccountConfig | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const projectId = `${parsed.project_id ?? parsed.projectId ?? ""}`.trim();
      const clientEmail = `${parsed.client_email ?? parsed.clientEmail ?? ""}`.trim();
      const privateKey = `${parsed.private_key ?? parsed.privateKey ?? ""}`;
      if (projectId && clientEmail && privateKey) {
        return {
          projectId,
          clientEmail,
          privateKey: normalizePrivateKey(privateKey),
        };
      }
    } catch {
      // fall through to split envs
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim() ?? "";

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

export function getFirebaseAdminApp(): App | null {
  const existing = getApps();
  if (existing.length > 0) {
    return getApp();
  }

  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    return null;
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    }),
  });
}

export function getFirebaseMessagingClient() {
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }
  return getMessaging(app);
}
