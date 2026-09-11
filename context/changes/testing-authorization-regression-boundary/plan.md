# Authorization Regression Boundary Implementation Plan

## Overview

Ship rollout Phase 3 from `context/foundation/test-plan.md`: prove guest/family/admin capability rules are enforced at the server/API boundary, not only by hidden UI controls. This phase extends the existing `check:catalog-api` integration contract with the specific authorization gaps identified in research, rather than creating a second mutation test harness.

## Current State Analysis

- `scripts/check-profiles.mjs` already proves the static profile contract: family profiles can read/search/write, guest can read/search only, and no profile has `admin:delete`.
- `scripts/check-catalog-api.mjs` already exercises real HTTP routes, obtains family/admin tokens through public endpoints, mutates only contract-owned rows, and uses database readback as the durable oracle.
- Phase 2 already covers guest create/update/delete failures, missing profile evidence, invalid family session evidence, missing/invalid admin token delete, missing-row delete, stable-id delete, and seed-row preservation.
- The real remaining boundary is credential composition: a stale/tampered family profile id must not work with another family profile's token, a valid admin token alone must not delete, and guest evidence must not be upgraded by a valid admin token.

## Desired End State

`npm.cmd run check:catalog-api` includes a focused authorization regression layer for stale/tampered profile evidence and admin-token composition. The script still uses only public session endpoints, opaque tokens, contract-owned rows, and durable readback. The test plan cookbook explains the shipped guest/family/admin boundary pattern, and Phase 3 is ready to mark complete after the full gate set passes.

## Key Decisions

| Decision | Choice | Why | Source |
|---|---|---|---|
| Command shape | Extend `check:catalog-api` | Existing harness already owns the real API + DB readback boundary, so a new script would duplicate setup/cleanup. | User 1a + research |
| Case scope | Add only research gaps | Phase 2 already covered broad guest and delete negatives; Phase 3 should be additive and narrow. | User 2a + research |
| Verification | Full gates | Keeps Phase 3 aligned with current repository gates and catches build/lint drift around the script/docs edits. | User 3a |
| Token model | Treat tokens as opaque | The app contract is public session endpoints plus returned tokens, not HMAC internals. | Research |
| Data safety | Reuse contract-owned row and unchanged readback | Proves rejected writes/deletes have no durable side effects without touching seed/user rows. | Research |

## What We're NOT Doing

- No new `check:authorization` script unless implementation discovers `check:catalog-api` has become unmaintainable.
- No browser/e2e coverage in this phase; Phase 4 owns minimal UI/e2e wiring.
- No repeated full mutation matrix from Phase 2.
- No token decoding, token forging, or HMAC implementation assertions.
- No production mutation checks.
- No app behavior changes unless adding tests exposes a real bug that must be fixed.

## Architecture / Approach

Keep the authorization regression tests inside `scripts/check-catalog-api.mjs`. Parameterize the family session helper enough to obtain a real session for another family profile, compose negative evidence payloads from real public tokens, then assert the API returns the expected readable failure and leaves the contract row unchanged. Documentation changes belong in `context/foundation/test-plan.md` after the script behavior is implemented and verified.

## Phase 1: Cross-Profile Session Boundary

### Overview

Prove a valid family token is bound to its selected profile and cannot authorize writes for another family profile id.

### Changes Required

#### 1. Parameterize family session acquisition

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Let the check obtain real profile-session evidence for more than one family profile through the public `/api/profile-session` endpoint.

**Contract**: `getFamilySession` accepts a profile id, defaults to the existing `family-1` behavior, posts the configured family password, and asserts the response profile id matches the requested id. It must not print the password or returned token.

#### 2. Add mismatched family evidence

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Model stale or tampered localStorage where the selected profile id and session token no longer belong together.

**Contract**: Build evidence using `profileId: "family-2"` with the `family-1` token or the inverse. Use real session endpoint output; do not construct or inspect token internals.

#### 3. Assert cross-profile create/update/delete rejections

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prove stale/tampered family evidence cannot mutate catalog state.

