---
date: 2026-09-11T14:21:59.2231091+02:00
researcher: Codex
git_commit: 26f82371285a77024903552798e89fb89e989235
branch: main
repository: family-shelf
topic: "Critical access and catalog smoke rollout research"
tags: [research, testing, profile-session, catalog, smoke]
status: complete
last_updated: 2026-09-11
last_updated_by: Codex
---

# Research: Critical access and catalog smoke rollout

**Date**: 2026-09-11T14:21:59.2231091+02:00  
**Researcher**: Codex  
**Git Commit**: 26f82371285a77024903552798e89fb89e989235  
**Branch**: main  
**Repository**: family-shelf

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md`: verify Risk #1 "Production family/admin login breaks" and Risk #2 "Family user enters the app but cannot view the item catalog." Identify real failure paths, existing checks, cheapest useful test layer, and any corrections to the test-plan response guidance.

## Summary

Risk #1 is real and high priority. Family and admin login both depend on server-only environment variables read at request time: `FAMILY_SHELF_FAMILY_PASSWORD` and `FAMILY_SHELF_ADMIN_PASSWORD`. If either is missing, the corresponding API returns a readable `503`, but existing automated checks do not exercise those API routes. The production incident where Vercel lacked these env vars is not protected by `check:profiles`, because that script validates static profile shape, not deployed runtime config.

Risk #2 is also real. `/items` is a server-rendered route that calls `listCatalogItems()` or `searchCatalogItems()` before rendering. Those functions read from Neon through `getSqlClient()`, which throws if `DATABASE_URL`/`POSTGRES_URL` is absent. Existing `check:catalog` verifies the database contract directly and is valuable, but it does not prove that a valid family session can enter the app and load `/items` through the deployed application.

The cheapest useful Phase 1 protection is a small runtime smoke layer, not a full browser suite yet:

- contract-smoke the `profile-session` and `admin-session` endpoints with configured env values;
- smoke `/items` with a real deployed or local server and assert a successful response containing the catalog shell/non-empty item signal;
- keep `check:profiles`, `check:catalog`, `build`, and `lint` as baseline gates.

The test-plan guidance is valid. Correction: Risk #2 should not require proving the client-side profile gate in this phase; the cheapest signal is deployed/server smoke for catalog readability. Full login-to-items browser coverage belongs in Phase 4.

## Detailed Findings

### Risk #1: profile/admin login failure path

Family login flows through `POST /api/profile-session`. The route parses JSON, requires a valid profile id, resolves the profile, then checks family profiles against `getFamilyPasswordConfig()` ([src/app/api/profile-session/route.ts:16](C:/10xDEVS/family-shelf/src/app/api/profile-session/route.ts:16), [src/app/api/profile-session/route.ts:35](C:/10xDEVS/family-shelf/src/app/api/profile-session/route.ts:35)). Missing config returns `503` with `"Family password is not configured."` ([src/app/api/profile-session/route.ts:38](C:/10xDEVS/family-shelf/src/app/api/profile-session/route.ts:38)). Wrong password returns `401` ([src/app/api/profile-session/route.ts:60](C:/10xDEVS/family-shelf/src/app/api/profile-session/route.ts:60)). Valid credentials return non-secret profile metadata and a signed session token ([src/app/api/profile-session/route.ts:68](C:/10xDEVS/family-shelf/src/app/api/profile-session/route.ts:68)).

Admin unlock flows through `POST /api/admin-session`. It reads `getAdminPasswordConfig()`, returns `503` when missing, verifies existing admin tokens, rejects wrong passwords with `401`, and creates a signed admin token on success ([src/app/api/admin-session/route.ts:20](C:/10xDEVS/family-shelf/src/app/api/admin-session/route.ts:20), [src/app/api/admin-session/route.ts:22](C:/10xDEVS/family-shelf/src/app/api/admin-session/route.ts:22), [src/app/api/admin-session/route.ts:40](C:/10xDEVS/family-shelf/src/app/api/admin-session/route.ts:40), [src/app/api/admin-session/route.ts:47](C:/10xDEVS/family-shelf/src/app/api/admin-session/route.ts:47)).

Both password configs come from `src/lib/profileConfig.ts`: `FAMILY_PASSWORD_ENV_VAR = "FAMILY_SHELF_FAMILY_PASSWORD"` and `ADMIN_PASSWORD_ENV_VAR = "FAMILY_SHELF_ADMIN_PASSWORD"` ([src/lib/profileConfig.ts:1](C:/10xDEVS/family-shelf/src/lib/profileConfig.ts:1), [src/lib/profileConfig.ts:4](C:/10xDEVS/family-shelf/src/lib/profileConfig.ts:4), [src/lib/profileConfig.ts:12](C:/10xDEVS/family-shelf/src/lib/profileConfig.ts:12)). This matches the production incident: local `.env.local` can pass while Vercel env vars are absent until added and redeployed.

The client profile gate persists only profile metadata and session token in localStorage under `family-shelf:selected-profile` ([src/components/ProfileGate.tsx:28](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:28)). On hydration, stored family sessions are revalidated by posting `profileId` and `sessionToken` to `/api/profile-session`; failed validation clears localStorage ([src/components/ProfileGate.tsx:59](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:59), [src/components/ProfileGate.tsx:71](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:71), [src/components/ProfileGate.tsx:83](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:83), [src/components/ProfileGate.tsx:87](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:87)). Initial family login posts the entered password to the same API and stores the returned payload, not the raw password ([src/components/ProfileGate.tsx:109](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:109), [src/components/ProfileGate.tsx:115](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:115), [src/components/ProfileGate.tsx:132](C:/10xDEVS/family-shelf/src/components/ProfileGate.tsx:132)).

### Risk #2: item catalog visibility failure path

`/items` is server-rendered. It reads `searchParams`, trims `q`, then calls either `searchCatalogItems(normalizedQuery)` or `listCatalogItems()` before returning markup ([src/app/items/page.tsx:20](C:/10xDEVS/family-shelf/src/app/items/page.tsx:20), [src/app/items/page.tsx:24](C:/10xDEVS/family-shelf/src/app/items/page.tsx:24)). If items exist, the page renders item title, kind, note/borrower/date, status, update form, and delete form ([src/app/items/page.tsx:44](C:/10xDEVS/family-shelf/src/app/items/page.tsx:44), [src/app/items/page.tsx:51](C:/10xDEVS/family-shelf/src/app/items/page.tsx:51), [src/app/items/page.tsx:65](C:/10xDEVS/family-shelf/src/app/items/page.tsx:65), [src/app/items/page.tsx:69](C:/10xDEVS/family-shelf/src/app/items/page.tsx:69)).

The catalog repository reads from Postgres/Neon. `listCatalogItems()` obtains the SQL client, selects rows from `catalog_items`, and maps rows to `CatalogItem` ([src/lib/catalog.ts:99](C:/10xDEVS/family-shelf/src/lib/catalog.ts:99), [src/lib/catalog.ts:101](C:/10xDEVS/family-shelf/src/lib/catalog.ts:101), [src/lib/catalog.ts:107](C:/10xDEVS/family-shelf/src/lib/catalog.ts:107)). `searchCatalogItems()` delegates to `listCatalogItems()` and filters in application code ([src/lib/catalog.ts:122](C:/10xDEVS/family-shelf/src/lib/catalog.ts:122), [src/lib/catalog.ts:129](C:/10xDEVS/family-shelf/src/lib/catalog.ts:129)). `getSqlClient()` uses `DATABASE_URL` or `POSTGRES_URL`; missing config throws an error ([src/lib/database.ts:7](C:/10xDEVS/family-shelf/src/lib/database.ts:7), [src/lib/database.ts:10](C:/10xDEVS/family-shelf/src/lib/database.ts:10)).

Because the profile gate is client-side and wraps all routes, a direct HTTP smoke of `/items` verifies server catalog rendering but not the full browser-localStorage path. That is acceptable for Phase 1 if paired with session endpoint smoke; a true browser e2e that selects a profile and navigates to `/items` is more expensive and belongs in Phase 4.

### Existing checks and their gaps

`check:profiles` validates the static profile contract: five profiles, four family, one guest, unique ids, capabilities, and no `admin:delete` profile capability ([scripts/check-profiles.mjs:31](C:/10xDEVS/family-shelf/scripts/check-profiles.mjs:31), [scripts/check-profiles.mjs:42](C:/10xDEVS/family-shelf/scripts/check-profiles.mjs:42), [scripts/check-profiles.mjs:54](C:/10xDEVS/family-shelf/scripts/check-profiles.mjs:54), [scripts/check-profiles.mjs:57](C:/10xDEVS/family-shelf/scripts/check-profiles.mjs:57)). It does not verify env-backed profile/admin session API behavior.

`check:catalog` loads `.env.local` when present, applies the schema, seeds stable rows, and validates read/search/create/update/delete behavior directly against the database ([scripts/check-catalog.mjs:9](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:9), [scripts/check-catalog.mjs:121](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:121), [scripts/check-catalog.mjs:123](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:123), [scripts/check-catalog.mjs:157](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:157), [scripts/check-catalog.mjs:187](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:187), [scripts/check-catalog.mjs:239](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:239), [scripts/check-catalog.mjs:300](C:/10xDEVS/family-shelf/scripts/check-catalog.mjs:300)). This is a strong database contract check, but it bypasses the deployed `/items` route and does not detect an App Router rendering failure or missing production env on Vercel unless run in that target environment.

`package.json` currently exposes `dev`, `build`, `check:catalog`, `check:profiles`, `start`, and `lint`; there is no Vitest/Jest/Playwright runner yet ([package.json](C:/10xDEVS/family-shelf/package.json)). File discovery found no `*.test.*`, `*.spec.*`, or test-runner config beyond the new `context/foundation/test-plan.md`.

Deployment docs already name the missing pieces: required env vars are `DATABASE_URL`/`POSTGRES_URL`, `FAMILY_SHELF_FAMILY_PASSWORD`, and `FAMILY_SHELF_ADMIN_PASSWORD` ([docs/deployment.md:7](C:/10xDEVS/family-shelf/docs/deployment.md:7)). The verification checklist currently includes manual confirmation of env vars and manual admin unlock/delete verification, but no automated production smoke command ([docs/deployment.md:24](C:/10xDEVS/family-shelf/docs/deployment.md:24), [docs/deployment.md:28](C:/10xDEVS/family-shelf/docs/deployment.md:28), [docs/deployment.md:36](C:/10xDEVS/family-shelf/docs/deployment.md:36)).

### Authorization context relevant to Phase 1 planning

The add/update/delete routes use `verifyProfileCapability()` for server-side enforcement. It rejects missing profile id, unknown profile, profiles lacking capability, missing family password config, and invalid session token ([src/lib/profileAuthorization.ts:26](C:/10xDEVS/family-shelf/src/lib/profileAuthorization.ts:26), [src/lib/profileAuthorization.ts:30](C:/10xDEVS/family-shelf/src/lib/profileAuthorization.ts:30), [src/lib/profileAuthorization.ts:40](C:/10xDEVS/family-shelf/src/lib/profileAuthorization.ts:40), [src/lib/profileAuthorization.ts:48](C:/10xDEVS/family-shelf/src/lib/profileAuthorization.ts:48), [src/lib/profileAuthorization.ts:58](C:/10xDEVS/family-shelf/src/lib/profileAuthorization.ts:58)). This means future tests must not rely only on hidden UI controls. For Phase 1, this mainly supports endpoint-level session smoke; Phase 3 should cover negative authorization behavior in depth.

The delete route also verifies an admin token after catalog-write profile authorization, and returns a readable `503` if the admin password config is missing ([src/app/api/catalog-items/[id]/route.ts:92](C:/10xDEVS/family-shelf/src/app/api/catalog-items/[id]/route.ts:92), [src/app/api/catalog-items/[id]/route.ts:101](C:/10xDEVS/family-shelf/src/app/api/catalog-items/[id]/route.ts:101), [src/app/api/catalog-items/[id]/route.ts:110](C:/10xDEVS/family-shelf/src/app/api/catalog-items/[id]/route.ts:110)). Phase 1 does not need destructive delete smoke; it only needs admin unlock smoke.

## Code References

- `src/app/api/profile-session/route.ts:35` - Family profiles require env-backed password/session verification.
- `src/app/api/profile-session/route.ts:38` - Missing family password config returns `503`.
- `src/app/api/profile-session/route.ts:60` - Wrong family password returns `401`.
- `src/app/api/admin-session/route.ts:20` - Admin session reads the admin password config.
- `src/app/api/admin-session/route.ts:22` - Missing admin password config returns `503`.
- `src/lib/profileConfig.ts:1` - Family/admin password env var names.
- `src/components/ProfileGate.tsx:59` - Client revalidates stored family sessions after hydration.
- `src/components/ProfileGate.tsx:115` - Client submits family password to `/api/profile-session`.
- `src/app/items/page.tsx:24` - `/items` chooses search/list data path.
- `src/lib/catalog.ts:99` - Catalog list reads from SQL client and `catalog_items`.
- `src/lib/database.ts:7` - Database env fallback is `DATABASE_URL` then `POSTGRES_URL`.
- `scripts/check-catalog.mjs:121` - Catalog check loads env, schema, and DB client.
- `scripts/check-profiles.mjs:31` - Profile check verifies static profile count/shape.
- `docs/deployment.md:7` - Deployment docs list required env vars.

## Architecture Insights

- The app is intentionally auth-light. There is no server-side login session database; profile state is stored in browser localStorage and server-validated through signed HMAC tokens.
- Runtime config is the main production-only risk. Local `.env.local` can make every local check pass while Vercel production lacks `FAMILY_SHELF_FAMILY_PASSWORD` or `FAMILY_SHELF_ADMIN_PASSWORD`.
- The catalog display path is server-rendered and database-dependent. A direct route smoke gives useful signal even before browser e2e exists.
- Current checks are script-based contracts, not a test runner. Phase 1 should likely extend this pattern with a smoke script rather than introduce a full runner prematurely.

## Historical Context

- `context/changes/shared-entry-profile-selection/plan.md` established the auth-light profile gate: family profiles use one shared password, guest is read/search-only, no full login system.
- `context/changes/add-catalog-item/plan.md` moved catalog behavior toward durable Postgres/Neon storage and documented database env as a verification prerequisite.
- `context/changes/admin-delete-item/plan.md` added the separate admin password/token boundary and required final manual admin unlock/delete verification.
- `docs/deployment.md` records the current deployment contract and manual verification checklist, but not an automated smoke command.

## Related Research

No prior `research.md` artifact was found for this rollout phase.

## Open Questions

- Should Phase 1 smoke target production (`https://family-shelf-gamma.vercel.app`) by default, or accept a `FAMILY_SHELF_SMOKE_BASE_URL` so local/preview/prod can share the same script?
- Should the smoke script read local passwords from `.env.local` for local runs and require injected env vars in CI/deploy runs, matching `check:catalog`?
- Should `/items` smoke assert seeded titles such as `Dune`/`Catan`, or only assert the item count/cell text after ensuring seed rows exist through `check:catalog`?
