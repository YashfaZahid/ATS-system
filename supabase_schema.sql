-- ============================================================
-- ATS (Applicant Tracking System) — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('candidate', 'admin');

CREATE TYPE job_type AS ENUM (
  'full_time', 'part_time', 'contract', 'internship'
);

CREATE TYPE job_status AS ENUM ('open', 'closed');

CREATE TYPE application_stage AS ENUM (
  'applied',
  'screening',
  'shortlisted',
  'technical_interview',
  'hr_interview',
  'offer',
  'hired',
  'rejected'
);

CREATE TYPE meeting_type AS ENUM ('video', 'phone', 'in_person');

CREATE TYPE interview_status AS ENUM (
  'scheduled', 'completed', 'cancelled', 'rescheduled'
);

CREATE TYPE interview_recommendation AS ENUM (
  'strong_hire', 'hire', 'no_hire', 'strong_no_hire'
);

-- ─────────────────────────────────────────────────────────────
-- AUTO-UPDATE TRIGGER
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  role         user_role NOT NULL DEFAULT 'candidate',
  avatar_url   TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- SKILLS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL UNIQUE,
  category TEXT
);

CREATE INDEX idx_skills_name ON skills (name);

-- ─────────────────────────────────────────────────────────────
-- CANDIDATES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  avatar_url          TEXT,
  headline            TEXT,
  summary             TEXT,
  location            TEXT,
  linkedin_url        TEXT,
  github_url          TEXT,
  portfolio_url       TEXT,
  resume_url          TEXT,
  resume_file_name    TEXT,
  parsed_resume       JSONB,
  years_of_experience INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_candidates_user_id ON candidates (user_id);
CREATE INDEX idx_candidates_email ON candidates (email);
CREATE INDEX idx_candidates_name ON candidates (name);

CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- CANDIDATE SKILLS (join table)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_skills (
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  skill_id     UUID NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE INDEX idx_candidate_skills_skill_id ON candidate_skills (skill_id);

-- ─────────────────────────────────────────────────────────────
-- JOBS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  department        TEXT NOT NULL,
  location          TEXT NOT NULL,
  type              job_type NOT NULL,
  status            job_status NOT NULL DEFAULT 'open',
  description       TEXT NOT NULL,
  requirements      TEXT NOT NULL,
  responsibilities  TEXT NOT NULL,
  salary_min        INT,
  salary_max        INT,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_department ON jobs (department);
CREATE INDEX idx_jobs_type ON jobs (type);
CREATE INDEX idx_jobs_created_at ON jobs (created_at DESC);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- JOB SKILLS (join table)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_skills (
  job_id   UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE INDEX idx_job_skills_skill_id ON job_skills (skill_id);

-- ─────────────────────────────────────────────────────────────
-- APPLICATIONS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  stage        application_stage NOT NULL DEFAULT 'applied',
  cover_letter TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_application UNIQUE (job_id, candidate_id)
);

CREATE INDEX idx_applications_job_id ON applications (job_id);
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
CREATE INDEX idx_applications_stage ON applications (stage);
CREATE INDEX idx_applications_created_at ON applications (created_at DESC);

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- APPLICATION STAGE HISTORY
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS application_stage_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  previous_stage application_stage,
  new_stage      application_stage NOT NULL,
  changed_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  comment        TEXT,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_stage_history_application_id ON application_stage_history (application_id);
CREATE INDEX idx_app_stage_history_changed_at ON application_stage_history (changed_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RESUME ANALYSES (Gemini AI output)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resume_analyses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL UNIQUE REFERENCES applications (id) ON DELETE CASCADE,
  match_score           INT NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  matching_skills       TEXT[] NOT NULL DEFAULT '{}',
  missing_skills        TEXT[] NOT NULL DEFAULT '{}',
  experience_comparison TEXT,
  strengths             TEXT[] NOT NULL DEFAULT '{}',
  weaknesses            TEXT[] NOT NULL DEFAULT '{}',
  recruiter_summary     TEXT,
  hiring_recommendation TEXT,
  summary               TEXT NOT NULL DEFAULT '',
  improvement_suggestions TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resume_analyses_application_id ON resume_analyses (application_id);

-- ─────────────────────────────────────────────────────────────
-- RECRUITER NOTES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruiter_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  author_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  author_name    TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruiter_notes_application_id ON recruiter_notes (application_id);

-- ─────────────────────────────────────────────────────────────
-- INTERVIEWS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  candidate_id      UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  job_id            UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  interviewer_name  TEXT NOT NULL,
  interviewer_email TEXT NOT NULL,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INT NOT NULL DEFAULT 60,
  meeting_type      meeting_type NOT NULL,
  meeting_link      TEXT,
  notes             TEXT,
  status            interview_status NOT NULL DEFAULT 'scheduled',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interviews_application_id ON interviews (application_id);
CREATE INDEX idx_interviews_candidate_id ON interviews (candidate_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews (scheduled_at);
CREATE INDEX idx_interviews_status ON interviews (status);

CREATE TRIGGER trg_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- INTERVIEW FEEDBACK
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interview_feedback (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id            UUID NOT NULL UNIQUE REFERENCES interviews (id) ON DELETE CASCADE,
  technical_rating        INT NOT NULL CHECK (technical_rating BETWEEN 1 AND 5),
  communication_rating    INT NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  problem_solving_rating  INT NOT NULL CHECK (problem_solving_rating BETWEEN 1 AND 5),
  culture_fit_rating      INT NOT NULL CHECK (culture_fit_rating BETWEEN 1 AND 5),
  overall_rating          INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  comments                TEXT NOT NULL,
  recommendation          interview_recommendation NOT NULL,
  submitted_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_feedback_interview_id ON interview_feedback (interview_id);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- ACTIVITY LOGS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  user_name   TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (optional — backend uses service role key)
-- The backend uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- Enable RLS and add policies here if you ever expose Supabase
-- directly to the frontend (not recommended for this app).
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- VECTOR SEARCH (pgvector) — semantic resume matching
-- Requires pgvector extension (enabled on Supabase by default)
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS resume_embedding vector(384);

-- IVFFlat index for cosine similarity search.
-- Re-run after uploading at least one resume if index creation warns.
CREATE INDEX IF NOT EXISTS idx_candidates_resume_embedding
  ON candidates
  USING ivfflat (resume_embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE OR REPLACE FUNCTION match_resumes(
  query_embedding vector(384),
  match_threshold  float8,
  match_count      int
)
RETURNS TABLE (
  id                  uuid,
  user_id             uuid,
  name                text,
  email               text,
  phone               text,
  avatar_url          text,
  headline            text,
  summary             text,
  location            text,
  linkedin_url        text,
  github_url          text,
  portfolio_url       text,
  resume_url          text,
  resume_file_name    text,
  years_of_experience int,
  similarity          float8
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.email,
    c.phone,
    c.avatar_url,
    c.headline,
    c.summary,
    c.location,
    c.linkedin_url,
    c.github_url,
    c.portfolio_url,
    c.resume_url,
    c.resume_file_name,
    c.years_of_experience,
    (1 - (c.resume_embedding <=> query_embedding))::float8 AS similarity
  FROM candidates c
  WHERE c.resume_embedding IS NOT NULL
    AND (1 - (c.resume_embedding <=> query_embedding)) > match_threshold
  ORDER BY c.resume_embedding <=> query_embedding
  LIMIT match_count;
$$;
