---
change_id: testing-authorization-regression-boundary
title: Authorization regression boundary
status: researched
created: 2026-09-12T00:55:48.8081652+02:00
updated: 2026-09-12T00:55:48.8081652+02:00
git_commit: 852457c
---

# Research: Authorization Regression Boundary

## Scope

Rollout Phase 3 of `context/foundation/test-plan.md`: "Authorization regression boundary".

Risks grounded:

- Risk #4: Guest can perform write or delete actions.
- Risk #6: Admin delete removes the wrong item or fails without a safe rejection.

The important correction from code research is that Phase 2 already shipped a strong catalog API mutation contract. Phase 3 should not duplicate the whole add/update/delete matrix. It should extend the existing API-level contract at the specific authorization boundaries Phase 2 did not explicitly prove.

## Current Authorization Shape

Profiles define family users as catalog writers and guest as read/search only:

- `src/lib/profiles.ts:26-30` defines family capabilities as `catalog:read`, `catalog:search`, and `catalog:write`.
- `src/lib/profiles.ts:32-35` defines guest capabilities as `catalog:read` and `catalog:search`.
- `src/lib/profiles.ts:92-96` centralizes capability checks in `profileCan`.

Server-side capability verification is concentrated in `verifyProfileCapability`:

- `src/lib/profileAuthorization.ts:30-32` returns `400` when `profileId` is missing.
- `src/lib/profileAuthorization.ts:34-38` returns `404` for an unknown profile.
- `src/lib/profileAuthorization.ts:40-42` returns `403` when the profile lacks the requested capability.
- `src/lib/profileAuthorization.ts:48-56` returns readable `503` when a family password is required but not configured.
- `src/lib/profileAuthorization.ts:58-67` returns `401` when a family `sessionToken` is missing or invalid.
- `src/lib/profileAuthorization.ts:69` returns the verified profile only after those checks pass.

The catalog mutation routes use that server-side boundary:

- `POST /api/catalog-items` calls `verifyProfileCapability(body, "catalog:write")` before validation or DB mutation at `src/app/api/catalog-items/route.ts:25-31`, then calls `createCatalogItem` with the verified profile at `src/app/api/catalog-items/route.ts:43-46`.
- `PATCH /api/catalog-items/[id]` calls `verifyProfileCapability(body, "catalog:write")` at `src/app/api/catalog-items/[id]/route.ts:45-52`, validates the route id/body at `src/app/api/catalog-items/[id]/route.ts:54-61`, and returns `404` when the target row is missing at `src/app/api/catalog-items/[id]/route.ts:63-70`.
- `DELETE /api/catalog-items/[id]` first calls `verifyProfileCapability(body, "catalog:write")` at `src/app/api/catalog-items/[id]/route.ts:92-99`, then separately requires configured admin password and a valid admin token at `src/app/api/catalog-items/[id]/route.ts:101-118`, validates the route id at `src/app/api/catalog-items/[id]/route.ts:120-127`, and deletes by id at `src/app/api/catalog-items/[id]/route.ts:129-136`.

The lower catalog library also rejects non-writers for create/update:

- `src/lib/catalog.ts:134-140` throws if the actor cannot create.
- `src/lib/catalog.ts:171-177` throws if the actor cannot update.
- `src/lib/catalog.ts:196-206` deletes strictly by `input.id`; delete relies on the route for authorization.

UI hiding exists, but it is not the authorization boundary:

- `src/components/AddCatalogItemForm.tsx:37-39` hides add controls for non-writers, then sends `profileId` and `sessionToken` in the POST body at `src/components/AddCatalogItemForm.tsx:47-60`.
- `src/components/UpdateCatalogItemForm.tsx:39-41` hides update controls for non-writers, then sends `profileId` and `sessionToken` in the PATCH body at `src/components/UpdateCatalogItemForm.tsx:50-62`.
- `src/components/DeleteCatalogItemForm.tsx:74-80` hides delete unless hydrated, admin token exists, and the profile has `catalog:write`; the request still sends `profileId`, `sessionToken`, and `adminToken` at `src/components/DeleteCatalogItemForm.tsx:95-105`.
- `src/components/ProfileGate.tsx` stores and refreshes client-side session evidence in `localStorage`, so stale storage is a valid concern, but server routes remain the decisive boundary.

## Existing Checks

`package.json:8-11` currently exposes:

- `npm.cmd run check:catalog`
- `npm.cmd run check:catalog-api`
- `npm.cmd run check:smoke`
- `npm.cmd run check:profiles`

