import { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../lib/firebase.js";
import { supabase } from "../lib/supabase.js";

export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: "candidate" | "admin";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await verifyFirebaseToken(token);
    // Load user from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, firebase_uid, email, name, role")
      .eq("firebase_uid", decoded.uid)
      .single();

    if (error || !user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log?.warn({ err: message }, "Token verification failed");
    const isConfigError =
      message.includes("FIREBASE_SERVICE_ACCOUNT_JSON") ||
      message.includes("service account");
    res.status(401).json({
      error: isConfigError
        ? "Server Firebase Admin is misconfigured (need service account JSON, not web config)"
        : "Invalid token",
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
