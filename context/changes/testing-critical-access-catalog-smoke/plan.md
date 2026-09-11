# Critical Access And Catalog Smoke Implementation Plan

## Overview

Ship rollout Phase 1 from `context/foundation/test-plan.md`: protect the two highest-priority access risks with the cheapest useful signal. This phase adds a script-based smoke layer, not a full browser suite. It verifies that the production app accepts the configured family/admin credentials and that `/items` can render real catalog data from the deployed data boundary.

## Current State Analysis

- `POST /api/profile-session` verifies family profile credentials through `FAMILY_SHELF_FAMILY_PASSWORD`, returns `503` when config is missing, `401` when wrong, and a profile/session payload when valid.
- `POST /api/admin-session` verifies admin unlock through `FAMILY_SHELF_ADMIN_PASSWORD`, returns `503` when config is missing, `401` when wrong, and an admin token when valid.
- `/items` server-renders through `listCatalogItems()` / `searchCatalogItems()`, which read Neon via `DATABASE_URL` or `POSTGRES_URL`.
- `check:profiles` validates only the static profile shape and capabilities; it does not exercise profile/admin session APIs.
- `check:catalog` validates the database contract directly and seeds stable rows, but it does not prove the deployed `/items` route can render those rows.
- The production incident came from missing or stale Vercel env vars, so local-only success is not enough signal.

## Desired End State

The project has a repeatable `npm.cmd run check:smoke` command that targets production by default. It loads local `.env.local` values for credentials when available, posts to the production family/admin session endpoints, asserts success for configured credentials, asserts wrong credentials are rejected, and checks that production `/items` returns `200` with a known seed title after `check:catalog` has seeded/verified catalog data.

## What We're NOT Doing

- No Playwright/Cypress/full browser e2e setup in this phase.
- No pixel-perfect visual checks.
- No destructive admin delete smoke.
- No mutation smoke for add/update/delete; that belongs to later rollout phases.
- No hard-coded secrets in source or docs.
- No production env removal test. Missing-env behavior is covered at contract level only.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Smoke target | Production only, `https://family-shelf-gamma.vercel.app` by default | Directly protects the incident class the user hit. |
| Secret source | Load `.env.local` automatically, while still accepting process env | Keeps local agent runs easy without committing secrets. |
| Items assertion | `HTTP 200` plus known seed title after `check:catalog` | Proves server route and real data boundary, not only HTML shell. |
| Missing env coverage | Contract-level only | Avoids unsafe manipulation of production env while still verifying readable failure behavior. |
| Deliverable | `check:smoke` script, docs update, cookbook update | Gives agents and humans one concrete gate to run. |

## Phase 1: Session Endpoint Contract Harness

### Overview

Add a low-level contract harness for the family/admin session behavior so missing/wrong/valid credential behavior is explicit before hitting production.

### Changes Required

#### 1. Shared local env loader

**File**: `scripts/load-local-env.mjs` or local helper inside the new script if reuse would be premature

**Intent**: Reuse the existing `.env.local` pattern from `check:catalog` without scattering parsing code more than necessary.

**Contract**: Load key/value pairs from `.env.local` only when `process.env[key]` is unset. Do not print secret values. Quoted values should be unwrapped as in `scripts/check-catalog.mjs`.

#### 2. Session smoke request helpers

**File**: `scripts/check-smoke.mjs`

**Intent**: Centralize HTTP JSON request/response assertions for `profile-session` and `admin-session`.

**Contract**: Provide helpers that POST JSON, parse JSON responses, assert status codes, and redact sensitive request values from error output.

#### 3. Contract-level session assertions

**File**: `scripts/check-smoke.mjs`

**Intent**: Verify the session endpoint semantics that protect Risk #1 without mirroring token implementation details.

**Contract**: Assert:
- family profile with configured password returns `200`, `profile.id === "family-1"`, and a non-empty `sessionToken`;
- family profile with wrong password returns `401`;
- admin with configured password returns `200` and a non-empty `adminToken`;
- admin with wrong password returns `401`.

