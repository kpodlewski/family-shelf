# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1-§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-11

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost x signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the
   team is worried about X, and the failure would surface somewhere in
   <area>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* - drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src`, `scripts`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact x likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* - never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence - not anchor) |
|---|---|---|---|---|
| 1 | Production family/admin login breaks, blocking app entry or admin unlock. | High | High | PRD FR-001, FR-003; interview Q1/Q2; production password incident; hot-spot dir `src/components/ProfileGate.tsx` (5 commits/30d) |
| 2 | Family user enters the app but cannot view the item catalog. | High | High | PRD US-01, FR-005, FR-006; roadmap S-02; interview Q1; hot-spot dir `src/app/items` (8 commits/30d) |
| 3 | Catalog list/search/status update regresses and current state becomes untrustworthy. | High | High | PRD US-01, US-02, FR-005-FR-008; interview Q3; hot-spot dirs `src/lib/catalog.ts` (5 commits/30d), `src/lib/catalogValidation.ts` (4 commits/30d) |
| 4 | Guest can perform write or delete actions. | High | Medium | PRD FR-003, FR-009; interview Q4; roadmap S-01, S-03, S-05; hot-spot dir `src/app/api` (6 commits/30d) |
| 5 | Durable catalog mutations lie or lose state after add/update/delete. | High | Medium | PRD US-02, US-03; roadmap S-03/S-04/S-05; hot-spot `scripts/check-catalog.mjs` (6 commits/30d) |
| 6 | Admin delete removes the wrong item or fails without a safe rejection. | High | Medium | PRD US-03, FR-009; roadmap S-05; admin-delete change status implemented |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Correct env-backed family and admin credentials unlock only the intended sessions; missing/wrong config fails readably. | Local success does not imply production success. | Profile/admin session request path, env/config boundary, token persistence, deployed smoke path. | contract + smoke | Hard-coded secrets, local-only assertions, implementation-mirrored token checks |
| #2 | A valid family session reaches `/items` and receives a non-empty readable catalog from the real data boundary. | Login passing does not prove catalog rendering works. | Catalog page data path, database read boundary, empty/error behavior. | integration + smoke | DOM-only happy path that never proves data was read |
| #3 | Search and status update preserve visible current state across refresh/readback. | UI form state does not prove persisted catalog state. | Search semantics, update mutation, validation, readback contract. | integration | Testing only formatter helpers or copying SQL expectations from implementation |
| #4 | Guest evidence is rejected for add/update/delete while family/admin evidence is required for destructive work. | Hidden buttons are not authorization. | Server-side authorization boundaries, profile capabilities, stale localStorage behavior. | contract + integration | UI-only permission tests, over-mocking auth helpers |
| #5 | Add/update/delete operations change exactly the intended durable row and subsequent list/search reflects it. | Returning 200 does not prove durable state changed correctly. | Database contract, seed/contract rows, cleanup guarantees. | contract script + integration | Brittle ordering, tests that mutate real user rows |
| #6 | Delete targets a stable item id, returns safe errors for missing/unauthorized cases, and does not affect other rows. | Title or visible card position must not be treated as identity. | Delete API evidence, item identity, confirmation flow, not-found path. | integration + focused e2e | Broad end-to-end delete without asserting side effects |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical access and catalog smoke | Prove a valid family/admin path can enter and see the catalog in the cheapest deployed-like way. | #1, #2 | contract + smoke | complete | `context/changes/testing-critical-access-catalog-smoke/` |
| 2 | Catalog mutation contracts | Lock list/search/add/update/delete durable behavior before expanding UI tests. | #3, #5, #6 | contract + integration | complete | `context/changes/testing-catalog-mutation-contracts/` |
| 3 | Authorization regression boundary | Prove guest/family/admin capability rules are enforced server-side, not just hidden in UI. | #4, #6 | contract + integration | implementing | `context/changes/testing-authorization-regression-boundary/` |
| 4 | Minimal UI and gate wiring | Add the smallest UI/e2e layer and required gates that protect login/catalog flows without pixel-perfect coverage. | #1, #2, #3, #4 | e2e + gates | not started | - |

**Status vocabulary** (fixed - parser literals):

| Value | Meaning |
|---|---|
| `not started` | No change folder for this rollout phase yet. |
| `change opened` | `context/changes/<id>/` exists with `change.md`; research not done. |
| `researched` | `research.md` exists in the change folder. |
| `planned` | `plan.md` exists with a `## Progress` section. |
| `implementing` | Progress section has at least one `[x]` and at least one `[ ]`. |
| `complete` | Progress section is fully `[x]`. |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section are grounded in local manifests/configs
plus the tools exposed in the current session.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| framework | Next.js | 16.2.11 | App Router project; current checks are build/lint plus custom scripts. |
| language/runtime | TypeScript / Node | TS 5.6.3 / Node via npm scripts | No dedicated typecheck script beyond `next build` yet. |
| contract checks | Node scripts | n/a | `check:catalog` and `check:profiles` already exist and should become the first risk-bearing layer. |
| unit + integration | none yet - see Phase 2 | n/a | No Vitest/Jest config or test files detected. |
| e2e | none yet - see Phase 4 | n/a | Add only for login/catalog critical flow once cheaper layers land. |
| visual/a11y | none yet - see Phase 4 | n/a | Selective only; no pixel-perfect suite for every screen. |
| AI-native | agent review / browser verification - checked: 2026-09-11 | n/a | Use only when it catches layout/access issues cheaper tests miss. |