**Contract**: Add create, update, and delete failure assertions using mismatched family evidence. Expected status is `401`. Update/delete assertions must read back the contract row and confirm it remains unchanged. Delete can include a valid admin token to prove admin unlock does not rescue an invalid profile session.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:catalog-api` fails if cross-profile family evidence can create a row.
- [ ] `npm.cmd run check:catalog-api` fails if cross-profile family evidence can update the contract row.
- [ ] `npm.cmd run check:catalog-api` fails if cross-profile family evidence plus a valid admin token can delete the contract row.

#### Manual Verification

- [ ] The new cases use public session endpoint responses and do not decode or mirror token internals.
- [ ] Failure labels clearly identify cross-profile or mismatched family evidence.
- [ ] The new cases do not create or mutate seed/user rows.

## Phase 2: Admin Token Composition Boundary

### Overview

Prove admin unlock is necessary but not sufficient for destructive work; delete still requires a verified write-capable family session.

### Changes Required

#### 1. Add admin-token-only delete rejection

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prevent regressions where a valid admin token alone can delete catalog rows.

**Contract**: Call `DELETE /api/catalog-items/[id]` with only `{ adminToken }`, expect `400` from missing profile evidence, assert a readable error payload, and assert the contract row remains unchanged.

#### 2. Add guest-plus-admin delete rejection

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Prevent regressions where a valid admin token upgrades guest evidence into destructive access.

**Contract**: Call delete with `{ profileId: "guest", sessionToken: null, adminToken }`, expect `403`, assert a readable error payload, and assert the contract row remains unchanged.

#### 3. Keep delete identity and side-effect checks intact

**File**: `scripts/check-catalog-api.mjs`

**Intent**: Preserve Phase 2's Risk #6 coverage while adding the new boundary cases.

**Contract**: Existing successful delete by id, missing-row `404`, invalid admin token, and seed-row preservation assertions must remain in place. The new cases should be inserted before final successful delete so the contract row is still available for unchanged readback.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:catalog-api` fails if a valid admin token without profile evidence can delete.
- [ ] `npm.cmd run check:catalog-api` fails if guest evidence plus a valid admin token can delete.
- [ ] `npm.cmd run check:catalog-api` still proves successful delete removes only the intended contract row by id.

#### Manual Verification

- [ ] The delete negative matrix remains readable and not duplicated from Phase 2.
- [ ] Expected statuses reflect route behavior: missing profile evidence returns `400`, guest read-only evidence returns `403`.
- [ ] Admin token values are redacted in request/debug output.

## Phase 3: Cookbook And Rollout Status

### Overview

Document the shipped authorization regression pattern and mark Phase 3 through the rollout artifacts.

### Changes Required

#### 1. Test plan cookbook update

**File**: `context/foundation/test-plan.md`

**Intent**: Give future agents a concise pattern for adding server-side authorization boundary tests.

**Contract**: Replace the Phase 3 TBD in section 6.3 with the shipped pattern: keep static role/capability shape in `check:profiles`, keep API authorization regressions in `check:catalog-api`, use public session endpoints, assert token/profile mismatch, assert admin token is not sufficient, use contract-owned rows, assert unchanged durable state, and avoid UI-only or token-internal tests.

#### 2. Phase status update

**File**: `context/foundation/test-plan.md`

**Intent**: Keep the rollout ledger consistent with shipped artifacts.

**Contract**: During implementation, Phase 3 should move from `planned` to `implementing`, and after all progress checkboxes are complete it should move to `complete`.

#### 3. Change folder progress upkeep

**File**: `context/changes/testing-authorization-regression-boundary/plan.md`

**Intent**: Preserve the existing `/10x-implement` progress contract.

**Contract**: Mark each progress checkbox complete only after its verification has passed, appending the commit sha when a phase lands.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run lint` passes.
- [ ] `npm.cmd run build` passes.
- [ ] `npm.cmd run check:profiles` passes.
- [ ] `npm.cmd run check:catalog` passes.
- [ ] With the local app server running, `npm.cmd run check:catalog-api` passes.
- [ ] `context/foundation/test-plan.md` section 6.3 no longer contains the Phase 3 TBD placeholder.

#### Manual Verification

- [ ] The cookbook explains why hidden UI controls are not sufficient authorization proof.
- [ ] The cookbook explains why admin-token-only and guest-plus-admin delete cases matter.
- [ ] The final plan status can be advanced to complete after implementation commits land.

## Testing Strategy

Automated verification for the full rollout:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:profiles`
- `npm.cmd run check:catalog`
- Start the local app server.
- `npm.cmd run check:catalog-api`

