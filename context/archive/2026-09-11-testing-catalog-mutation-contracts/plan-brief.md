# Catalog Mutation Contracts - Plan Brief

> Full plan: `context/changes/testing-catalog-mutation-contracts/plan.md`  
> Research: `context/changes/testing-catalog-mutation-contracts/research.md`

## What & Why

This plan ships rollout Phase 2 of the project test plan: catalog mutation contracts for add/update/delete and readback. The motivation is to close the gap between the current direct SQL `check:catalog` and the real app boundary where validation, profile sessions, admin tokens, route status codes, durable data, and cleanup all meet.

## Starting Point

The app already has durable Neon/Postgres catalog storage and `scripts/check-catalog.mjs` covers direct database read/search/create/update/delete with contract-owned rows. Research found that the missing signal is endpoint-level coverage for `/api/catalog-items`, `/api/catalog-items/[id]`, `/api/profile-session`, and `/api/admin-session`.

## Desired End State

The project has a separate `npm.cmd run check:catalog-api` command. It targets a local running app by default, obtains opaque family/admin tokens through public session endpoints, creates/updates/deletes only contract-owned rows through HTTP APIs, verifies durable database readback, asserts focused auth/validation negatives, and cleans up after itself.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Script shape | Separate `check:catalog-api` | Keeps SQL and HTTP contract failures distinct. | User + Research |
| Runtime target | Local running server | Avoids production mutations while exercising real routes. | User + Research |
| Test data | Contract-owned rows only | Protects seed/user data. | User + Research |
| Negative cases | Core auth + validation matrix | Covers risks without exhaustive fuzzing. | User + Research |
| Readback oracle | DB/script readback | Deterministic durable-state proof; UI is Phase 4. | User + Research |

## Scope

**In scope:**

- Add `scripts/check-catalog-api.mjs`.
- Add `npm.cmd run check:catalog-api`.
- Cover API create/update/delete happy paths with DB readback.
- Cover focused negative cases for auth, validation, delete admin token, and missing rows.
- Document local server/env expectations.
- Update `context/foundation/test-plan.md` §6.2 cookbook.

**Out of scope:**

- Playwright/browser e2e.
- Production mutation smoke.
- Mutating seed rows.
- Token decoding or HMAC implementation assertions.
- Replacing existing `check:catalog`.

## Architecture / Approach

Keep the existing SQL-level `check:catalog` as the database contract. Add a separate HTTP-level Node script that calls public session endpoints to get opaque tokens, calls catalog mutation endpoints with `fetch`, and uses Neon SQL only for setup/readback/cleanup of contract-owned rows.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. API Contract Harness | New script command, env/base URL helpers, session token setup | Bad harness leaks secrets or confuses SQL/API failures |
| 2. Happy Path Mutation Readback | API create/update/delete with durable DB readback and cleanup | Returning 200 without durable state change |
| 3. Negative API Matrix | Focused unauthorized/invalid/missing-row assertions | Guest/family/admin boundaries silently regress |
| 4. Gate Docs And Cookbook | Docs, final checks, test-plan §6.2 pattern | Future agents cannot run or extend the gate correctly |

**Prerequisites:** Local env has database, family password, and admin password config. A local app server must be running for `check:catalog-api`.

**Estimated effort:** ~4 implementation phases, likely 2-3 working sessions including manual gates.

## Open Risks & Assumptions

- The script assumes a local server is started outside the check.
- `.env.local` must contain valid non-secret-in-output credentials for local runs.
- `FAMILY_SHELF_CATALOG_API_BASE_URL` can target other environments, but production mutation checks stay out of scope.
- DB readback is the oracle for Phase 2; visible `/items` browser flow belongs to Phase 4.

## Success Criteria (Summary)

- `check:catalog-api` proves API create/update/delete durable behavior with contract-owned rows.
- Unauthorized/invalid/missing-row cases fail with readable assertions and without data corruption.
- Docs and cookbook make the new catalog mutation pattern clear for humans and future agents.
