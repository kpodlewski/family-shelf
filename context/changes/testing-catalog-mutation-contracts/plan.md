# Catalog Mutation Contracts Implementation Plan

## Overview

Ship rollout Phase 2 from `context/foundation/test-plan.md`: protect catalog mutation risks with endpoint-level contracts before adding any browser or e2e layer. The new coverage complements the existing SQL/database `check:catalog` script by exercising public HTTP routes, env-backed profile/admin sessions, validation, authorization, durable mutation readback, and cleanup for contract-owned rows.

## Current State Analysis

- `scripts/check-catalog.mjs` already validates schema, seed rows, direct SQL read/search/create/update/delete behavior, and cleanup for `contract-*` rows. It is valuable but bypasses route handlers, validation helpers, profile authorization, admin token checks, and HTTP status translation.
- `POST /api/catalog-items` creates catalog items through `validateCreateCatalogItemInput`, `verifyProfileCapability`, and `createCatalogItem`.
- `PATCH /api/catalog-items/[id]` updates current item state through `validateUpdateCatalogItemInput`, `verifyProfileCapability`, and `updateCatalogItem`.
- `DELETE /api/catalog-items/[id]` requires both a write-capable family profile session and a valid admin token before calling `deleteCatalogItem`.
- `/api/profile-session` and `/api/admin-session` already provide public ways to obtain opaque tokens from env-backed credentials, so the endpoint contract should not import or decode token helpers.
- The project currently uses Node scripts for lightweight checks. There is no dedicated Vitest/Jest/Playwright runner, and Phase 2 does not need one.

## Desired End State

The project has a separate `npm.cmd run check:catalog-api` command that targets a local running app by default. It obtains family/admin tokens through public session endpoints, creates one or more contract-owned catalog rows through the API, updates and deletes them through the API, verifies durable database readback for each mutation, asserts a focused negative matrix for invalid/unauthorized cases, and cleans up contract rows in `finally`.

After this phase lands, Phase 2 in the test plan is `complete`, the catalog contract gate includes both direct database and endpoint-boundary checks, and cookbook §6.2 explains how future catalog mutation tests should be added without mutating seed/user rows.

## Key Decisions

| Decision | Choice | Why | Source |
|---|---|---|---|
| Script shape | Add separate `check:catalog-api` | Keeps SQL contract and HTTP/API contract failures distinct. | User Q1 + research |
| Runtime target | Local running server, default `http://localhost:3000` | Avoids production mutations while still exercising real HTTP routes. | User Q2 + research |
| Test rows | Contract-owned rows only | Proves durable mutations without risking seed/user rows. | User Q3 + research |
| Negative cases | Core auth + validation matrix | Covers risks #3/#5/#6 without creating an exhaustive route-fuzzing suite. | User Q4 + research |
| Readback oracle | API mutation plus DB/script readback | Deterministic proof of durable state while leaving visible UI flow to Phase 4. | User Q5 + research |

## What We're NOT Doing

- No Playwright/browser e2e coverage in this phase.
- No production or preview mutation smoke against real deployed data.
- No mutation of seed rows such as Dune, Catan, or Hades.
- No decoding, forging, or asserting HMAC token internals.
- No exhaustive malformed JSON/body fuzzing for every route.
- No replacement of the existing direct database `check:catalog`; it remains useful.
- No new catalog app behavior unless implementation discovers a bug while adding tests.

## Architecture / Approach

Add `scripts/check-catalog-api.mjs` as a Node script that loads `.env.local`, reads the same database URL inputs as `check:catalog`, and targets `FAMILY_SHELF_CATALOG_API_BASE_URL ?? "http://localhost:3000"`. The script uses public session endpoints to obtain opaque profile/admin tokens, calls catalog mutation endpoints with `fetch`, and uses Neon SQL only for setup/readback/cleanup of contract-owned rows.

The intended local run order is:

1. Start the app locally in another shell (`npm.cmd run dev` or production server if desired).
2. Run `npm.cmd run check:catalog` to ensure schema/seed/direct DB contracts.
3. Run `npm.cmd run check:catalog-api` to exercise HTTP mutation contracts.

## Phase 1: API Contract Harness

### Overview

Create the new script, package command, env loading, HTTP helpers, DB helper, and cleanup scaffold without yet covering every mutation.

### Changes Required

#### 1. Package script

**File**: `package.json`

**Intent**: Give agents and humans one stable command for endpoint-level catalog mutation contracts.

**Contract**: Add `"check:catalog-api": "node scripts/check-catalog-api.mjs"` without changing existing scripts.

#### 2. New script scaffold

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Establish a reusable local HTTP contract harness for catalog mutations.

**Contract**: Load `.env.local`, resolve `DATABASE_URL` or `POSTGRES_URL`, resolve `FAMILY_SHELF_CATALOG_API_BASE_URL` with default `http://localhost:3000`, create a unique `contractRunId`, and expose helpers for JSON requests, assertions, database readback, and cleanup.

#### 3. Public session token setup

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Use the same public auth boundaries as the app instead of importing private token helpers.

