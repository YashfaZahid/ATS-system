# ATS — Applicant Tracking System

A complete, production-ready Applicant Tracking System for small and medium-sized companies. Built with React + Vite (frontend), Express (backend), Firebase Auth, Supabase PostgreSQL/Storage, and Gemini AI resume matching.

## Features

- **Candidate Portal**: Browse jobs, apply, track status, view AI analysis, manage profile & resume
- **Admin Dashboard**: Full hiring pipeline, candidate management, interview scheduling, analytics
- **AI-Powered**: Gemini analyzes resumes against job requirements — match score, strengths, gaps, recommendation
- **Interview Management**: Schedule, feedback forms, calendar integration via n8n
- **Automation**: n8n webhooks for confirmation emails and Google Calendar events

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript |
| Auth | Firebase Authentication |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| AI | Google Gemini 1.5 Flash |
| Automation | n8n (optional) |

## Setup

### Prerequisites
- Node.js 18+, pnpm 8+
- Firebase project (Auth enabled)
- Supabase project
- Gemini API key

### 1. Database
Run `supabase_schema.sql` in Supabase SQL Editor. See [database_setup.md](database_setup.md) for full instructions.

### 2. Environment variables

```bash
cp artifacts/ats/.env.example artifacts/ats/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Fill in values from your Firebase Console, Supabase Dashboard, and Google AI Studio. See [database_setup.md](database_setup.md).

### 3. Install & run

Requires **Node.js 20+** and **pnpm 9+** (works on Windows, macOS, and Linux).

```bash
pnpm install

# Terminal 1 — API server (http://localhost:3001)
pnpm run dev:api

# Terminal 2 — Frontend (http://localhost:5173, proxies /api → API)
pnpm run dev:web

# Or both at once:
pnpm run dev:all
```

**Important credentials**
- Backend `FIREBASE_SERVICE_ACCOUNT_JSON` must be a **service account** JSON (`type: "service_account"` with `private_key`). The web/client Firebase config belongs only in `artifacts/ats/.env` as `VITE_FIREBASE_*`.
- Frontend `VITE_SUPABASE_ANON_KEY` is required for resume uploads (anon/public key from Supabase → Settings → API).

### 4. First admin user
The first admin cannot be created via the UI (admin accounts are admin-only). Create it directly in Supabase:

```sql
-- After running supabase_schema.sql, insert your first admin
-- First create the user through Firebase Auth manually, then:
INSERT INTO users (firebase_uid, email, name, role)
VALUES ('firebase-uid-here', 'admin@yourcompany.com', 'Admin Name', 'admin');
```

Or use the Supabase dashboard to insert the row directly.

## Roles

| Role | Access |
|------|--------|
| `candidate` | Sign up publicly. Can browse jobs, apply, track applications, manage profile |
| `admin` | Created by existing admin. Full access to all hiring operations |

## Hiring Pipeline

```
Applied → Screening → Shortlisted → Technical Interview → HR Interview → Offer → Hired
                                                                               ↘ Rejected
```

Every stage transition is logged with timestamp, who changed it, and optional comments.

## Project Structure

```
artifacts/
  ats/              Frontend React app
  api-server/       Express API server
lib/
  api-spec/         OpenAPI spec (source of truth)
  api-client-react/ Generated React Query hooks
  api-zod/          Generated Zod schemas
  db/               (unused — using Supabase directly)
supabase_schema.sql Complete DB schema
database_setup.md   Service configuration guide
```
