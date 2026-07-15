---
name: ATS stack decisions
description: Key constraints and gotchas for the ATS project (Firebase Auth, Supabase, Gemini, Vite monorepo)
---

## Rule
Never use sub-path imports from workspace packages (e.g. `@workspace/api-client-react/custom-fetch`). Vite's dep-scan fails on sub-paths not listed in the package's `exports` map. Always re-export everything from the main `"."` index.

**Why:** Design subagent (and any future code-gen) tends to import from sub-paths. The api-client-react package only exports `"."`. Sub-path imports that aren't declared cause a hard Vite build error.

**How to apply:** If you see a `Missing "./<sub-path>" specifier in "@workspace/..."` error, fix the import in the consuming file to use the main package — don't add new exports to the package unless it's a deliberate API decision.

## Auth pattern
- Frontend: Firebase SDK → get `idToken` → attach as `Authorization: Bearer <token>`
- Backend: `firebase-admin` (v14+) — use `import { getAuth } from "firebase-admin/auth"` NOT `import admin from "firebase-admin"` (old default import pattern breaks TS)
- Supabase: backend uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS); frontend uses `VITE_SUPABASE_ANON_KEY` for Storage uploads only

## Vite env vars
Vite only exposes `VITE_`-prefixed env vars to the browser. Firebase and Supabase frontend keys must be set with the `VITE_` prefix as separate Replit secrets, even if the same values exist without the prefix for the backend.
