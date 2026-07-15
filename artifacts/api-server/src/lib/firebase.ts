import { App, initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { logger } from "./logger.js";

let firebaseApp: App | undefined;

function getServiceAccount() {
  const json = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
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
