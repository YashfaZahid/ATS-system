import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { parseResumeWithGemini } from "../lib/gemini.js";

const router = Router();

// List candidates (admin only)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const { q, skill, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from("candidates")
    .select("*, candidate_skills(skills(name))", { count: "exact" });

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,headline.ilike.%${q}%`);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limitNum - 1);

  const { data: candidates, count } = await query;
  res.json({
    candidates: (candidates ?? []).map(formatCandidate),
    total: count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// Compare candidates (admin only) — must come before /:id
router.post("/compare", requireAuth, requireAdmin, async (req, res) => {
  const { candidateIds, jobId } = req.body as { candidateIds: string[]; jobId?: string | null };
  if (!Array.isArray(candidateIds) || candidateIds.length < 2) {
    res.status(400).json({ error: "At least 2 candidateIds required" });
    return;
  }

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*, candidate_skills(skills(name))")
    .in("id", candidateIds);

  const analyses: unknown[] = [];
  if (jobId) {
    for (const cId of candidateIds) {
      const { data: app } = await supabase
        .from("applications")
        .select("id")
        .eq("candidate_id", cId)
        .eq("job_id", jobId)
        .single();
      if (app) {
        const { data: analysis } = await supabase
          .from("resume_analyses")
          .select("*")
          .eq("application_id", app.id)
          .single();
        if (analysis) analyses.push(formatAnalysis(analysis, false));
      }
    }
  }

  res.json({
    candidates: (candidates ?? []).map(formatCandidate),
    analyses,
  });
});

// Get candidate
router.get("/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  const candidateId = req.params["id"];

  // Candidates can only view their own profile
  if (user.role === "candidate") {
    const { data: own } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!own || own.id !== candidateId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*, candidate_skills(skills(name))")
    .eq("id", candidateId)
    .single();

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }
  res.json(formatCandidate(candidate));
});

// Update candidate
router.patch("/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  const candidateId = req.params["id"];

  if (user.role === "candidate") {
    const { data: own } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!own || own.id !== candidateId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields: Record<string, string> = {
    name: "name",
    phone: "phone",
    headline: "headline",
    summary: "summary",
    location: "location",
    linkedinUrl: "linkedin_url",
    githubUrl: "github_url",
    portfolioUrl: "portfolio_url",
  };
  for (const [key, col] of Object.entries(fields)) {
    if (body[key] !== undefined) updates[col] = body[key];
  }

  const { data: updated, error } = await supabase
    .from("candidates")
    .update(updates)
    .eq("id", candidateId)
    .select("*, candidate_skills(skills(name))")
    .single();

  if (error || !updated) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }
  res.json(formatCandidate(updated));
});

// Upload resume
router.post("/:id/resume", requireAuth, async (req, res) => {
  const user = req.user!;
  const candidateId = req.params["id"];

  if (user.role === "candidate") {
    const { data: own } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!own || own.id !== candidateId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const { fileName, fileUrl } = req.body as {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  };

  if (!fileName || !fileUrl) {
    res.status(400).json({ error: "fileName and fileUrl required" });
    return;
  }

  // Download file content for parsing
  let parsedResume: Record<string, unknown> = {
    skills: [], education: [], experience: [], companies: [], projects: [], certifications: []
  };
  try {
    const fileRes = await fetch(fileUrl);
    if (fileRes.ok) {
      const buffer = await fileRes.arrayBuffer();
      const text = Buffer.from(buffer).toString("utf-8");
      parsedResume = await parseResumeWithGemini(text.slice(0, 5000));
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to parse resume content");
  }

  const { data: updated } = await supabase
    .from("candidates")
    .update({
      resume_url: fileUrl,
      resume_file_name: fileName,
      parsed_resume: parsedResume,
      years_of_experience: parsedResume["yearsOfExperience"] ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .select()
    .single();

  // Sync skills
  if (Array.isArray(parsedResume["skills"])) {
    await supabase.from("candidate_skills").delete().eq("candidate_id", candidateId);
    for (const skillName of parsedResume["skills"] as string[]) {
      const { data: skill } = await supabase
        .from("skills")
        .upsert({ name: skillName }, { onConflict: "name" })
        .select()
        .single();
      if (skill) {
        await supabase.from("candidate_skills").insert({ candidate_id: candidateId, skill_id: skill.id });
      }
    }
  }

  res.json({
    resumeUrl: updated?.resume_url ?? fileUrl,
    parsedResume,
    success: true,
  });
});

function formatCandidate(c: Record<string, unknown>) {
  const skills = ((c["candidate_skills"] as Array<{ skills: { name: string } }> | null) ?? [])
    .map((cs) => cs.skills?.name).filter(Boolean);
  return {
    id: c["id"],
    userId: c["user_id"],
    name: c["name"],
    email: c["email"],
    phone: c["phone"] ?? null,
    avatarUrl: c["avatar_url"] ?? null,
    headline: c["headline"] ?? null,
    summary: c["summary"] ?? null,
    location: c["location"] ?? null,
    linkedinUrl: c["linkedin_url"] ?? null,
    githubUrl: c["github_url"] ?? null,
    portfolioUrl: c["portfolio_url"] ?? null,
    resumeUrl: c["resume_url"] ?? null,
    resumeFileName: c["resume_file_name"] ?? null,
    parsedResume: c["parsed_resume"] ?? null,
    skills,
    yearsOfExperience: c["years_of_experience"] ?? null,
    createdAt: c["created_at"],
    updatedAt: c["updated_at"],
  };
}

function formatAnalysis(a: Record<string, unknown>, isCandidate: boolean) {
  const base = {
    id: a["id"],
    applicationId: a["application_id"],
    matchScore: a["match_score"],
    matchingSkills: a["matching_skills"] ?? [],
    missingSkills: a["missing_skills"] ?? [],
    strengths: a["strengths"] ?? [],
    summary: a["summary"] ?? "",
    improvementSuggestions: a["improvement_suggestions"] ?? [],
    weaknesses: isCandidate ? [] : (a["weaknesses"] ?? []),
    experienceComparison: isCandidate ? null : (a["experience_comparison"] ?? null),
    recruiterSummary: isCandidate ? null : (a["recruiter_summary"] ?? null),
    hiringRecommendation: isCandidate ? null : (a["hiring_recommendation"] ?? null),
    createdAt: a["created_at"],
  };
  return base;
}

export { formatAnalysis };
export default router;