Do not assert HMAC payload internals. Treat tokens as opaque.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:smoke` reaches both session endpoints and passes the valid/wrong credential assertions.
- [ ] Smoke output redacts password values.
- [ ] `npm.cmd run lint` passes.

#### Manual Verification

- [ ] Temporarily changing the local family password value causes the family valid-credential assertion to fail without printing the secret.
- [ ] Temporarily changing the local admin password value causes the admin valid-credential assertion to fail without printing the secret.

## Phase 2: Production `/items` Catalog Smoke

### Overview

Extend the smoke script to prove production can render the item catalog from the real data boundary.

### Changes Required

#### 1. Production base URL default

**File**: `scripts/check-smoke.mjs`

**Intent**: Make the command protect production by default while keeping a narrow override available for future preview/local use if needed.

**Contract**: Default base URL is `https://family-shelf-gamma.vercel.app`. If an override env var is added, prefer a clearly named value such as `FAMILY_SHELF_SMOKE_BASE_URL`; document that production is the expected default for this phase.

#### 2. Items route assertion

**File**: `scripts/check-smoke.mjs`

**Intent**: Prove `/items` returns a successful server-rendered response with seeded catalog content.

**Contract**: Fetch `/items`, assert `HTTP 200`, assert the response body includes `"Item catalog"`, and assert at least one known seed title such as `"Dune"` or `"Catan"`. The command should tell the operator to run `npm.cmd run check:catalog` first if the seed assertion fails.

#### 3. Package script

**File**: `package.json`

**Intent**: Give agents and humans one stable command for Phase 1 smoke.

**Contract**: Add `"check:smoke": "node scripts/check-smoke.mjs"`.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:catalog` passes before smoke.
- [ ] `npm.cmd run check:smoke` asserts production `/items` returns `200`.
- [ ] `npm.cmd run check:smoke` asserts production `/items` includes a known seed title.
- [ ] `npm.cmd run build` passes.
- [ ] `npm.cmd run lint` passes.

#### Manual Verification

- [ ] Running smoke against production catches a bad or stale production deployment URL.
- [ ] Running smoke before catalog seed rows exist produces an actionable failure message.

## Phase 3: Deployment Documentation And Gate Placement

### Overview

Update operational docs so the new smoke command sits in the correct sequence and does not create false confidence.

### Changes Required

#### 1. Deployment verification order

**File**: `docs/deployment.md`

**Intent**: Make smoke part of the deploy checklist after catalog/profile checks and after redeploying env changes.

**Contract**: Add `npm.cmd run check:smoke` after `check:catalog`, `check:profiles`, `build`, and `lint`, with a note that it targets production by default and depends on configured Vercel env vars plus seeded catalog data.

#### 2. Env variable note

**File**: `docs/deployment.md`

**Intent**: Capture the failure mode from the production password incident.

**Contract**: Document that changing Vercel password env vars requires redeploy before production smoke can pass.

#### 3. Test-plan gate update

**File**: `context/foundation/test-plan.md`

**Intent**: Keep the quality contract aligned with what ships in this phase.

**Contract**: If implementation confirms the command shape, update §5 to name `npm.cmd run check:smoke` under production env smoke.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:smoke` is documented in `docs/deployment.md`.
- [ ] `context/foundation/test-plan.md` §5 references the shipped smoke command.

#### Manual Verification

- [ ] A reader can follow deployment docs to understand when to run `check:smoke`.
- [ ] Docs state that Vercel env changes require redeploy.

## Phase 4: Cookbook Update And Final Verification

### Overview

Close the rollout phase by updating cookbook guidance and running the full gate set.

### Changes Required

#### 1. Cookbook profile/login pattern

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the §6.1 placeholder with the concrete pattern for profile/admin session smoke.

**Contract**: Document where the smoke script lives, what it asserts, how to run it, and the anti-patterns it avoids.

#### 2. Cookbook production smoke pattern

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the §6.5 placeholder with the production smoke pattern.

**Contract**: Document production default, `.env.local` loading, seed-title dependency, and the expected command order: `check:catalog` before `check:smoke`.

#### 3. Final check pass

**File**: no dedicated source file

**Intent**: Prove this phase integrates with existing gates.

