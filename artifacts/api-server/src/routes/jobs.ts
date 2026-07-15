import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// List jobs (public with optional auth for applying)
router.get("/", async (req, res) => {
  const { q, department, location, type, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from("jobs")
    .select("*, job_skills(skills(name))", { count: "exact" });

  if (q) {
    query = query.or(`title.ilike.%${q}%,department.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (department) query = query.eq("department", department);
  if (location) query = query.ilike("location", `%${location}%`);
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  else query = query.eq("status", "open"); // default: open only unless specified

  query = query.order("created_at", { ascending: false }).range(offset, offset + limitNum - 1);

  const { data: jobs, count, error } = await query;
  if (error) {
    res.status(500).json({ error: "Failed to fetch jobs" });
    return;
  }

  // Get application counts
  const jobIds = (jobs ?? []).map((j) => j.id);
  let appCounts: Record<string, number> = {};
  if (jobIds.length > 0) {
    const { data: counts } = await supabase
      .from("applications")
      .select("job_id")
      .in("job_id", jobIds)
      .neq("stage", "rejected");
    appCounts = (counts ?? []).reduce((acc: Record<string, number>, c) => {
      acc[c.job_id] = (acc[c.job_id] || 0) + 1;
      return acc;
    }, {});
  }

  res.json({
    jobs: (jobs ?? []).map((j) => formatJob(j, appCounts[j.id] ?? 0)),
    total: count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// Create job
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as {
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
    requirements: string;
    responsibilities: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    skills?: string[];
  };

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      title: body.title,
      department: body.department,
      location: body.location,
      type: body.type,
      description: body.description,
      requirements: body.requirements,
      responsibilities: body.responsibilities,
      salary_min: body.salaryMin ?? null,
      salary_max: body.salaryMax ?? null,
      status: "open",
      created_by: req.user!.id,
    })
    .select()
    .single();

  if (error || !job) {
    res.status(500).json({ error: "Failed to create job" });
    return;
  }

  // Insert skills
  if (body.skills?.length) {
    await upsertJobSkills(job.id, body.skills);
  }

  await logActivity(req.user!.id, req.user!.name, "created_job", "job", job.id, { title: body.title });
  res.status(201).json(formatJob(job, 0, body.skills ?? []));
});

// Get job
router.get("/:id", async (req, res) => {
  const { data: job } = await supabase
    .from("jobs")
    .select("*, job_skills(skills(name))")
    .eq("id", req.params["id"])
    .single();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const { count } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("job_id", job.id);

  res.json(formatJob(job, count ?? 0));
});

// Update job
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body["title"] !== undefined) updates["title"] = body["title"];
  if (body["department"] !== undefined) updates["department"] = body["department"];
  if (body["location"] !== undefined) updates["location"] = body["location"];
  if (body["type"] !== undefined) updates["type"] = body["type"];
  if (body["description"] !== undefined) updates["description"] = body["description"];
  if (body["requirements"] !== undefined) updates["requirements"] = body["requirements"];
  if (body["responsibilities"] !== undefined) updates["responsibilities"] = body["responsibilities"];
  if (body["salaryMin"] !== undefined) updates["salary_min"] = body["salaryMin"];
  if (body["salaryMax"] !== undefined) updates["salary_max"] = body["salaryMax"];

  const { data: job, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", req.params["id"])
    .select()
    .single();

  if (error || !job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (Array.isArray(body["skills"])) {
    await upsertJobSkills(job.id, body["skills"] as string[]);
  }

  res.json(formatJob(job, 0, Array.isArray(body["skills"]) ? (body["skills"] as string[]) : []));
});

// Delete job
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from("jobs").delete().eq("id", req.params["id"]);
  if (error) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  await logActivity(req.user!.id, req.user!.name, "deleted_job", "job", req.params["id"]!, {});
  res.status(204).send();
});

// Open/close job
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body as { status: "open" | "closed" };
  const { data: job, error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", req.params["id"])
    .select()
    .single();

  if (error || !job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(formatJob(job, 0));
});

async function upsertJobSkills(jobId: string, skillNames: string[]) {
  // Delete existing
  await supabase.from("job_skills").delete().eq("job_id", jobId);
  for (const name of skillNames) {
    // Upsert skill
    const { data: skill } = await supabase
      .from("skills")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();
    if (skill) {
      await supabase.from("job_skills").insert({ job_id: jobId, skill_id: skill.id });
    }
  }
}

async function logActivity(
  userId: string,
  userName: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>
) {
  await supabase.from("activity_logs").insert({
    user_id: userId,
    user_name: userName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

function formatJob(j: Record<string, unknown>, appCount: number, skillNames?: string[]) {
  const skills = skillNames
    ?? ((j["job_skills"] as Array<{ skills: { name: string } }> | null) ?? [])
       .map((js) => js.skills?.name).filter(Boolean);
  return {
    id: j["id"],
    title: j["title"],
    department: j["department"],
    location: j["location"],
    type: j["type"],
    status: j["status"],
    description: j["description"],
    requirements: j["requirements"],
    responsibilities: j["responsibilities"],
    salaryMin: j["salary_min"] ?? null,
    salaryMax: j["salary_max"] ?? null,
    skills,
    applicationsCount: appCount,
    createdAt: j["created_at"],
    updatedAt: j["updated_at"],
  };
}

export default router;
