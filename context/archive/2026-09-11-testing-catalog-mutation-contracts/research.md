---
date: 2026-09-11T21:20:17.4975184+02:00
researcher: Codex
git_commit: 861da25b4a411d1ba46ac48e4326f3f4a202146a
branch: main
repository: family-shelf
topic: "Rollout Phase 2: catalog mutation contracts"
tags: [research, codebase, catalog, mutation-contracts, api, database]
status: complete
last_updated: 2026-09-11
last_updated_by: Codex
---

# Research: Rollout Phase 2 - Catalog Mutation Contracts

**Date**: 2026-09-11T21:20:17.4975184+02:00  
**Researcher**: Codex  
**Git Commit**: 861da25b4a411d1ba46ac48e4326f3f4a202146a  
**Branch**: main  
**Repository**: family-shelf

## Research Question

Ground rollout Phase 2 of `context/foundation/test-plan.md`: verify risks #3, #5, and #6 for catalog list/search/status update, durable add/update/delete mutations, and admin delete safety. Confirm or correct the planned response guidance, locate existing checks, identify the cheapest useful test layer, and flag speculative or misleading hot-spot evidence.

## Summary

The catalog mutation risk is real, but the cheapest next layer is not a broad browser/e2e suite. The project already has a database-level `npm.cmd run check:catalog` script that seeds stable rows and directly verifies SQL read/search/create/update/delete behavior with contract-owned rows. That catches durable storage regressions but does not prove the production mutation boundaries work through validation, profile session authorization, admin token checks, route status codes, or API readback.

Recommended Phase 2 response: add endpoint-level contract coverage, likely by extending or splitting the existing Node contract script. The useful assertions are `POST /api/catalog-items`, `PATCH /api/catalog-items/[id]`, and `DELETE /api/catalog-items/[id]` with real family/admin session tokens, contract-owned rows, readback/search assertions, and cleanup. Keep this below full UI/e2e cost; reserve browser coverage for rollout Phase 4.

Guidance corrections:

- Risk #3 guidance is valid, but existing `check:catalog` partially covers search/readback only at SQL/script level. Endpoint-level update plus subsequent `/items` or repository readback would be stronger.
- Risk #5 guidance is valid; current SQL check protects durable row semantics but bypasses the app's route/validation/auth boundary.
- Risk #6 guidance is valid and important; current delete API correctly uses stable `id`, profile evidence, and admin token checks, but automated coverage for the route's negative cases is missing.
- Hot-spot evidence is directionally accurate. `src/lib/catalog.ts`, `src/lib/catalogValidation.ts`, `scripts/check-catalog.mjs`, and `src/app/api` are all involved, but `scripts/check-catalog.mjs` is existing coverage as well as risk surface.

## Detailed Findings

### Catalog Repository And Search

