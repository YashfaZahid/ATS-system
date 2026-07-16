import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load local .env before any other app modules read process.env.
 * Tries common locations so this works when started from the package dir
 * or the monorepo root (and after esbuild bundles into dist/).
 */
function tryLoad(envPath: string): boolean {
  if (!fs.existsSync(envPath)) return false;
  try {
    process.loadEnvFile(envPath);
    return true;
  } catch {
    return false;
  }
}

const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "artifacts/api-server/.env"),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
];

for (const candidate of candidates) {
  if (tryLoad(candidate)) break;
}
