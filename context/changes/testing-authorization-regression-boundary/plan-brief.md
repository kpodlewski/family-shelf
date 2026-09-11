# Authorization Regression Boundary - Plan Brief

> Full plan: `context/changes/testing-authorization-regression-boundary/plan.md`
> Research: `context/changes/testing-authorization-regression-boundary/research.md`

## What & Why

This plan ships rollout Phase 3 from the test plan: prove guest/family/admin capability rules are enforced server-side, not only by hidden UI controls. The focus is narrow because Phase 2 already shipped strong catalog API mutation coverage; Phase 3 closes the remaining authorization composition gaps.

## Starting Point

`check:profiles` already proves profile capability shape, and `check:catalog-api` already exercises real API routes with durable DB readback. Existing Phase 2 coverage proves guest create/update/delete rejection, missing/invalid session rejection, missing/invalid admin-token delete rejection, stable-id delete, and seed-row preservation.

## Desired End State

`check:catalog-api` additionally proves stale/tampered family evidence cannot write or delete, a valid admin token alone cannot delete, and guest evidence plus a valid admin token still cannot delete. The cookbook explains the reusable authorization-boundary pattern for future tests.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Command shape | Extend `check:catalog-api` | It already owns API + DB readback and avoids duplicate harness code. | User + Research |
| Case scope | Only research gaps | Phase 2 already covers the broad mutation matrix. | User + Research |
| Verification | Full gates | Keeps the rollout aligned with repository quality gates. | User |
| Token model | Opaque public tokens | Avoids mirroring HMAC internals. | Research |
| UI scope | No e2e in Phase 3 | Server routes are the risk boundary; Phase 4 owns UI/e2e. | Research |

## Scope

**In scope:**

- Parameterize family session acquisition enough to obtain another real family profile session.
- Add cross-profile token/profile mismatch create/update/delete rejections.
- Add admin-token-only delete rejection.
- Add guest-plus-admin delete rejection.
- Assert unchanged durable state after rejected update/delete attempts.
- Update `context/foundation/test-plan.md` section 6.3.

**Out of scope:**

- New `check:authorization` command.
- Browser/e2e tests.
- Production mutation smoke.
- Repeating the full Phase 2 matrix.
- Token decoding or HMAC implementation checks.

## Architecture / Approach

Keep the work inside `scripts/check-catalog-api.mjs`. Use real public session endpoints to obtain opaque family/admin tokens, compose negative evidence payloads, call the existing catalog mutation endpoints, and use the existing DB readback helpers to prove rejected operations leave the contract row unchanged.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Cross-Profile Session Boundary | Mismatched family profile/token cannot create, update, or delete. | Stale/tampered localStorage becomes write evidence. |
| 2. Admin Token Composition Boundary | Admin token alone and guest+admin cannot delete. | Admin unlock accidentally becomes the whole delete authorization. |
| 3. Cookbook And Rollout Status | Test plan section 6.3 documents the shipped pattern and gates pass. | Future agents repeat UI-only or token-internal tests. |

**Prerequisites:** valid local `.env.local`, a local app server for `check:catalog-api`, and the existing Phase 2 API contract harness.

**Estimated effort:** small, likely 2-3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- The local app server remains externally started for `check:catalog-api`.
- Either direction of family profile/token mismatch is acceptable as long as id and token do not belong together.
- If `check:catalog-api` becomes hard to scan, helper extraction inside the same script is fine; a new command remains out of scope.

## Success Criteria (Summary)

- `check:catalog-api` fails if stale/tampered family evidence can write/delete.
- `check:catalog-api` fails if admin token alone or guest+admin can delete.
- Full gates pass: lint, build, check:profiles, check:catalog, and local check:catalog-api.
