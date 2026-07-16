import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export interface GeminiAnalysis {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  experienceComparison: string;
  strengths: string[];
  weaknesses: string[];
  recruiterSummary: string;
  hiringRecommendation: string;
  summary: string;
  improvementSuggestions: string[];
}

export async function analyzeResumeForJob(
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[],
  parsedResume: Record<string, unknown>,
  resumeText: string
): Promise<GeminiAnalysis> {
  const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an expert recruiter and technical interviewer. Analyze this candidate's resume against the job requirements and return a structured JSON evaluation.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}
REQUIRED SKILLS: ${requiredSkills.join(", ")}

PARSED RESUME DATA:
${JSON.stringify(parsedResume, null, 2)}

RAW RESUME TEXT:
${resumeText.slice(0, 3000)}

Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:
{
  "matchScore": <integer 0-100>,
  "matchingSkills": [<skills the candidate has that match requirements>],
  "missingSkills": [<required skills the candidate lacks>],
  "experienceComparison": "<1-2 sentence comparison of candidate experience vs job requirements>",
  "strengths": [<3-5 specific candidate strengths relevant to this role>],
  "weaknesses": [<2-4 specific gaps or concerns>],
  "recruiterSummary": "<2-3 sentence professional summary for recruiters>",
  "hiringRecommendation": "<one of: Strong Hire, Hire, Maybe, No Hire, Strong No Hire>",
  "summary": "<2 sentence candidate-facing summary focusing on fit and potential>",
  "improvementSuggestions": [<3-5 actionable suggestions the candidate can act on>]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  try {
    return JSON.parse(cleaned) as GeminiAnalysis;
  } catch {
    throw new Error(`Failed to parse Gemini response: ${text.slice(0, 200)}`);
  }
}

const RESUME_JSON_SCHEMA = `{
  "name": "<full name or null>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "experience": [{ "title": "", "company": "", "duration": "", "description": "" }],
  "companies": ["<company name>"],
  "projects": [{ "name": "", "description": "", "technologies": [] }],
  "certifications": ["<cert name>"],
  "skills": ["<skill>"],
  "yearsOfExperience": <integer or null>
}`;

const EMPTY_RESUME = { skills: [], education: [], experience: [], companies: [], projects: [], certifications: [] };

function cleanJson(text: string): string {
  return text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
}

export async function parseResumeWithGemini(resumeText: string): Promise<Record<string, unknown>> {
  const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Extract structured data from this resume text. Return ONLY valid JSON (no markdown, no explanation).\n\nRESUME TEXT:\n${resumeText.slice(0, 4000)}\n\nReturn JSON matching this structure:\n${RESUME_JSON_SCHEMA}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(cleanJson(result.response.text())) as Record<string, unknown>;
  } catch {
    return EMPTY_RESUME;
  }
}

/**
 * Parse a resume directly from its binary content (PDF or DOCX) using
 * Gemini's native document understanding — no text extraction library needed.
 */
export async function parseResumeFromFile(
  base64Content: string,
  mimeType: string
): Promise<Record<string, unknown>> {
  const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Extract structured data from this resume document. Return ONLY valid JSON (no markdown, no explanation).\n\nReturn JSON matching this structure:\n${RESUME_JSON_SCHEMA}`;
  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Content } },
      { text: prompt },
    ]);
    return JSON.parse(cleanJson(result.response.text())) as Record<string, unknown>;
  } catch {
    return EMPTY_RESUME;
  }
}
