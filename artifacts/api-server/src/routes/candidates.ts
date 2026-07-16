import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { parseResumeFromFile, parseResumeWithGemini } from "../lib/gemini.js";
import { getEmbedding, resumeToText } from "../lib/embeddings.js";
import { rerunAnalysesForCandidate } from "../lib/resume-analysis.js";

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

// Backfill embeddings for candidates missing them (admin only)
router.post("/backfill-embeddings", requireAuth, requireAdmin, async (req, res) => {
  const { limit = 50 } = req.body as { limit?: number };
  const batchSize = Math.min(Number(limit) || 50, 100);

  const { data: rows, error } = await supabase
    .from("candidates")
    .select("id, parsed_resume")
    .is("resume_embedding", null)
    .not("parsed_resume", "is", null)
    .limit(batchSize);

  if (error) {
    res.status(500).json({ error: "Failed to fetch candidates", details: error.message });
    return;
  }

  let updated = 0;
  const failures: string[] = [];

  for (const row of rows ?? []) {
    const parsed = (row.parsed_resume as Record<string, unknown>) ?? {};
    const text = resumeToText(parsed);
    if (text.length <= 20) {
      failures.push(`${row.id}: insufficient parsed resume text`);
      continue;
    }
    try {
      const embedding = await getEmbedding(text);
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ resume_embedding: embedding, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updateError) {
        failures.push(`${row.id}: ${updateError.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      failures.push(`${row.id}: ${err instanceof Error ? err.message : "embedding failed"}`);
    }
  }

  res.json({
    processed: rows?.length ?? 0,
    updated,
    failures,
    success: true,
  });
});

// Semantic resume search (admin only) — must come before /:id
router.post("/search", requireAuth, requireAdmin, async (req, res) => {
  const { query, threshold = 0.25, limit = 20 } = req.body as {
    query: string;
    threshold?: number;
    limit?: number;
  };

  if (!query || query.trim().length < 3) {
    res.status(400).json({ error: "Query must be at least 3 characters" });
    return;
  }

  try {
    const embedding = await getEmbedding(query.slice(0, 1000));
    const { data, error } = await supabase.rpc("match_resumes", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: Math.min(Number(limit), 50),
    });

    if (error) {
      req.log.error({ error }, "match_resumes RPC failed");
      res.status(500).json({ error: "Search failed", details: error.message });
      return;
    }

    // Enrich with skills
    const results = (data ?? []) as Array<Record<string, unknown>>;
    const ids = results.map((r) => r["id"] as string);
    const { data: skillRows } = ids.length
      ? await supabase
          .from("candidate_skills")
          .select("candidate_id, skills(name)")
          .in("candidate_id", ids)
      : { data: [] };

    const skillMap: Record<string, string[]> = {};
    for (const row of skillRows ?? []) {
      const r = row as Record<string, unknown>;
      const cid = r["candidate_id"] as string;
      const sname = (r["skills"] as { name: string } | null)?.name;
      if (sname) {
        skillMap[cid] = skillMap[cid] ?? [];
        skillMap[cid].push(sname);
      }
    }

    res.json({
      candidates: results.map((r) => ({
        id: r["id"],
        userId: r["user_id"],
        name: r["name"],
        email: r["email"],
        phone: r["phone"] ?? null,
        avatarUrl: r["avatar_url"] ?? null,
        headline: r["headline"] ?? null,
        summary: r["summary"] ?? null,
        location: r["location"] ?? null,
        linkedinUrl: r["linkedin_url"] ?? null,
        githubUrl: r["github_url"] ?? null,
        portfolioUrl: r["portfolio_url"] ?? null,
        resumeUrl: r["resume_url"] ?? null,
        resumeFileName: r["resume_file_name"] ?? null,
        yearsOfExperience: r["years_of_experience"] ?? null,
        skills: skillMap[r["id"] as string] ?? [],
        similarity: Math.round(Number(r["similarity"]) * 100),
      })),
      total: results.length,
    });
  } catch (err) {
    req.log.error({ err }, "Embedding generation failed");
    res.status(500).json({ error: "Failed to generate search embedding. Model may still be loading — try again in a moment." });
  }
});

// Resolve a candidate row by either candidate.id or candidate.user_id
async function resolveCandidateId(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("candidates")
    .select("id")
    .or(`id.eq.${id},user_id.eq.${id}`)
    .single();
  return data?.id ?? null;
}

// Get candidate
router.get("/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  const resolvedId = await resolveCandidateId(String(req.params["id"]));

  if (!resolvedId) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  // Candidates can only view their own profile
  if (user.role === "candidate") {
    const { data: own } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!own || own.id !== resolvedId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*, candidate_skills(skills(name))")
    .eq("id", resolvedId)
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
  const candidateId = await resolveCandidateId(String(req.params["id"])) ?? String(req.params["id"]);

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
  const candidateId = await resolveCandidateId(String(req.params["id"])) ?? String(req.params["id"]);

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

  const { fileName, fileUrl, fileContent, mimeType } = req.body as {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    fileContent?: string; // base64-encoded file bytes from frontend
  };

  if (!fileName || !fileUrl) {
    res.status(400).json({ error: "fileName and fileUrl required" });
    return;
  }

  // Parse resume content with Gemini
  let parsedResume: Record<string, unknown> = {
    skills: [], education: [], experience: [], companies: [], projects: [], certifications: []
  };
  try {
    if (fileContent && mimeType) {
      // Use Gemini's native document understanding (PDF / DOCX inline data)
      parsedResume = await parseResumeFromFile(fileContent, mimeType);
    } else {
      // Fallback: fetch plain text (works for .txt resumes)
      const fileRes = await fetch(fileUrl);
      if (fileRes.ok) {
        const text = await fileRes.text();
        parsedResume = await parseResumeWithGemini(text.slice(0, 5000));
      }
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to parse resume content");
  }

  // Generate semantic embedding from parsed resume text
  let resumeEmbedding: number[] | null = null;
  let embeddingError: string | null = null;
  try {
    const embeddingText = resumeToText(parsedResume);
    if (embeddingText.length > 20) {
      resumeEmbedding = await getEmbedding(embeddingText);
    } else {
      embeddingError = "Parsed resume had too little text for embedding";
    }
  } catch (err) {
    embeddingError = err instanceof Error ? err.message : "Embedding generation failed";
    req.log.warn({ err }, "Resume embedding generation failed — skipping");
  }

  const { data: updated, error: updateError } = await supabase
    .from("candidates")
    .update({
      resume_url: fileUrl,
      resume_file_name: fileName,
      parsed_resume: parsedResume,
      years_of_experience: parsedResume["yearsOfExperience"] ?? null,
      ...(resumeEmbedding ? { resume_embedding: resumeEmbedding } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .select()
    .single();

  if (updateError) {
    req.log.error({ updateError }, "Failed to save resume");
    res.status(500).json({ error: "Failed to save resume", details: updateError.message });
    return;
  }

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

  // Re-run Gemini job-fit analysis for existing applications (non-blocking)
  rerunAnalysesForCandidate(candidateId).catch((err) =>
    req.log.warn({ err }, "Failed to re-run application analyses after resume upload")
  );

  res.json({
    resumeUrl: updated?.resume_url ?? fileUrl,
    parsedResume,
    embeddingGenerated: !!resumeEmbedding,
    embeddingError,
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
