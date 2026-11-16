# ATS

An applicant tracking system for a small hiring team. Candidates browse roles and apply. Recruiters run the pipeline, schedule interviews, and read an AI pass over each resume.

## What it does

- **Candidate portal.** Jobs, applications, status, profile, and resume upload.
- **Recruiter workspace.** Pipeline stages, candidate records, interview scheduling, notes, and activity history.
- **Resume analysis.** Gemini compares a resume to the job and returns a match score, strengths, gaps, and a recommendation.
- **Semantic search.** A local embedding model (384 dimensions) runs on the API server. Vectors are stored on `candidates.resume_embedding` and searched with pgvector. No extra embedding API key.
- **Interviews.** Schedule, feedback, and optional n8n hooks for email and calendar.

Every stage change is logged with who moved it and when.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, Tailwind |
| API | Node.js, Express 5, TypeScript |
| Auth | Firebase Authentication |
| Data | Supabase Postgres and Storage |
| Vectors | pgvector, local 384-d embeddings |
| Analysis | Gemini |
| Automation | n8n, optional |

## Run

Node.js 20+ and pnpm 9+.

```bash
pnpm install
```

1. Run `supabase_schema.sql` in the Supabase SQL editor. Details are in [database_setup.md](database_setup.md). If the database predates vector search, run `vector_search_setup.sql` as well.
2. Copy the env examples and fill them from Firebase, Supabase, and Google AI Studio.

```bash
cp artifacts/ats/.env.example artifacts/ats/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

3. Start both apps.

```bash
pnpm run dev:api    # http://localhost:3001
pnpm run dev:web    # http://localhost:5173
pnpm run dev:all    # both
```

`FIREBASE_SERVICE_ACCOUNT_JSON` on the API must be a service-account JSON (`type: "service_account"` and a private key). The web Firebase config belongs only in `artifacts/ats/.env` as `VITE_FIREBASE_*`. Resume uploads need `VITE_SUPABASE_ANON_KEY`.

The first admin cannot be created from the UI. Insert that user in Supabase after the schema is applied. The SQL snippet is in [database_setup.md](database_setup.md).

Backfill embeddings for resumes uploaded before vector search existed:

```http
POST /api/candidates/backfill-embeddings
```

Admin only. The model caches under `.model-cache/`.

## Layout

```text
artifacts/ats/          React app
artifacts/api-server/   Express API, Gemini client, embeddings
lib/api-spec/           OpenAPI source
lib/api-client-react/   Generated React Query hooks
lib/api-zod/            Generated Zod schemas
supabase_schema.sql
database_setup.md
```

## Limits

The match score is a model judgment against the job text you stored. It is not a hiring decision. Embedding search finds similar resumes. It does not rank who should be hired.
