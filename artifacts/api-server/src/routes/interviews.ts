import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { triggerInterviewWorkflow } from "../lib/n8n.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  const { applicationId, candidateId, upcoming } = req.query as Record<string, string>;

  let query = supabase
    .from("interviews")
    .select("*, jobs(id,title,department,location,type,status,salary_min,salary_max,created_at,updated_at), candidates(id,name,email,avatar_url,headline), interview_feedback(*)");

  if (user.role === "candidate") {
    const { data: candidate } = await supabase
      .from("candidates").select("id").eq("user_id", user.id).single();
    if (!candidate) { res.json([]); return; }
    query = query.eq("candidate_id", candidate.id);
  } else {
    if (candidateId) query = query.eq("candidate_id", candidateId);
    if (applicationId) query = query.eq("application_id", applicationId);
  }

  if (upcoming === "true") {
    query = query.gte("scheduled_at", new Date().toISOString()).eq("status", "scheduled");
  }

  query = query.order("scheduled_at", { ascending: true });
  const { data: interviews } = await query;
  res.json((interviews ?? []).map(formatInterview));
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as {
    applicationId: string;
    interviewerName: string;
    interviewerEmail: string;
    scheduledAt: string;
    durationMinutes: number;
    meetingType: string;
    meetingLink?: string | null;
    notes?: string | null;
  };

  const { data: app } = await supabase
    .from("applications").select("*, candidates(*), jobs(*)").eq("id", body.applicationId).single();
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      application_id: body.applicationId,
      candidate_id: (app as unknown as Record<string, unknown>)["candidate_id"],
      job_id: (app as unknown as Record<string, unknown>)["job_id"],
      interviewer_name: body.interviewerName,
      interviewer_email: body.interviewerEmail,
      scheduled_at: body.scheduledAt,
      duration_minutes: body.durationMinutes,
      meeting_type: body.meetingType,
      meeting_link: body.meetingLink ?? null,
      notes: body.notes ?? null,
      status: "scheduled",
    })
    .select()
    .single();

  if (error || !interview) {
    res.status(500).json({ error: "Failed to schedule interview" });
    return;
  }

  const candidate = (app as unknown as Record<string, unknown>)["candidates"] as Record<string, unknown>;
  const job = (app as unknown as Record<string, unknown>)["jobs"] as Record<string, unknown>;

  // Notify candidate
  const { data: cu } = await supabase.from("users").select("id").eq("id", candidate["user_id"]).single();
  if (cu) {
    await supabase.from("notifications").insert({
      user_id: cu.id,
      type: "interview_scheduled",
      title: "Interview scheduled",
      message: `An interview for ${job["title"]} has been scheduled on ${new Date(body.scheduledAt).toLocaleDateString()}.`,
      data: { interviewId: interview.id },
    });
  }

  // Trigger n8n
  triggerInterviewWorkflow({
    candidateName: candidate["name"] as string,
    candidateEmail: candidate["email"] as string,
    interviewerName: body.interviewerName,
    interviewerEmail: body.interviewerEmail,
    jobTitle: job["title"] as string,
    scheduledAt: body.scheduledAt,
    durationMinutes: body.durationMinutes,
    meetingType: body.meetingType,
    meetingLink: body.meetingLink ?? undefined,
    notes: body.notes ?? undefined,
  }).catch(() => {});

  res.status(201).json(formatInterview(interview));
});

router.get("/:id", requireAuth, async (req, res) => {
  const { data: interview } = await supabase
    .from("interviews")
    .select("*, jobs(*), candidates(id,name,email,avatar_url,headline), interview_feedback(*)")
    .eq("id", req.params["id"])
    .single();
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; }
  res.json(formatInterview(interview));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fieldMap: Record<string, string> = {
    interviewerName: "interviewer_name",
    interviewerEmail: "interviewer_email",
    scheduledAt: "scheduled_at",
    durationMinutes: "duration_minutes",
    meetingType: "meeting_type",
    meetingLink: "meeting_link",
    notes: "notes",
    status: "status",
  };
  for (const [key, col] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) updates[col] = body[key];
  }
  const { data: updated } = await supabase
    .from("interviews").update(updates).eq("id", req.params["id"])
    .select("*, jobs(*), candidates(id,name,email,avatar_url,headline)").single();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatInterview(updated));
});