Manual verification for the full rollout:

1. Inspect `scripts/check-catalog-api.mjs` and confirm the new assertions use real public session endpoint tokens without decoding them.
2. Confirm no raw family password, admin password, profile session token, or admin token is printed.
3. Confirm failed authorization cases assert unchanged durable state before the final successful delete.
4. Confirm section 6.3 of the test plan gives future agents a reusable authorization-boundary pattern.

## Migration Notes

No database schema migration is expected. The implementation should reuse the existing contract row and cleanup behavior from `check:catalog-api`. If the local API check fails midway, rerunning the script should remain safe because cleanup is scoped to the current contract row/id/title pattern and must not delete seed/user rows.

## Open Risks And Assumptions

- The local app server is still started outside the script; this is already true for `check:catalog-api`.
- The exact cross-profile mismatch can use either `family-1` token with `family-2` id or the inverse; the invariant is that profile id and token do not belong together.
- If implementation reveals that `check:catalog-api` is becoming too hard to scan, splitting a helper section is acceptable; adding a separate command remains out of scope unless strongly justified.
- Phase 4 will handle UI/e2e coverage for visible hidden-control behavior.

## References

- Test plan: `context/foundation/test-plan.md` Phase 3
- Research: `context/changes/testing-authorization-regression-boundary/research.md`
- API contract script: `scripts/check-catalog-api.mjs`
- Profile contract script: `scripts/check-profiles.mjs`
- Profiles: `src/lib/profiles.ts`
- Profile authorization: `src/lib/profileAuthorization.ts`
- Create route: `src/app/api/catalog-items/route.ts`
- Update/delete route: `src/app/api/catalog-items/[id]/route.ts`
- Delete UI context: `src/components/DeleteCatalogItemForm.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `-- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Cross-Profile Session Boundary

#### Automated

- [x] 1.1 `npm.cmd run check:catalog-api` fails if cross-profile family evidence can create a row. -- 7d9dd5b
- [x] 1.2 `npm.cmd run check:catalog-api` fails if cross-profile family evidence can update the contract row. -- 7d9dd5b
- [x] 1.3 `npm.cmd run check:catalog-api` fails if cross-profile family evidence plus a valid admin token can delete the contract row. -- 7d9dd5b

#### Manual

- [x] 1.4 The new cases use public session endpoint responses and do not decode or mirror token internals. -- 7d9dd5b
- [x] 1.5 Failure labels clearly identify cross-profile or mismatched family evidence. -- 7d9dd5b
- [x] 1.6 The new cases do not create or mutate seed/user rows. -- 7d9dd5b

### Phase 2: Admin Token Composition Boundary

#### Automated

- [x] 2.1 `npm.cmd run check:catalog-api` fails if a valid admin token without profile evidence can delete.
- [x] 2.2 `npm.cmd run check:catalog-api` fails if guest evidence plus a valid admin token can delete.
- [x] 2.3 `npm.cmd run check:catalog-api` still proves successful delete removes only the intended contract row by id.

#### Manual

- [x] 2.4 The delete negative matrix remains readable and not duplicated from Phase 2.
- [x] 2.5 Expected statuses reflect route behavior: missing profile evidence returns `400`, guest read-only evidence returns `403`.
- [x] 2.6 Admin token values are redacted in request/debug output.

### Phase 3: Cookbook And Rollout Status

#### Automated

- [ ] 3.1 `npm.cmd run lint` passes.
- [ ] 3.2 `npm.cmd run build` passes.
- [ ] 3.3 `npm.cmd run check:profiles` passes.
- [ ] 3.4 `npm.cmd run check:catalog` passes.
- [ ] 3.5 With the local app server running, `npm.cmd run check:catalog-api` passes.
- [ ] 3.6 `context/foundation/test-plan.md` section 6.3 no longer contains the Phase 3 TBD placeholder.

#### Manual

- [ ] 3.7 The cookbook explains why hidden UI controls are not sufficient authorization proof.
- [ ] 3.8 The cookbook explains why admin-token-only and guest-plus-admin delete cases matter.
- [ ] 3.9 The final plan status can be advanced to complete after implementation commits land.
