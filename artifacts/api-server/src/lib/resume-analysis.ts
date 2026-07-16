import { supabase } from "./supabase.js";
import { analyzeResumeForJob } from "./gemini.js";

export async function runGeminiAnalysisForApplication(
  appId: string,
  job: Record<string, unknown>,
  candidate: Record<string, unknown>,
  skillNames: string[]
): Promise<void> {
  try {
    const parsedResume = (candidate["parsed_resume"] as Record<string, unknown>) ?? {};
    const resumeText = JSON.stringify(parsedResume);
    const analysis = await analyzeResumeForJob(
      job["title"] as string,
      job["description"] as string,
      skillNames,
      parsedResume,
      resumeText
    );

    await supabase.from("resume_analyses").upsert(
      {
        application_id: appId,
        match_score: analysis.matchScore,
        matching_skills: analysis.matchingSkills,
        missing_skills: analysis.missingSkills,
        experience_comparison: analysis.experienceComparison,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recruiter_summary: analysis.recruiterSummary,
        hiring_recommendation: analysis.hiringRecommendation,
        summary: analysis.summary,
        improvement_suggestions: analysis.improvementSuggestions,
      },
      { onConflict: "application_id" }
    );
  } catch (err) {
    console.error("Gemini analysis failed:", err);
  }
}

/** Re-run job-fit analysis for all applications after a resume update. */
export async function rerunAnalysesForCandidate(candidateId: string): Promise<void> {
  const { data: apps } = await supabase
    .from("applications")
    .select("id, jobs(id, title, description, job_skills(skills(name)))")
    .eq("candidate_id", candidateId);

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (!candidate || !apps?.length) return;

  for (const app of apps) {
    const job = (app as Record<string, unknown>)["jobs"] as Record<string, unknown> | null;
    if (!job) continue;
    const skillNames = ((job["job_skills"] as Array<{ skills: { name: string } }>) ?? [])
      .map((js) => js.skills?.name)
      .filter(Boolean);
    await runGeminiAnalysisForApplication(app.id, job, candidate, skillNames);
  }
}
