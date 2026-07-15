import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { unreadOnly } = req.query as { unreadOnly?: string };
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (unreadOnly === "true") query = query.eq("is_read", false);
  const { data: notifications } = await query;
  res.json((notifications ?? []).map(formatNotification));
});

router.patch("/read-all", requireAuth, async (req, res) => {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", req.user!.id)
    .eq("is_read", false);
  res.json({ success: true });
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const { data: notification } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", req.params["id"])
    .eq("user_id", req.user!.id)
    .select()
    .single();
  if (!notification) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatNotification(notification));
});

function formatNotification(n: Record<string, unknown>) {
  return {
    id: n["id"],
    userId: n["user_id"],
    type: n["type"],
    title: n["title"],
    message: n["message"],
    isRead: n["is_read"],
    data: n["data"] ?? {},
    createdAt: n["created_at"],
  };
}

export default router;
