import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { getFirebaseAdmin } from "../lib/firebase.js";

const router = Router();

// Dashboard stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  const [
    { count: totalJobs },
    { count: openJobs },
    { count: totalCandidates },
    { count: totalApplications },
    { count: totalInterviews },
    { count: upcomingInterviews },
    { count: offers },
    { count: hires },
    { count: rejections },
    { data: stageRows },
    { data: avgScore },
    { count: recentApps },
  ] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("interviews").select("*", { count: "exact", head: true }),
    supabase.from("interviews").select("*", { count: "exact", head: true })
      .gte("scheduled_at", new Date().toISOString()).eq("status", "scheduled"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "offer"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "hired"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "rejected"),
    supabase.from("applications").select("stage"),
    supabase.from("resume_analyses").select("match_score"),
    supabase.from("applications").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Stage breakdown
  const stageCounts: Record<string, number> = {};
  for (const row of stageRows ?? []) {
    stageCounts[row.stage] = (stageCounts[row.stage] || 0) + 1;
  }
  const stages = ["applied","screening","shortlisted","technical_interview","hr_interview","offer","hired","rejected"];
  const applicationsByStage = stages.map((s) => ({ stage: s, count: stageCounts[s] ?? 0 }));

  const scores = (avgScore ?? []).map((r) => r.match_score).filter(Boolean);
  const averageMatchScore = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : null;

  const activeApplications = stages
    .filter((s) => !["hired","rejected"].includes(s))
    .reduce((sum, s) => sum + (stageCounts[s] ?? 0), 0);

  res.json({
    totalJobs: totalJobs ?? 0,
    openJobs: openJobs ?? 0,
    totalCandidates: totalCandidates ?? 0,
    totalApplications: totalApplications ?? 0,
    activeApplications,
    totalInterviews: totalInterviews ?? 0,
    upcomingInterviews: upcomingInterviews ?? 0,
    offers: offers ?? 0,
    hires: hires ?? 0,
    rejections: rejections ?? 0,
    averageMatchScore,
    applicationsByStage,
    recentApplicationsThisWeek: recentApps ?? 0,
  });
});

// Pipeline stats
router.get("/pipeline", requireAuth, requireAdmin, async (req, res) => {
  const { data: rows } = await supabase.from("applications").select("stage");
  const stages = ["applied","screening","shortlisted","technical_interview","hr_interview","offer","hired","rejected"];
  const counts: Record<string, number> = {};
  for (const r of rows ?? []) counts[r.stage] = (counts[r.stage] || 0) + 1;
  const stageCounts = stages.map((s) => ({ stage: s, count: counts[s] ?? 0 }));

  const conversionRates = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i]!;
    const to = stages[i + 1]!;
    const fromCount = counts[from] ?? 0;
    const toCount = counts[to] ?? 0;
    conversionRates.push({
      from,
      to,
      rate: fromCount > 0 ? Math.round((toCount / fromCount) * 100) / 100 : 0,
    });
  }
  res.json({ stages: stageCounts, conversionRates });
});

// Activity logs
router.get("/activity", requireAuth, requireAdmin, async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 50, 200);
  const offset = (pageNum - 1) * limitNum;
  const { data: logs, count } = await supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);
  res.json({
    logs: (logs ?? []).map((l) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: l.details ?? {},
      createdAt: l.created_at,
    })),
    total: count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// List admin users
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const { data: users } = await supabase
    .from("users").select("*").eq("role", "admin").order("created_at");
  res.json((users ?? []).map(formatUser));
});

// Create admin user
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { email, name, password } = req.body as { email: string; name: string; password: string };
  if (!email || !name || !password) {
    res.status(400).json({ error: "email, name, password required" });
    return;
  }

  // Create in Firebase
  let fbUser;
  try {
    const { getAuth } = await import("firebase-admin/auth");
    fbUser = await getAuth().createUser({ email, password, displayName: name });
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    res.status(400).json({ error: error.message ?? "Failed to create Firebase user" });
    return;
  }

  // Create in Supabase
  const { data: user, error } = await supabase
    .from("users")
    .insert({ firebase_uid: fbUser.uid, email, name, role: "admin" })
    .select().single();

  if (error || !user) {
    // Rollback Firebase user
    const { getAuth: getAuth2 } = await import("firebase-admin/auth");
    await getAuth2().deleteUser(fbUser.uid).catch(() => {});
    res.status(500).json({ error: "Failed to create admin user" });
    return;
  }

  await supabase.from("activity_logs").insert({
    user_id: req.user!.id,
    user_name: req.user!.name,
    action: "created_admin_user",
    entity_type: "user",
    entity_id: user.id,
    details: { email, name },
  });

  res.status(201).json(formatUser(user));
});

// Skills list
router.get("/skills", requireAuth, requireAdmin, async (req, res) => {
  const { data: skills } = await supabase
    .from("skills").select("*").order("name");
  res.json((skills ?? []).map((s) => ({ id: s.id, name: s.name, category: s.category ?? null })));
});

function formatUser(u: Record<string, unknown>) {
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
