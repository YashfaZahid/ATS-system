import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface SemanticSearchInput {
  query: string;
  threshold?: number;
  limit?: number;
}

export interface SemanticSearchCandidate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  yearsOfExperience?: number | null;
  skills: string[];
  similarity: number;
}

export interface SemanticSearchResult {
  candidates: SemanticSearchCandidate[];
  total: number;
}

export async function semanticSearchCandidates(
  input: SemanticSearchInput
): Promise<SemanticSearchResult> {
  return customFetch<SemanticSearchResult>("/api/candidates/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function useSemanticSearchCandidates() {
  return useMutation({
    mutationKey: ["semanticSearchCandidates"],
    mutationFn: semanticSearchCandidates,
  });
}

export interface BackfillEmbeddingsInput {
  limit?: number;
}

export interface BackfillEmbeddingsResult {
  processed: number;
  updated: number;
  failures: string[];
  success: boolean;
}

export async function backfillCandidateEmbeddings(
  input: BackfillEmbeddingsInput = {}
): Promise<BackfillEmbeddingsResult> {
  return customFetch<BackfillEmbeddingsResult>("/api/candidates/backfill-embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function useBackfillCandidateEmbeddings() {
  return useMutation({
    mutationKey: ["backfillCandidateEmbeddings"],
    mutationFn: backfillCandidateEmbeddings,
  });
}