**Stack grounding tools (current session):**
- Docs: none - no Context7/framework docs MCP exposed; local manifest used; checked: 2026-09-11
- Search: web search available but not needed for local strategy; checked: 2026-09-11
- Runtime/browser: browser automation MCP not exposed; current verification can use local/dev smoke and future Playwright if added; checked: 2026-09-11
- Provider/platform: Vercel CLI available through `npx vercel`; useful for production env/deploy smoke gates; checked: 2026-09-11

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase <N>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate | Where | Required? | Catches |
|---|---|---|---|
| lint | local + CI | required | syntactic and React/Next lint drift |
| production build | local + CI | required | TypeScript, App Router, server/client boundary drift |
| profile contract | local + CI | required after §3 Phase 1 | broken profile roles/capabilities/login contract |
| catalog contract (`check:catalog` + `check:catalog-api`) | local + CI | required after §3 Phase 2 | durable catalog read/write/delete regressions across DB and HTTP/API boundaries |
| authorization integration | local + CI | required after §3 Phase 3 | guest/family/admin server-side access regressions |
| critical login/catalog e2e | CI on PR or pre-prod smoke | required after §3 Phase 4 | broken app entry and item viewing flow |
| production env smoke (`npm.cmd run check:smoke`) | after deploy | recommended after §3 Phase 1 | missing password/database env vars on Vercel |
| selective visual/a11y check | local/PR for critical screens | optional after §3 Phase 4 | severe login/items layout or accessibility regressions |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD - see §3 Phase <N>."

### 6.1 Adding a profile/login contract test

- **Location**: `scripts/check-smoke.mjs` for production-facing smoke; future lower-level checks can live beside existing `scripts/check-profiles.mjs`.
- **Pattern**: post JSON to `/api/profile-session` and `/api/admin-session`; assert valid configured credentials return `200` with non-secret profile/token payloads, and wrong credentials return `401`.
- **Secret handling**: load `.env.local` only as a local convenience, never print raw passwords, and treat tokens as opaque strings.
- **Run locally**: `npm.cmd run check:smoke`.
- **Anti-patterns**: do not hard-code secrets, decode HMAC token internals, or treat static profile-shape checks as proof that production login works.

### 6.2 Adding a catalog integration test

- **Location**: keep direct database/schema/read-search coverage in `scripts/check-catalog.mjs`; put HTTP mutation boundary coverage in `scripts/check-catalog-api.mjs`.
- **Run order**: run `npm.cmd run check:catalog`, start the app locally, then run `npm.cmd run check:catalog-api`.
- **Targeting**: `check:catalog-api` defaults to `http://localhost:3000`; use `FAMILY_SHELF_CATALOG_API_BASE_URL` only for an intentional local or disposable preview target.
- **Pattern**: obtain profile/admin tokens through `/api/profile-session` and `/api/admin-session`, treat tokens as opaque, mutate only contract-owned rows through `POST /api/catalog-items`, `PATCH /api/catalog-items/[id]`, and `DELETE /api/catalog-items/[id]`, and use database readback as the durable oracle.
- **Cleanup**: wrap mutation checks in cleanup that deletes only rows matching the current `contract-*` run id or title pattern; never update or delete seed/user rows.
- **Negative cases**: include focused auth and validation assertions such as missing/guest/invalid profile evidence, invalid update payloads, missing admin token, invalid admin token, and missing-row delete `404`.
- **Anti-patterns**: do not rely on DOM-only form state, do not mirror token internals or HMAC signatures, do not duplicate only the SQL checks already covered by `check:catalog`, and do not run mutation smoke against production data.

### 6.3 Adding an authorization regression test

TBD - see §3 Phase 3 for guest/family/admin capability boundary patterns.

### 6.4 Adding an e2e test for a critical user flow

TBD - see §3 Phase 4 for login-to-items smoke coverage.

### 6.5 Adding a production smoke check

- **Location**: `scripts/check-smoke.mjs`.
- **Default target**: production at `https://family-shelf-gamma.vercel.app`; use `FAMILY_SHELF_SMOKE_BASE_URL` only when intentionally checking another deployed target.
- **Pattern**: run credential smoke for family/admin session endpoints, then fetch `/items` and assert `HTTP 200`, the catalog shell text, and at least one stable seed title.
- **Seed dependency**: run `npm.cmd run check:catalog` first when seed rows may be missing; the smoke script's seed-title failure should point back to that command.
- **Run order**: `npm.cmd run check:catalog`, then `npm.cmd run check:smoke`.
- **Anti-patterns**: do not use a DOM-only shell assertion as proof of catalog data, and do not remove or mutate production env vars to test negative cases.

### 6.6 Per-rollout-phase notes

TBD - populated as rollout phases ship.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Pixel-perfect visual tests for every screen** - too expensive for this MVP and not the highest risk. Re-evaluate if visual regressions repeatedly block login or item viewing. (Source: Phase 2 interview Q5.)
- **Full authentication/security suite beyond the private-family MVP** - protect guest/family/admin boundaries, but do not build tests for a real login system the PRD excludes. Re-evaluate if multi-family access or real accounts enter scope. (Source: PRD Non-Goals.)
- **Load/performance testing** - expected users, QPS, and data volume are small. Re-evaluate if the catalog becomes large or shared beyond one family. (Source: PRD target scale.)

## 8. Freshness Ledger

- Strategy (§1-§5) last reviewed: 2026-09-11
- Stack versions last verified: 2026-09-11
- AI-native tool references last verified: 2026-09-11

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