`scripts/check-profiles.mjs` already proves the static profile contract:

- `scripts/check-profiles.mjs:31-43` asserts four family profiles and one guest.
- `scripts/check-profiles.mjs:54` asserts no profile has `admin:delete`.
- `scripts/check-profiles.mjs:57-62` asserts each family profile requires the family password and can read/search/write.
- `scripts/check-profiles.mjs:64-69` asserts guest uses stable id `guest`, does not require the family password, can read/search, and cannot write.

`scripts/check-catalog-api.mjs` already covers most Phase 3 behavior at the HTTP/API + durable DB boundary:

- It obtains real family/admin sessions through public endpoints at `scripts/check-catalog-api.mjs:211-254`.
- It mutates a contract-owned row only, then reads back durable DB state with `assertCatalogItemById` at `scripts/check-catalog-api.mjs:155-180`.
- It asserts unchanged state after failed writes with `assertItemUnchanged` at `scripts/check-catalog-api.mjs:199-201`.
- It cleans only contract-owned rows by run id/title pattern at `scripts/check-catalog-api.mjs:203-209`.
- It asserts guest create is `403` at `scripts/check-catalog-api.mjs:489-499`.
- It asserts guest update is `403` and unchanged at `scripts/check-catalog-api.mjs:537-548`.
- It asserts guest delete is `403` and unchanged at `scripts/check-catalog-api.mjs:592-598`.
- It asserts delete without admin token is `401` and unchanged at `scripts/check-catalog-api.mjs:608-614`.
- It asserts delete with invalid admin token is `401` and unchanged at `scripts/check-catalog-api.mjs:616-625`.
- It asserts missing-row delete is `404` without changing the contract row at `scripts/check-catalog-api.mjs:627-636`.
- It asserts successful delete returns the same item id/title and removes only that contract row while seed rows still exist at `scripts/check-catalog-api.mjs:638-644`.

This means the Phase 3 plan should explicitly treat part of Risk #4 and Risk #6 as already covered by Phase 2.

## Risk #4 Grounding: Guest Can Perform Write/Delete Actions

Verified guidance:

- Correct: hidden buttons are not authorization. UI hides add/update/delete controls, but every mutation route also checks `catalog:write` server-side before mutating.
- Correct: contract/integration is the cheapest useful layer. Existing `check:catalog-api` already uses real HTTP routes, real session endpoints, and DB readback.
- Correct: over-mocking auth helpers would be misleading. The useful evidence is public sessions plus route behavior, not hand-built tokens or mocked profile objects.

Current coverage:

- Static profile shape: `check:profiles` proves guest lacks `catalog:write`.
- API boundary: `check:catalog-api` proves guest create/update/delete return `403`, and update/delete do not change the contract row.

Remaining useful gaps:

- Cross-profile token mismatch: obtain a real token for `family-1`, then send it with `profileId: "family-2"` and prove create/update/delete reject with `401` and leave DB state unchanged. This catches stale/tampered localStorage where the profile id and token no longer match.
- Admin-token-only is insufficient: send a valid `adminToken` without profile evidence and prove delete still fails at the profile boundary and leaves the row unchanged. Phase 2 tested `{}` without admin token; it did not prove admin unlock alone cannot authorize delete.
- Guest plus valid admin token is insufficient: send `profileId: "guest"` with a valid `adminToken` and prove delete is `403` and leaves the row unchanged. Phase 2 tested guest delete without admin token; it did not prove valid admin evidence cannot upgrade a guest profile.

Cheapest layer:

- Extend `scripts/check-catalog-api.mjs`. It already has the base URL, env loading, public session helpers, error assertions, contract-owned row, and durable unchanged readback helpers.
- Do not add a browser/e2e test for Phase 3. The server routes are the risk boundary, and Phase 4 is already reserved for minimal UI/e2e wiring.

Misleading hot-spot evidence:

- `ProfileGate.tsx` and form components are useful context for stale localStorage and hidden controls, but they are not the authorization boundary. Treat them as symptom/trigger locations, not the proof layer.

## Risk #6 Grounding: Admin Delete Wrong Item or Unsafe Failure

Verified guidance:

- Correct: title/card position should never be identity. The delete route receives an id from the URL and `deleteCatalogItem` deletes `WHERE id = ${input.id}`.
- Correct: safe rejection cases must include authorization failures and missing rows, with side effects asserted.
- Correct: broad e2e delete would be too expensive and less precise at this stage.

