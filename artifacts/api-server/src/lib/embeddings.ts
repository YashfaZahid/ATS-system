import path from "node:path";
import { pipeline, env } from "@xenova/transformers";

const MAX_EMBED_CHARS = 2000;

// Persist downloaded model files across restarts (works on Windows, Linux, macOS)
env.cacheDir =
  process.env["MODEL_CACHE_DIR"] ??
  path.join(process.cwd(), ".model-cache");
env.allowLocalModels = true;
env.allowRemoteModels = true;

// Silence progress bars in server logs
env.backends.onnx.logLevel = "error";

type Extractor = (
  text: string,
  opts: { pooling: "mean" | "cls"; normalize: boolean }
) => Promise<{ data: Float32Array }>;

let _extractor: Extractor | null = null;
let _warmupPromise: Promise<void> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!_extractor) {
    _extractor = (await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )) as unknown as Extractor;
  }
  return _extractor;
}

/**
 * Preload the embedding model so the first resume upload / search is fast.
 * Safe to call multiple times — only downloads once.
 */
export function warmupEmbeddingModel(): Promise<void> {
  if (!_warmupPromise) {
    _warmupPromise = getEmbedding("warmup").then(() => undefined);
  }
  return _warmupPromise;
}

/**
 * Generate a 384-dimensional normalised embedding for the given text.
 * First call downloads ~25 MB of model weights (cached afterwards).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text.slice(0, MAX_EMBED_CHARS), {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Flatten a Gemini-parsed resume JSON into a plain text blob
 * suitable for generating an embedding.
 */
export function resumeToText(parsed: Record<string, unknown>): string {
  const parts: string[] = [];

  const str = (v: unknown) => (typeof v === "string" ? v : null);

  if (str(parsed["name"])) parts.push(str(parsed["name"])!);
  if (str(parsed["headline"])) parts.push(str(parsed["headline"])!);
  if (str(parsed["summary"])) parts.push(str(parsed["summary"])!);

  const skills = parsed["skills"];
  if (Array.isArray(skills)) parts.push((skills as string[]).join(", "));

  const experience = parsed["experience"];
  if (Array.isArray(experience)) {
    for (const exp of experience as Record<string, string>[]) {
      const line = [exp["title"], exp["company"], exp["description"]]
        .filter(Boolean)
        .join(" — ");
      if (line) parts.push(line);
    }
  }

  const education = parsed["education"];
  if (Array.isArray(education)) {
    for (const edu of education as Record<string, string>[]) {
      const line = [edu["degree"], edu["institution"]].filter(Boolean).join(" at ");
      if (line) parts.push(line);
    }
  }

  const certs = parsed["certifications"];
  if (Array.isArray(certs)) parts.push((certs as string[]).join(", "));

  const companies = parsed["companies"];
  if (Array.isArray(companies)) parts.push((companies as string[]).join(", "));

  const projects = parsed["projects"];
  if (Array.isArray(projects)) {
    for (const proj of projects as Record<string, string>[]) {
      const line = [proj["name"], proj["description"]].filter(Boolean).join(" — ");
      if (line) parts.push(line);
    }
  }

  return parts.join("\n").slice(0, MAX_EMBED_CHARS);
}
