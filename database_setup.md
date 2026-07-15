# Database & Services Setup Guide

## 1. Supabase PostgreSQL

### Run the schema
1. Open your [Supabase project](https://supabase.com/dashboard)
2. Click **SQL Editor** in the left sidebar
3. Paste the entire contents of `supabase_schema.sql`
4. Click **Run**

This creates all tables, enums, indexes, foreign keys, and auto-update triggers.

### Create Storage bucket for resumes
1. In Supabase, go to **Storage** → **New bucket**
2. Name it `resumes`
3. Set it to **Public** (candidates need public URLs to download their resumes)
4. Under bucket policies, add a policy that allows authenticated users to upload:
   ```sql
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'resumes');
   ```

### Get your API keys
- **SUPABASE_URL**: Settings → API → Project URL
- **SUPABASE_ANON_KEY**: Settings → API → `anon` public key *(frontend only)*
- **SUPABASE_SERVICE_ROLE_KEY**: Settings → API → `service_role` secret key *(backend only — never expose)*

---

## 2. Firebase Authentication

### Enable Email/Password sign-in
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Authentication** → **Sign-in method**
3. Enable **Email/Password**

### Get frontend config
1. Project Settings → General → scroll to **Your apps**
2. Click your Web app (or create one)
3. Copy the config object values into `artifacts/ats/.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

### Get service account JSON (for backend)
1. Project Settings → **Service accounts**
2. Click **Generate new private key** → **Generate key**
3. Download the JSON file
4. Minify it to a single line and set it as `FIREBASE_SERVICE_ACCOUNT_JSON` in the backend env

---

## 3. Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Copy the key → set as `GEMINI_API_KEY` in the backend env

---

## 4. n8n Automation (optional)

Two workflows are supported:

### Workflow 1 — Application Confirmation
- **Trigger**: Webhook (POST)
- **Actions**: Send confirmation email to candidate via Gmail/SendGrid/etc.
- Copy the webhook URL → set as `N8N_APPLICATION_WEBHOOK_URL`

**Payload received**:
```json
{
  "event": "application_created",
  "candidateName": "...",
  "candidateEmail": "...",
  "jobTitle": "...",
  "applicationId": "..."
}
```

### Workflow 2 — Interview Scheduling
- **Trigger**: Webhook (POST)
- **Actions**: Create Google Calendar event + send calendar invite email
- Copy the webhook URL → set as `N8N_INTERVIEW_WEBHOOK_URL`

**Payload received**:
```json
{
  "event": "interview_scheduled",
  "candidateName": "...",
  "candidateEmail": "...",
  "interviewerName": "...",
  "interviewerEmail": "...",
  "jobTitle": "...",
  "scheduledAt": "2025-01-15T10:00:00Z",
  "durationMinutes": 60,
  "meetingType": "video",
  "meetingLink": "https://meet.google.com/...",
  "notes": "..."
}
```

If `N8N_APPLICATION_WEBHOOK_URL` or `N8N_INTERVIEW_WEBHOOK_URL` are left blank, the app works normally without automation.

---

## 5. Environment Files Summary

| File | Purpose |
|------|---------|
| `artifacts/ats/.env` | Frontend Vite env vars (prefix with `VITE_`) |
| `artifacts/api-server/.env` | Backend Node.js env vars |

Copy each `.env.example` to `.env` and fill in your values:
```bash
cp artifacts/ats/.env.example artifacts/ats/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env
```
