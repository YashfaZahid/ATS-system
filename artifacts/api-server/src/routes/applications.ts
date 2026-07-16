import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { triggerApplicationWorkflow } from "../lib/n8n.js";
import { runGeminiAnalysisForApplication } from "../lib/resume-analysis.js";
import { formatAnalysis } from "./candidates.js";

const router = Router();

// List applications
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  const { jobId, candidateId, stage, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from("applications")
    .select(
      "*, jobs(id,title,department,location,type,status,salary_min,salary_max,created_at,updated_at), candidates(id,name,email,avatar_url,headline,resume_url,years_of_experience)",
      { count: "exact" }
    );

  // Candidates can only see their own applications
  if (user.role === "candidate") {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!candidate) {
      res.json({ applications: [], total: 0, page: pageNum, limit: limitNum });
      return;
    }
    query = query.eq("candidate_id", candidate.id);
  } else {
    if (candidateId) query = query.eq("candidate_id", candidateId);
    if (jobId) query = query.eq("job_id", jobId);
  }

  if (stage) query = query.eq("stage", stage);
  query = query.order("created_at", { ascending: false }).range(offset, offset + limitNum - 1);

  const { data: apps, count } = await query;
  res.json({
    applications: (apps ?? []).map(formatApplication),
    total: count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// Create application
router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== "candidate") {
    res.status(403).json({ error: "Only candidates can apply" });
    return;
  }

  const { jobId, coverLetter } = req.body as { jobId: string; coverLetter?: string | null };

  // Get candidate profile
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!candidate) {
    res.status(400).json({ error: "Candidate profile not found" });
    return;
  }

  // Check not already applied
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("candidate_id", candidate.id)
    .single();
  if (existing) {
    res.status(409).json({ error: "Already applied to this job" });
    return;
  }

  // Get job
  const { data: job } = await supabase
    .from("jobs")
    .select("*, job_skills(skills(name))")
    .eq("id", jobId)
    .single();
  if (!job || job.status !== "open") {
    res.status(400).json({ error: "Job not found or closed" });
    return;
  }

  // Create application
  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: candidate.id,
      stage: "applied",
      cover_letter: coverLetter ?? null,
    })
    .select()
    .single();

  if (error || !app) {
    res.status(500).json({ error: "Failed to create application" });
    return;
  }

  // Insert initial stage history
  await supabase.from("application_stage_history").insert({
    application_id: app.id,
    previous_stage: null,
    new_stage: "applied",
    changed_by: user.id,
    comment: "Application submitted",
  });

  // Create notification for candidate
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "application_submitted",
    title: "Application submitted",
    message: `Your application for ${job.title} has been received.`,
    data: { applicationId: app.id, jobId },
  });

  // Trigger n8n workflow (non-blocking)
  triggerApplicationWorkflow({
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    jobTitle: job.title,
    applicationId: app.id,
  }).catch(() => {});

  // Kick off Gemini analysis asynchronously
  const skillNames = ((job.job_skills as Array<{ skills: { name: string } }>) ?? [])
    .map((js) => js.skills?.name).filter(Boolean);
  runGeminiAnalysisForApplication(app.id, job, candidate, skillNames).catch(() => {});

  res.status(201).json(formatApplication(app));
});