Current coverage:

- Phase 2 already proves stable-id happy delete by comparing `deletedItem.id` with `createdItem.id`, then proving the created row is gone and seed rows still exist.
- Phase 2 already proves missing-row delete returns `404` and leaves the contract row unchanged.
- Phase 2 already proves missing/invalid admin token rejections leave the contract row unchanged.

Remaining useful gaps:

- Delete authorization order and composition: a valid admin token alone should not delete, and guest+valid admin token should not delete. These prove destructive work requires both a verified family writer and admin unlock, not merely one credential.
- Cross-profile token mismatch for delete: a stale/tampered family profile id paired with another family profile's token should fail before admin delete and leave the row unchanged.

Cheapest layer:

- Extend `scripts/check-catalog-api.mjs` negative delete matrix. Reusing the existing row and readback helper gives direct side-effect evidence at minimal cost.
- No separate `check:authorization` command is needed unless the script becomes difficult to scan. A separate command would duplicate setup and cleanup while testing the same route boundary.

Backport/correction:

- `context/foundation/test-plan.md` remains directionally correct, but Phase 3 planning should acknowledge that Phase 2 already covers a meaningful part of #4/#6. The Phase 3 implementation should be additive and narrow: capability-boundary gaps plus cookbook §6.3, not a second mutation-contract rollout.

## Recommended Plan Input

Use the existing `check:catalog-api` command as the Phase 3 implementation target.

Recommended test additions:

1. Add a second family session helper call for `family-2` or parameterize `getFamilySession(profileId, password)`.
2. Build `mismatchedFamilyEvidence` from `profileId: "family-2"` plus the `family-1` token.
3. Add create/update/delete failures for mismatched family evidence, asserting `401` and unchanged state for update/delete.
4. Add delete failure with `{ adminToken: validAdminToken }`, asserting `400` and unchanged state.
5. Add delete failure with `{ ...guestEvidence, adminToken: validAdminToken }`, asserting `403` and unchanged state.
6. Keep all assertions token-opaque; do not decode or mirror HMAC internals.
7. Update `context/foundation/test-plan.md` §6.3 with the shipped authorization-boundary pattern and mark Phase 3 status through the normal rollout states.

Verification to run after implementation:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:profiles`
- `npm.cmd run check:catalog`
- start local app server
- `npm.cmd run check:catalog-api`

If runtime cost needs trimming, `check:profiles` plus `check:catalog-api` is the minimum direct signal for Phase 3, but build/lint remain repository gates.

## Downstream Handoff

Suggested next command:

```text
/10x-plan testing-authorization-regression-boundary

Plan rollout Phase 3 of context/foundation/test-plan.md. Read research.md and change.md fully. Risks covered: #4 Guest can perform write or delete actions, #6 Admin delete removes the wrong item or fails without a safe rejection. Test types: contract + integration. Hot-spot scope: src, scripts.

Risk response guidance from the test plan and research:

- Risk #4: prove guest evidence is rejected for add/update/delete while family/admin evidence is required for destructive work; required context: server routes, not hidden UI, are the authorization boundary. `check:profiles` already proves guest lacks `catalog:write`; Phase 2 `check:catalog-api` already proves guest create/update/delete fail and preserve durable state. Phase 3 should add the missing API-boundary cases: cross-profile family token mismatch, admin-token-only delete rejection, and guest+valid-admin-token delete rejection. Avoid UI-only permission tests, mocked auth helper tests, hard-coded secrets, or token/HMAC introspection.
- Risk #6: prove delete requires both stable item id and the composed family-writer + admin-unlock evidence; required context: Phase 2 already proves successful delete by id, missing-row `404`, missing/invalid admin token rejection, durable readback, and seed rows unchanged. Phase 3 should extend the negative delete matrix for admin-token-only, guest+admin, and cross-profile stale/tampered family evidence, with unchanged-row assertions. Avoid broad e2e delete, title/card-position identity, or duplicating Phase 2 mutation coverage.

Plan sub-phases by cost x signal and risk priority. Prefer extending `scripts/check-catalog-api.mjs` over adding a separate authorization script unless planning finds a concrete maintainability reason to split. Each sub-phase must state behavior asserted, regression caught, research source, edge/error/boundary case, and anti-pattern avoided. Include a final sub-phase that updates context/foundation/test-plan.md §6.3 with the shipped guest/family/admin capability-boundary pattern and records the Phase 3 rollout status.
```
