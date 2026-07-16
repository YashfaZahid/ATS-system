-- ══════════════════════════════════════════════════════════════════════
-- Vector search setup — DEPRECATED: now included in supabase_schema.sql
-- Run this ONLY if your database was created before vector search was
-- merged into the main schema.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add the embedding column to candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS resume_embedding vector(384);

-- 3. IVFFlat index for cosine similarity search (fast approximate NN)
--    Requires at least one row with an embedding before it can be built.
--    Re-run this after you have uploaded at least one resume.
CREATE INDEX IF NOT EXISTS idx_candidates_resume_embedding
  ON candidates
  USING ivfflat (resume_embedding vector_cosine_ops)
  WITH (lists = 10);

-- 4. Semantic search RPC used by POST /api/candidates/search
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