**Contract**: Run the baseline and new checks in the order listed below.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:profiles` passes.
- [ ] `npm.cmd run check:catalog` passes.
- [ ] `npm.cmd run check:smoke` passes against production.
- [ ] `npm.cmd run build` passes.
- [ ] `npm.cmd run lint` passes.
- [ ] `context/foundation/test-plan.md` §6.1 and §6.5 no longer contain TBD placeholders for this phase.

#### Manual Verification

- [ ] Smoke failures are readable enough to distinguish wrong credentials, missing seed data, and unreachable production URL.
- [ ] No secret values appear in command output, docs, or committed files.
- [ ] Phase 1 status can be marked complete after the shipped checks pass.

## Testing Strategy

Automated:

- `npm.cmd run check:profiles`
- `npm.cmd run check:catalog`
- `npm.cmd run check:smoke`
- `npm.cmd run build`
- `npm.cmd run lint`

Manual:

1. Confirm `.env.local` contains the same family/admin password values expected for production, without committing it.
2. Confirm Vercel env changes have been redeployed before running production smoke.
3. Temporarily run smoke with a wrong local family/admin password and confirm it fails safely without printing secrets.
4. Confirm `/items` smoke failure message explains the `check:catalog` prerequisite when a seed title is missing.

## Performance Considerations

Smoke requests are a small number of HTTPS calls to production. No caching, browser automation, parallel load, or long-running polling is required. Keep timeouts short enough to fail quickly but long enough for a cold serverless response.

## Migration Notes

No data migration. `check:smoke` depends on existing stable seed catalog rows; `check:catalog` already inserts those rows when needed. Adding the package script is additive.

## Open Risks And Assumptions

- Production smoke depends on network access and Vercel availability; a transient provider issue can fail the gate.
- The known seed title assertion assumes `check:catalog` remains the source of stable seed rows.
- `.env.local` loading is convenient but can mask production drift unless `check:smoke` is run against production after redeploy.

## References

- Test plan: `context/foundation/test-plan.md` Phase 1
- Research: `context/changes/testing-critical-access-catalog-smoke/research.md`
- Profile session route: `src/app/api/profile-session/route.ts`
- Admin session route: `src/app/api/admin-session/route.ts`
- Items page: `src/app/items/page.tsx`
- Catalog repository: `src/lib/catalog.ts`
- Database config: `src/lib/database.ts`
- Deployment docs: `docs/deployment.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Session Endpoint Contract Harness

#### Automated

- [x] 1.1 `npm.cmd run check:smoke` reaches both session endpoints and passes the valid/wrong credential assertions. — 48ec489
- [x] 1.2 Smoke output redacts password values. — 48ec489
- [x] 1.3 `npm.cmd run lint` passes. — 48ec489

#### Manual

- [x] 1.4 Temporarily changing the local family password value causes the family valid-credential assertion to fail without printing the secret. — 48ec489
- [x] 1.5 Temporarily changing the local admin password value causes the admin valid-credential assertion to fail without printing the secret. — 48ec489

### Phase 2: Production `/items` Catalog Smoke

#### Automated

- [x] 2.1 `npm.cmd run check:catalog` passes before smoke. — 90dc1dd
- [x] 2.2 `npm.cmd run check:smoke` asserts production `/items` returns `200`. — 90dc1dd
- [x] 2.3 `npm.cmd run check:smoke` asserts production `/items` includes a known seed title. — 90dc1dd
- [x] 2.4 `npm.cmd run build` passes. — 90dc1dd
- [x] 2.5 `npm.cmd run lint` passes. — 90dc1dd

#### Manual

- [x] 2.6 Running smoke against production catches a bad or stale production deployment URL. — 90dc1dd
- [x] 2.7 Running smoke before catalog seed rows exist produces an actionable failure message. — 90dc1dd

### Phase 3: Deployment Documentation And Gate Placement

#### Automated

- [x] 3.1 `npm.cmd run check:smoke` is documented in `docs/deployment.md`. — 02c44c8
- [x] 3.2 `context/foundation/test-plan.md` §5 references the shipped smoke command. — 02c44c8

#### Manual

- [x] 3.3 A reader can follow deployment docs to understand when to run `check:smoke`. — 02c44c8
- [x] 3.4 Docs state that Vercel env changes require redeploy. — 02c44c8

### Phase 4: Cookbook Update And Final Verification

#### Automated

- [x] 4.1 `npm.cmd run check:profiles` passes.
- [x] 4.2 `npm.cmd run check:catalog` passes.
- [x] 4.3 `npm.cmd run check:smoke` passes against production.
- [x] 4.4 `npm.cmd run build` passes.
- [x] 4.5 `npm.cmd run lint` passes.
- [x] 4.6 `context/foundation/test-plan.md` §6.1 and §6.5 no longer contain TBD placeholders for this phase.

#### Manual

- [x] 4.7 Smoke failures are readable enough to distinguish wrong credentials, missing seed data, and unreachable production URL.
- [x] 4.8 No secret values appear in command output, docs, or committed files.
- [x] 4.9 Phase 1 status can be marked complete after the shipped checks pass.
