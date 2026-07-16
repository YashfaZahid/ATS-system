import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middlewares/auth.js";
import { verifyFirebaseToken } from "../lib/firebase.js";
import { getFirebaseAdmin } from "../lib/firebase.js";

const router = Router();

// Sync Firebase user to Supabase on first login
router.post("/sync", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = await verifyFirebaseToken(token);
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
    return;
  }

  const { firebaseUid, email, name, avatarUrl } = req.body as {
    firebaseUid: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };

  if (!firebaseUid || !email || !name) {
    res.status(400).json({ error: "firebaseUid, email, name are required" });
    return;
  }
  if (decoded.uid !== firebaseUid) {
    res.status(403).json({ error: "Token uid mismatch" });
    return;
  }

  // Upsert user
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("firebase_uid", firebaseUid)
    .single();

  if (existing) {
    const { data: updated } = await supabase
      .from("users")
      .update({ email, name, avatar_url: avatarUrl ?? null, updated_at: new Date().toISOString() })
      .eq("firebase_uid", firebaseUid)
      .select()
      .single();
    res.json(formatUser(updated));
    return;
  }

  // New user — default role is candidate
  const { data: created, error } = await supabase
    .from("users")
    .insert({
      firebase_uid: firebaseUid,
      email,
      name,
      role: "candidate",
      avatar_url: avatarUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to create user");
    res.status(500).json({ error: "Failed to create user" });
    return;
  }

  // Also create candidate profile
  await supabase.from("candidates").insert({
    user_id: created.id,
    name,
    email,
    avatar_url: avatarUrl ?? null,
  });

  res.json(formatUser(created));
});

// Get current user profile
router.get("/me", requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.user!.id)
    .single();
  res.json(formatUser(user));
});

// Update current user profile
router.patch("/me", requireAuth, async (req, res) => {
  const { name, phone, avatarUrl } = req.body as {
    name?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates["name"] = name;
  if (phone !== undefined) updates["phone"] = phone;
  if (avatarUrl !== undefined) updates["avatar_url"] = avatarUrl;

  const { data: updated } = await supabase
    .from("users")
    .update(updates)
    .eq("id", req.user!.id)
    .select()
    .single();

  res.json(formatUser(updated));
});

function formatUser(u: Record<string, unknown> | null) {
  if (!u) return null;
  return {
    id: u["id"],
    firebaseUid: u["firebase_uid"],
    email: u["email"],
    name: u["name"],
    role: u["role"],
    avatarUrl: u["avatar_url"] ?? null,
    phone: u["phone"] ?? null,
    createdAt: u["created_at"],
    updatedAt: u["updated_at"],
  };
}

export default router;