**Contract**: Obtain a family profile/session token from `/api/profile-session` using env-backed family password, obtain an admin token from `/api/admin-session` using env-backed admin password, assert token payloads exist, and never print raw passwords or token values.

### Success Criteria

#### Automated Verification

- `npm.cmd run build` passes with the new package script.
- `npm.cmd run lint` passes with the new script present.
- Running `npm.cmd run check:catalog-api` without a local server fails readably with the target base URL in the error.

#### Manual Verification

- The script has no hard-coded family/admin secrets.
- The script treats returned session/admin tokens as opaque values.
- The new command is clearly separate from `check:catalog`.

## Phase 2: Happy Path Mutation Readback

### Overview

Use the harness to prove API create, update, and delete mutate exactly contract-owned rows and can be verified through durable database readback.

### Changes Required

#### 1. Create API contract

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove `POST /api/catalog-items` accepts a valid family session and persists a contract-owned item.

**Contract**: POST a unique contract-owned title/kind/status/note, assert `201`, assert returned item fields, read the row from the database by id, and assert the durable row matches the API response.

#### 2. Update API contract

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove `PATCH /api/catalog-items/[id]` persists current visible state changes and keeps item identity stable.

**Contract**: PATCH the created item to `borrowed` with borrower/note, assert `200`, assert id/title/kind stability, read back durable status/borrower/note, then PATCH back to `available` with cleared nullable fields and assert readback shows `null` borrower/note.

#### 3. Delete API contract

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove `DELETE /api/catalog-items/[id]` deletes by stable id and removes only the intended contract row.

**Contract**: DELETE the contract item with family profile evidence plus admin token, assert `200`, assert returned deleted id/title, read back by id to confirm absence, and assert stable seed row ids still exist.

#### 4. Cleanup guarantee

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Keep the check safe against a real configured local/preview database.

**Contract**: Wrap mutation work in `try/finally` and delete only rows whose ids or titles match the current `contractRunId` pattern.

### Success Criteria

#### Automated Verification

- With the app running locally, `npm.cmd run check:catalog` passes before the API check.
- With the app running locally, `npm.cmd run check:catalog-api` creates, updates, deletes, and cleans contract-owned rows.
- `npm.cmd run check:catalog` still passes after `check:catalog-api`.

#### Manual Verification

- The API contract rows do not remain in the database after a successful run.
- Seed rows are not updated or deleted by the API contract.
- The check output identifies create, update, delete, or cleanup failures clearly enough to act on.

## Phase 3: Negative API Matrix

### Overview

Add focused negative cases that protect the known risk boundaries without turning the script into exhaustive route fuzzing.

### Changes Required

#### 1. Write authorization negatives

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove hidden UI controls are not the only write protection.

**Contract**: Assert missing profile evidence rejects create/update/delete, guest profile evidence rejects create/update/delete with read-only status, and invalid family session token rejects write attempts. Use contract-owned ids only.

#### 2. Validation negatives

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove invalid mutation inputs fail readably before corrupting durable state.

**Contract**: Assert blank create title returns `400`, invalid update status returns `400`, overlong borrower/note is rejected where practical, and the target contract row remains unchanged after rejected updates.

#### 3. Delete safety negatives

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove destructive operations require admin unlock and handle missing targets safely.