// Get application
router.get("/:id", requireAuth, async (req, res) => {
  const { data: app } = await supabase
    .from("applications")
    .select("*, jobs(*), candidates(*, candidate_skills(skills(name)))")
    .eq("id", req.params["id"])
    .single();
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  if (req.user!.role === "candidate") {
    const { data: own } = await supabase
      .from("candidates").select("id").eq("user_id", req.user!.id).single();
    if (own?.id !== (app as unknown as Record<string, unknown>)["candidate_id"]) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  res.json(formatApplication(app));
});

// Withdraw application
router.delete("/:id", requireAuth, async (req, res) => {
  const { data: app } = await supabase
    .from("applications").select("*").eq("id", req.params["id"]).single();
  if (!app) { res.status(404).json({ error: "Not found" }); return; }
  if (req.user!.role === "candidate") {
    const { data: own } = await supabase
      .from("candidates").select("id").eq("user_id", req.user!.id).single();
    if (own?.id !== app.candidate_id) { res.status(403).json({ error: "Forbidden" }); return; }
  }
  await supabase.from("applications").delete().eq("id", req.params["id"]);
  res.status(204).send();
});

// Update stage (admin)
router.patch("/:id/stage", requireAuth, requireAdmin, async (req, res) => {
  const { stage, comment } = req.body as { stage: string; comment?: string | null };
  const { data: app } = await supabase
    .from("applications").select("*").eq("id", req.params["id"]).single();
  if (!app) { res.status(404).json({ error: "Not found" }); return; }

  const { data: updated } = await supabase
    .from("applications")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", req.params["id"])
    .select("*, jobs(*), candidates(*)")
    .single();

  await supabase.from("application_stage_history").insert({
    application_id: req.params["id"],
    previous_stage: app.stage,
    new_stage: stage,
    changed_by: req.user!.id,
    comment: comment ?? null,
  });

  // Notify candidate about their stage change
  const candidateRecord = (updated as unknown as Record<string, Record<string, unknown> | null>)?.["candidates"];
  const notifyUserId = candidateRecord?.["user_id"] as string | null;
  if (notifyUserId) {
    await supabase.from("notifications").insert({
      user_id: notifyUserId,
      type: "stage_changed",
      title: "Application status updated",
      message: `Your application stage has been updated to: ${stage.replace(/_/g, " ")}`,
      data: { applicationId: req.params["id"], stage },
    });
  }

  res.json(formatApplication(updated));
});

// Stage history
router.get("/:id/history", requireAuth, async (req, res) => {
  const { data: history } = await supabase
    .from("application_stage_history")
    .select("*")
    .eq("application_id", req.params["id"])
    .order("changed_at", { ascending: true });
  res.json((history ?? []).map((h) => ({
    id: h.id,
    applicationId: h.application_id,
    previousStage: h.previous_stage,
    newStage: h.new_stage,
    comment: h.comment,
    changedBy: h.changed_by,
    changedAt: h.changed_at,
  })));
});

// AI analysis
router.get("/:id/analysis", requireAuth, async (req, res) => {
  const isAdmin = req.user!.role === "admin";
  const { data: analysis } = await supabase
    .from("resume_analyses")
    .select("*")
    .eq("application_id", req.params["id"])
    .single();
  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  res.json(formatAnalysis(analysis as unknown as Record<string, unknown>, !isAdmin));
});

// List notes
router.get("/:id/notes", requireAuth, requireAdmin, async (req, res) => {
  const { data: notes } = await supabase
    .from("recruiter_notes")
    .select("*")
    .eq("application_id", req.params["id"])
    .order("created_at", { ascending: false });
  res.json((notes ?? []).map(formatNote));
});

// Add note
router.post("/:id/notes", requireAuth, requireAdmin, async (req, res) => {
  const { content } = req.body as { content: string };
  const { data: note, error } = await supabase
    .from("recruiter_notes")
    .insert({
      application_id: req.params["id"],
      content,
      author_id: req.user!.id,
      author_name: req.user!.name,
    })
    .select()
    .single();
  if (error || !note) {
    res.status(500).json({ error: "Failed to add note" });
    return;
  }
  res.status(201).json(formatNote(note));
});

function formatApplication(a: Record<string, unknown>) {
  return {
    id: a["id"],
    jobId: a["job_id"],
    candidateId: a["candidate_id"],
    stage: a["stage"],
    coverLetter: a["cover_letter"] ?? null,
    job: a["jobs"] ? formatJobInline(a["jobs"] as Record<string, unknown>) : undefined,
    candidate: a["candidates"] ? formatCandidateInline(a["candidates"] as Record<string, unknown>) : undefined,
    createdAt: a["created_at"],
    updatedAt: a["updated_at"],
  };
}

function formatJobInline(j: Record<string, unknown>) {
  return {
    id: j["id"], title: j["title"], department: j["department"],
    location: j["location"], type: j["type"], status: j["status"],
    description: j["description"] ?? "", requirements: j["requirements"] ?? "",
    responsibilities: j["responsibilities"] ?? "",
    salaryMin: j["salary_min"] ?? null, salaryMax: j["salary_max"] ?? null,
    skills: [], applicationsCount: 0,
    createdAt: j["created_at"], updatedAt: j["updated_at"],
  };
}

function formatCandidateInline(c: Record<string, unknown>) {
  const skills = ((c["candidate_skills"] as Array<{ skills: { name: string } }>) ?? [])
    .map((cs) => cs.skills?.name).filter(Boolean);
  return {
    id: c["id"], userId: c["user_id"], name: c["name"], email: c["email"],
    phone: c["phone"] ?? null, avatarUrl: c["avatar_url"] ?? null,
    headline: c["headline"] ?? null, summary: c["summary"] ?? null,
    location: c["location"] ?? null, linkedinUrl: c["linkedin_url"] ?? null,
    githubUrl: c["github_url"] ?? null, portfolioUrl: c["portfolio_url"] ?? null,
    resumeUrl: c["resume_url"] ?? null, resumeFileName: c["resume_file_name"] ?? null,
    parsedResume: c["parsed_resume"] ?? null, skills,
    yearsOfExperience: c["years_of_experience"] ?? null,
    createdAt: c["created_at"], updatedAt: c["updated_at"],
  };
}

function formatNote(n: Record<string, unknown>) {
  return {
    id: n["id"],
    applicationId: n["application_id"],
    content: n["content"],
    authorId: n["author_id"],
    authorName: n["author_name"],
    createdAt: n["created_at"],
  };
}

export default router;
