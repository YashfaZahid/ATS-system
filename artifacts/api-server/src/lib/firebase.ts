import { App, initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { logger } from "./logger.js";

let firebaseApp: App | undefined;

function getServiceAccount() {
  let json = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"]?.trim();
  if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");
  // Strip wrapping quotes from .env values like '{"type":...}'
  if (
    (json.startsWith("'") && json.endsWith("'")) ||
    (json.startsWith('"') && json.endsWith('"'))
  ) {
    json = json.slice(1, -1);
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  // Web client config is not a service account — catch the common misconfiguration early
  if (parsed["type"] !== "service_account" || typeof parsed["private_key"] !== "string") {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must be a Firebase Admin service account JSON " +
        '(type: "service_account" with private_key). ' +
        "Do not paste the frontend/web Firebase config here. " +
        "Generate one in Firebase Console → Project Settings → Service accounts → Generate new private key.",
    );
  }
  return parsed;
}

export function getFirebaseAdmin(): App {
  if (!firebaseApp) {
    if (getApps().length === 0) {
      firebaseApp = initializeApp({ credential: cert(getServiceAccount()) });
      logger.info("Firebase Admin initialized");
    } else {
      firebaseApp = getApps()[0]!;
    }
  }
  return firebaseApp;
}

export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  getFirebaseAdmin();
  return getAuth().verifyIdToken(token);
}