`src/lib/catalog.ts` is the durable data boundary. It maps Postgres rows to the public `CatalogItem` shape and lists items ordered by `created_at ASC, title ASC` ([src/lib/catalog.ts:77](../../../../src/lib/catalog.ts#L77), [src/lib/catalog.ts:99](../../../../src/lib/catalog.ts#L99)). Search is not SQL-backed; it loads the list and filters a normalized text projection containing title, kind labels, borrower, borrowed date, and note ([src/lib/catalog.ts:64](../../../../src/lib/catalog.ts#L64), [src/lib/catalog.ts:122](../../../../src/lib/catalog.ts#L122)).

Create, update, and delete mutate Postgres directly:

- Create requires `catalog:write`, trims title/note, generates an id from title plus random suffix, inserts the row, and returns the created row ([src/lib/catalog.ts:134](../../../../src/lib/catalog.ts#L134)).
- Update requires `catalog:write`, writes only status, borrower name, note, and `updated_at`, and returns `null` if no row matched ([src/lib/catalog.ts:171](../../../../src/lib/catalog.ts#L171)).
- Delete deletes by `input.id` and returns the deleted row or `null` ([src/lib/catalog.ts:196](../../../../src/lib/catalog.ts#L196)).

Implication for Risk #3: proving UI form state is insufficient is correct. The independent oracle should be readback/search after mutation. Existing repository behavior makes that cheap.

### Validation Contracts

`src/lib/catalogValidation.ts` keeps create/update/delete input validation explicit. Create requires non-empty title and enum kind/status, and limits note length ([src/lib/catalogValidation.ts:60](../../../../src/lib/catalogValidation.ts#L60)). Update requires non-empty id, enum status, note length, borrower name length, and normalizes empty nullable fields to `null` ([src/lib/catalogValidation.ts:106](../../../../src/lib/catalogValidation.ts#L106)). Delete only validates a non-empty id ([src/lib/catalogValidation.ts:152](../../../../src/lib/catalogValidation.ts#L152)).

Implication for Risk #5: route-level tests should assert readable 400s for invalid mutation inputs. A pure SQL check cannot catch regressions where validation accepts bad payloads or error payload shape drifts.

### API Mutation Boundaries

Create lives at `POST /api/catalog-items`. The route parses JSON, calls `verifyProfileCapability(body, "catalog:write")`, validates input, calls `createCatalogItem`, returns `{ item }` with status `201`, and translates DB errors to a generic 500 ([src/app/api/catalog-items/route.ts:16](../../../../src/app/api/catalog-items/route.ts#L16)).

Update and delete live in `src/app/api/catalog-items/[id]/route.ts`. Update parses the route id, verifies `catalog:write`, validates the merged route/body input, returns `404` for missing rows, and returns `{ item }` on success ([src/app/api/catalog-items/[id]/route.ts:32](../../../../src/app/api/catalog-items/%5Bid%5D/route.ts#L32)).

Delete verifies ordinary family write evidence first, then requires configured admin password, verifies `adminToken`, validates route id, deletes by id, and returns `404` when missing ([src/app/api/catalog-items/[id]/route.ts:79](../../../../src/app/api/catalog-items/%5Bid%5D/route.ts#L79)).

Implication for Risk #6: the implementation does not delete by title or card position; it deletes by stable route id. The missing automated signal is route behavior under valid and invalid evidence: no family evidence, guest evidence, no admin token, invalid admin token, missing id/not-found, and success cleanup.

### Authorization And Tokens

`verifyProfileCapability` rejects missing profile id with 400, unknown profile with 404, missing capability with 403, missing family password config with 503, and invalid/missing token with 401 ([src/lib/profileAuthorization.ts:26](../../../../src/lib/profileAuthorization.ts#L26)). Family profile tokens are HMAC-signed and bound to profile id ([src/lib/profileSession.ts:15](../../../../src/lib/profileSession.ts#L15), [src/lib/profileSession.ts:27](../../../../src/lib/profileSession.ts#L27)).

Admin tokens are separate HMAC-signed tokens scoped to `"admin"` ([src/lib/adminSession.ts:13](../../../../src/lib/adminSession.ts#L13), [src/lib/adminSession.ts:25](../../../../src/lib/adminSession.ts#L25)). `/api/admin-session` returns readable 400, 401, or 503 errors for missing password, wrong password, or missing config ([src/app/api/admin-session/route.ts:11](../../../../src/app/api/admin-session/route.ts#L11)).

Implication: endpoint-level tests can get tokens through public session endpoints, avoiding hard-coded secrets and implementation-mirrored token checks. Tests should treat tokens as opaque.

### UI Surfaces

`/items` server-renders either `searchCatalogItems` or `listCatalogItems`, then renders add, search, update, and delete controls in item cards ([src/app/items/page.tsx:20](../../../../src/app/items/page.tsx#L20), [src/app/items/page.tsx:44](../../../../src/app/items/page.tsx#L44)).

Client forms hide write controls when the active profile lacks `catalog:write`: add returns `null` for non-writers ([src/components/AddCatalogItemForm.tsx:27](../../../../src/components/AddCatalogItemForm.tsx#L27)), update does the same ([src/components/UpdateCatalogItemForm.tsx:29](../../../../src/components/UpdateCatalogItemForm.tsx#L29)), and delete additionally requires a verified admin token from local storage ([src/components/DeleteCatalogItemForm.tsx:27](../../../../src/components/DeleteCatalogItemForm.tsx#L27)).

Implication: UI hiding is useful but not sufficient for this phase. Phase 2 should not depend on DOM-only checks; server-side route contracts are cheaper and catch more of the relevant risk.

### Existing Check Coverage

`scripts/check-catalog.mjs` already:

- loads `.env.local` as local convenience and requires `DATABASE_URL` or `POSTGRES_URL` ([scripts/check-catalog.mjs:9](../../../../scripts/check-catalog.mjs#L9), [scripts/check-catalog.mjs:37](../../../../scripts/check-catalog.mjs#L37));
- applies schema and seeds Dune/Catan/Hades rows ([scripts/check-catalog.mjs:121](../../../../scripts/check-catalog.mjs#L121), [scripts/check-catalog.mjs:133](../../../../scripts/check-catalog.mjs#L133));
- verifies read/search on an in-script mirror of search semantics ([scripts/check-catalog.mjs:157](../../../../scripts/check-catalog.mjs#L157), [scripts/check-catalog.mjs:187](../../../../scripts/check-catalog.mjs#L187));
- creates duplicate-title contract rows and checks DB constraints ([scripts/check-catalog.mjs:196](../../../../scripts/check-catalog.mjs#L196));
- updates a contract-owned row and asserts persisted fields plus searchable borrower/note ([scripts/check-catalog.mjs:230](../../../../scripts/check-catalog.mjs#L230));
- deletes a contract-owned row and asserts it is gone ([scripts/check-catalog.mjs:291](../../../../scripts/check-catalog.mjs#L291)).

This is valuable but has two blind spots:

1. It bypasses route handlers, validation helpers, profile authorization, and admin token verification.
2. Its `searchItems` helper mirrors application search semantics in the script, so search assertions are partly implementation-mirrored rather than independent readback through the app boundary.

## Code References

- `src/lib/catalog.ts:99` - list reads from `catalog_items` and orders by creation/title.
- `src/lib/catalog.ts:122` - search loads list and filters normalized title/kind/borrower/date/note text.
- `src/lib/catalog.ts:134` - create requires write-capable profile and returns inserted row.
- `src/lib/catalog.ts:171` - update requires write-capable profile, mutates current state fields, returns `null` on missing id.
- `src/lib/catalog.ts:196` - delete removes by stable id and returns deleted row.
- `src/lib/catalogValidation.ts:60` - create validation.
- `src/lib/catalogValidation.ts:106` - update validation.
- `src/lib/catalogValidation.ts:152` - delete validation.
- `src/app/api/catalog-items/route.ts:16` - create endpoint.
- `src/app/api/catalog-items/[id]/route.ts:32` - update endpoint.
- `src/app/api/catalog-items/[id]/route.ts:79` - delete endpoint with profile + admin checks.
- `src/lib/profileAuthorization.ts:26` - reusable profile capability gate.
- `scripts/check-catalog.mjs:230` - existing direct SQL update contract.
- `scripts/check-catalog.mjs:291` - existing direct SQL delete contract.

## Architecture Insights

- Catalog read/write logic is split cleanly: repository functions own SQL, validation helpers own payload shape, API routes own authorization and HTTP status translation, and client forms own user interaction.
- The current lightweight testing style is Node scripts, not a dedicated test runner. Staying in Node scripts for Phase 2 gives high signal with low infrastructure cost.
- The most useful next test layer is route/contract level against a running Next server or a narrow route harness. It should exercise public endpoints with real tokens obtained from `/api/profile-session` and `/api/admin-session`, then assert durable database readback/search.
- Do not mutate seed rows for mutation tests. Continue the `contract-<run id>` pattern and cleanup in `finally`.
- Do not decode or manufacture HMAC token internals in assertions. Use endpoints to obtain valid tokens and treat returned tokens as opaque.

## Historical Context

- `context/changes/add-catalog-item/plan.md` selected Neon/Postgres and `check:catalog` as the lightweight write verification layer. It explicitly warned that server writes cannot trust client-only profile state.
- `context/changes/update-borrowing-state/plan.md` planned update coverage as contract-owned rows and manual server rejection checks. The current script now covers direct DB update semantics, but not endpoint negative cases.
- `context/changes/admin-delete-item/plan.md` planned delete verification in `check:catalog` and manual checks for missing family evidence, missing admin token, guest evidence, missing item 404, and intended-row deletion. Those manual checks are exactly the automation gap Phase 2 can close.
- `context/changes/testing-critical-access-catalog-smoke/research.md` established the pattern of production-facing smoke for login/catalog viewing; Phase 2 should remain lower-level and deterministic, focused on mutation contracts.

## Existing Checks

- `npm.cmd run check:catalog`: database schema, seed rows, direct SQL list/search/create/update/delete contracts.
- `npm.cmd run check:profiles`: static profile/capability contract.
- `npm.cmd run check:smoke`: production family/admin session endpoints and `/items` read smoke.
- `npm.cmd run build`: Next/TypeScript build boundary.
- `npm.cmd run lint`: ESLint.

There is no Vitest/Jest/Playwright test runner yet in `package.json`. Adding one is possible, but not the cheapest Phase 2 signal unless route handlers are too awkward to exercise from a script.

## Recommended Cheapest Useful Test Layer

Add a catalog mutation endpoint contract command, either by extending `scripts/check-catalog.mjs` carefully or by adding a new script such as `scripts/check-catalog-api.mjs` and package script `check:catalog-api`.

Minimum useful assertions:

1. Obtain a family profile session through `/api/profile-session` using env-backed credentials; never hard-code or print secrets.
2. Obtain an admin token through `/api/admin-session` for delete; treat the token as opaque.
3. Create a contract-owned item through `POST /api/catalog-items`; assert `201`, returned id/title/kind/status/note, duplicate title behavior if included, and readback/search visibility.
4. Update that contract-owned item through `PATCH /api/catalog-items/[id]`; assert `200`, id/title/kind stability, persisted status/borrower/note, nullable clearing, and subsequent search/readback.
5. Delete by id through `DELETE /api/catalog-items/[id]`; assert `200`, returned deleted id/title, subsequent readback absence, and no seed row count/title impact.
6. Negative cases: guest or missing profile evidence rejects create/update/delete, invalid update status returns readable 400, missing update/delete id returns 404 or validation error as appropriate, delete without admin token returns 401, and delete of missing id returns 404.

Run order should keep `check:catalog` first if it ensures schema/seed data, then the endpoint contract script.

## Anti-Patterns To Avoid

- DOM-only checks that click forms but never prove durable database readback.
- Re-testing only direct SQL paths already covered by `check:catalog`.
- Mirroring route implementation by importing private token helpers and decoding expected signatures.
- Deleting or updating seed/user rows.
- Treating title, list position, or visible card order as item identity.
- Adding full browser coverage for every mutation before route-level contracts exist.

## Related Research

- `context/changes/testing-critical-access-catalog-smoke/research.md` - Phase 1 access/catalog smoke grounding.

## Open Questions

- Whether to run endpoint contracts against a locally started Next server (`npm.cmd run dev`/`start`) or to build a narrow route harness. A server-backed script gives stronger signal that Next routing and env wiring work, but costs more orchestration.
- Whether Phase 2 should update the existing `check:catalog` command or add a separate command. Separate command is cleaner because direct DB contracts and HTTP route contracts fail for different reasons.
- Whether to include production endpoint mutation smoke. Current guidance says no: production mutation tests should avoid real user data and are riskier than local/preview contract-owned rows.
