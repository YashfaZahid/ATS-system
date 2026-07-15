import admin from "firebase-admin";
import { logger } from "./logger.js";

let app: admin.app.App;

function getServiceAccount() {
  const json = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!json) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
}

export function getFirebaseAdmin(): admin.app.App {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
    });
    logger.info("Firebase Admin initialized");
  }
  return app;
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
  const firebaseApp = getFirebaseAdmin();
  return firebaseApp.auth().verifyIdToken(token);
}