**Contract**: Assert delete without admin token returns `401`, delete with invalid admin token returns `401`, and delete of a missing contract id returns `404` without affecting the created contract row or seed rows.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog-api` fails if guest or missing profile evidence can create/update/delete.
- `npm.cmd run check:catalog-api` fails if invalid update data mutates a durable row.
- `npm.cmd run check:catalog-api` fails if delete succeeds without a valid admin token.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Negative assertions are readable and name the endpoint/status expectation.
- The script does not print family password, admin password, profile session token, or admin token.
- The negative matrix stays focused and does not attempt exhaustive malformed-request fuzzing.

## Phase 4: Gate Docs And Cookbook

### Overview

Wire the new command into project documentation and close the rollout by updating the test-plan cookbook pattern for catalog mutation tests.

### Changes Required

#### 1. Deployment/check documentation

**File**: `docs/deployment.md`

**Intent**: Tell humans and agents when and how to run the endpoint catalog contract.

**Contract**: Document `npm.cmd run check:catalog-api`, note that a local app server must be running, state the default base URL and `FAMILY_SHELF_CATALOG_API_BASE_URL` override, and list the required env-backed family/admin/database config without secrets.

#### 2. Test plan quality gate update

**File**: `context/foundation/test-plan.md`

**Intent**: Make Phase 2's catalog contract gate reflect the shipped endpoint-boundary check.

**Contract**: Update §5 catalog contract wording if needed to include `check:catalog-api`, and update §6.2 with the pattern for catalog mutation endpoint contracts: public session endpoints, contract-owned rows, durable readback, negative auth/validation cases, cleanup in `finally`, and no seed/user row mutation.

#### 3. Final verification pass

**File**: no dedicated file unless checks require one

**Intent**: Prove the new command composes with existing project checks.

**Contract**: Run `check:catalog`, `check:catalog-api`, `check:profiles`, `build`, and `lint` in the documented order.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes.
- `npm.cmd run check:catalog-api` passes against the local app server.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.
- `context/foundation/test-plan.md` §6.2 no longer contains the Phase 2 TBD placeholder.

#### Manual Verification

- A future agent can tell from docs that `check:catalog-api` requires a local running app.
- The cookbook explains how to add future catalog mutation contracts without mutating seed/user rows.
- Phase 2 status can be marked complete after the shipped checks pass.

## Testing Strategy

Automated:

- `npm.cmd run check:catalog`
- Start the app locally (`npm.cmd run dev` or equivalent local server)
- `npm.cmd run check:catalog-api`
- `npm.cmd run check:profiles`
- `npm.cmd run build`
- `npm.cmd run lint`

Manual:

1. Confirm `check:catalog-api` error output is readable when the local server is not running.
2. Run the command with the local server running and confirm no contract rows remain.
3. Confirm no raw credentials or tokens appear in output, docs, or committed files.
4. Confirm the docs explain local server and env expectations.

## Migration Notes

No database schema migration is expected. The new script creates and deletes contract-owned rows only. If a failed run leaves rows behind, the next run should remove rows matching its own cleanup pattern where safe; it must not delete arbitrary user or seed rows.

## Open Risks And Assumptions

- The local app server must be started outside the script; this is intentionally simpler than process orchestration but requires clear docs.
- The API check depends on valid local `.env.local` values for database, family password, and admin password.
- `FAMILY_SHELF_CATALOG_API_BASE_URL` can point at a preview environment, but production mutation checks remain out of scope unless a disposable database is guaranteed.
- The script uses DB readback as the oracle; visible `/items` shell or browser assertions remain Phase 4 work.

## References

- Test plan: `context/foundation/test-plan.md` Phase 2
- Research: `context/changes/testing-catalog-mutation-contracts/research.md`
- Catalog repository: `src/lib/catalog.ts`
- Catalog validation: `src/lib/catalogValidation.ts`
- Create route: `src/app/api/catalog-items/route.ts`
- Update/delete route: `src/app/api/catalog-items/[id]/route.ts`
- Profile authorization: `src/lib/profileAuthorization.ts`
- Existing DB contract check: `scripts/check-catalog.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `— <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: API Contract Harness

#### Automated

- [x] 1.1 `npm.cmd run build` passes with the new package script. — b70182e
- [x] 1.2 `npm.cmd run lint` passes with the new script present. — b70182e
- [x] 1.3 Running `npm.cmd run check:catalog-api` without a local server fails readably with the target base URL in the error. — b70182e

#### Manual

- [x] 1.4 The script has no hard-coded family/admin secrets. — b70182e
- [x] 1.5 The script treats returned session/admin tokens as opaque values. — b70182e
- [x] 1.6 The new command is clearly separate from `check:catalog`. — b70182e

### Phase 2: Happy Path Mutation Readback

#### Automated

- [x] 2.1 With the app running locally, `npm.cmd run check:catalog` passes before the API check.
- [x] 2.2 With the app running locally, `npm.cmd run check:catalog-api` creates, updates, deletes, and cleans contract-owned rows.
- [x] 2.3 `npm.cmd run check:catalog` still passes after `check:catalog-api`.

#### Manual

- [x] 2.4 The API contract rows do not remain in the database after a successful run.
- [x] 2.5 Seed rows are not updated or deleted by the API contract.
- [x] 2.6 The check output identifies create, update, delete, or cleanup failures clearly enough to act on.

### Phase 3: Negative API Matrix

#### Automated

- [ ] 3.1 `npm.cmd run check:catalog-api` fails if guest or missing profile evidence can create/update/delete.
- [ ] 3.2 `npm.cmd run check:catalog-api` fails if invalid update data mutates a durable row.
- [ ] 3.3 `npm.cmd run check:catalog-api` fails if delete succeeds without a valid admin token.
- [ ] 3.4 `npm.cmd run build` passes.
- [ ] 3.5 `npm.cmd run lint` passes.

#### Manual

- [ ] 3.6 Negative assertions are readable and name the endpoint/status expectation.
- [ ] 3.7 The script does not print family password, admin password, profile session token, or admin token.
- [ ] 3.8 The negative matrix stays focused and does not attempt exhaustive malformed-request fuzzing.

### Phase 4: Gate Docs And Cookbook

#### Automated

- [ ] 4.1 `npm.cmd run check:catalog` passes.
- [ ] 4.2 `npm.cmd run check:catalog-api` passes against the local app server.
- [ ] 4.3 `npm.cmd run check:profiles` passes.
- [ ] 4.4 `npm.cmd run build` passes.
- [ ] 4.5 `npm.cmd run lint` passes.
- [ ] 4.6 `context/foundation/test-plan.md` §6.2 no longer contains the Phase 2 TBD placeholder.

#### Manual

- [ ] 4.7 A future agent can tell from docs that `check:catalog-api` requires a local running app.
- [ ] 4.8 The cookbook explains how to add future catalog mutation contracts without mutating seed/user rows.
- [ ] 4.9 Phase 2 status can be marked complete after the shipped checks pass.
