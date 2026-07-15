import { logger } from "./logger.js";

async function triggerWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, "n8n webhook returned non-2xx");
    }
  } catch (err) {
    logger.warn({ err, url }, "n8n webhook failed (non-critical)");
  }
}

export async function triggerApplicationWorkflow(payload: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  applicationId: string;
}): Promise<void> {
  const url = process.env["N8N_APPLICATION_WEBHOOK_URL"] ?? "";
  await triggerWebhook(url, { event: "application_created", ...payload });
}

export async function triggerInterviewWorkflow(payload: {
  candidateName: string;
  candidateEmail: string;
  interviewerName: string;
  interviewerEmail: string;
  jobTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingType: string;
  meetingLink?: string;
  notes?: string;
}): Promise<void> {
  const url = process.env["N8N_INTERVIEW_WEBHOOK_URL"] ?? "";
  await triggerWebhook(url, { event: "interview_scheduled", ...payload });
}