router.get("/:id/feedback", requireAuth, async (req, res) => {
  const { data: feedback } = await supabase
    .from("interview_feedback").select("*").eq("interview_id", req.params["id"]).single();
  if (!feedback) { res.status(404).json({ error: "Feedback not found" }); return; }
  res.json(formatFeedback(feedback));
});

router.post("/:id/feedback", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as {
    technicalRating: number;
    communicationRating: number;
    problemSolvingRating: number;
    cultureFitRating: number;
    comments: string;
    recommendation: string;
  };
  const overallRating = Math.round(
    (body.technicalRating + body.communicationRating + body.problemSolvingRating + body.cultureFitRating) / 4
  );
  const { data: feedback, error } = await supabase
    .from("interview_feedback")
    .insert({
      interview_id: req.params["id"],
      technical_rating: body.technicalRating,
      communication_rating: body.communicationRating,
      problem_solving_rating: body.problemSolvingRating,
      culture_fit_rating: body.cultureFitRating,
      overall_rating: overallRating,
      comments: body.comments,
      recommendation: body.recommendation,
      submitted_by: req.user!.id,
    })
    .select().single();
  if (error || !feedback) {
    res.status(500).json({ error: "Failed to submit feedback" });
    return;
  }
  // Mark interview as completed
  await supabase.from("interviews")
    .update({ status: "completed" }).eq("id", req.params["id"]);
  res.status(201).json(formatFeedback(feedback));
});

function formatInterview(i: Record<string, unknown>) {
  const fb = i["interview_feedback"];
  const feedbackRecord = Array.isArray(fb) ? (fb[0] ?? null) : (fb ?? null);
  const c = i["candidates"] as Record<string, unknown> | null;
  const j = i["jobs"] as Record<string, unknown> | null;
  return {
    id: i["id"],
    applicationId: i["application_id"],
    candidateId: i["candidate_id"],
    jobId: i["job_id"],
    interviewerName: i["interviewer_name"],
    interviewerEmail: i["interviewer_email"],
    scheduledAt: i["scheduled_at"],
    durationMinutes: i["duration_minutes"],
    meetingType: i["meeting_type"],
    meetingLink: i["meeting_link"] ?? null,
    notes: i["notes"] ?? null,
    status: i["status"],
    feedback: feedbackRecord ? formatFeedback(feedbackRecord as Record<string, unknown>) : null,
    candidate: c ? {
      id: c["id"], userId: c["user_id"], name: c["name"], email: c["email"],
      phone: null, avatarUrl: c["avatar_url"] ?? null, headline: c["headline"] ?? null,
      summary: null, location: null, linkedinUrl: null, githubUrl: null, portfolioUrl: null,
      resumeUrl: null, resumeFileName: null, parsedResume: null, skills: [],
      yearsOfExperience: null, createdAt: c["created_at"], updatedAt: c["updated_at"],
    } : null,
    job: j ? {
      id: j["id"], title: j["title"], department: j["department"],
      location: j["location"], type: j["type"], status: j["status"],
      description: j["description"] ?? "", requirements: j["requirements"] ?? "",
      responsibilities: j["responsibilities"] ?? "",
      salaryMin: j["salary_min"] ?? null, salaryMax: j["salary_max"] ?? null,
      skills: [], applicationsCount: 0, createdAt: j["created_at"], updatedAt: j["updated_at"],
    } : null,
    createdAt: i["created_at"],
  };
}

function formatFeedback(f: Record<string, unknown>) {
  return {
    id: f["id"],
    interviewId: f["interview_id"],
    technicalRating: f["technical_rating"],
    communicationRating: f["communication_rating"],
    problemSolvingRating: f["problem_solving_rating"],
    cultureFitRating: f["culture_fit_rating"],
    overallRating: f["overall_rating"],
    comments: f["comments"],
    recommendation: f["recommendation"],
    submittedBy: f["submitted_by"],
    createdAt: f["created_at"],
  };
}

export default router;
