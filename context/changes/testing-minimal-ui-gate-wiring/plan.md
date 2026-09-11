# Minimal UI and Gate Wiring Implementation Plan

## Overview

Ship rollout Phase 4 from `context/foundation/test-plan.md`: add the smallest repeatable browser e2e layer and gate wiring that protects critical login/catalog UI flows without turning the project into a pixel-perfect UI suite. This phase introduces Playwright as the first browser runner, keeps production env/server smoke in `check:smoke`, and leaves durable data and authorization proof in the existing contract scripts.

## Current State Analysis

- `check:smoke` already protects production-facing profile/admin endpoints and server-rendered `/items` HTML with known seed titles.
- `check:catalog`, `check:catalog-api`, and `check:profiles` already protect durable catalog state, HTTP mutation boundaries, and guest/family/admin server authorization.
- The remaining gap is browser-only behavior: `ProfileGate` hydration, localStorage session persistence, real profile selection, UI search navigation, guest read-only affordances, and admin unlock visibility.
- There is no current e2e runner, no `check:e2e` command, and no local `.github` workflow to wire. Gate wiring should start with package scripts and docs.

## Desired End State

The project has a minimal Playwright setup and a `npm.cmd run check:e2e` command that runs against a local app by default with a base URL override for intentional preview/local targets. The suite covers exactly three critical browser paths: family login to items/search, guest read-only catalog visibility, and family plus admin unlock delete-control visibility without clicking delete. Deployment docs and the test plan cookbook describe when to run the e2e gate and what it deliberately does not cover.

## Key Decisions

| Decision | Choice | Why | Source |
|---|---|---|---|
| Runner | Playwright | Phase 4 needs a repeatable browser gate, not an ad hoc manual check. | User 1a + research |
| Targeting | Local default with base URL override | Local is safest by default; override allows intentional preview checks. | User 2a + research |
| Admin flow | Visibility only | Proves UI wiring without destructive browser actions or duplicated API delete coverage. | User 3a + research |
| E2E scope | Three minimal specs | Covers risks #1-#4 without pixel-perfect or broad mutation coverage. | User 4a + research |
| Data oracle | Stable seed titles | Reuses existing `check:catalog` seed contract and avoids browser-created rows. | Research |

## What We're NOT Doing

- No pixel-perfect visual tests.
- No browser add/update/delete persistence suite.
- No production destructive browser tests.
- No replacement for `check:smoke`, `check:catalog`, `check:catalog-api`, or `check:profiles`.
- No CI workflow creation unless a workflow directory exists or the user explicitly asks later.
- No full authentication/security test suite beyond the private-family MVP.

## Architecture / Approach

Add Playwright configuration and e2e specs under a dedicated e2e/test directory. Use environment-backed passwords already available through `.env.local` or the shell. Point Playwright at `FAMILY_SHELF_E2E_BASE_URL ?? "http://localhost:3000"`. Keep tests read-only except for localStorage/session state created by the browser itself. Run `check:catalog` before e2e when seed rows may be missing.

## Phase 1: Playwright Harness And Command

### Overview

Introduce the repeatable browser runner and package command without yet asserting every critical flow.

### Changes Required

#### 1. Add Playwright dependency and config

**File**: `package.json`, lockfile, `playwright.config.ts`

**Intent**: Establish a stable e2e runner that agents and humans can run the same way.

**Contract**: Add `@playwright/test` as a dev dependency, configure local base URL default `http://localhost:3000`, and support an env override named `FAMILY_SHELF_E2E_BASE_URL`.

#### 2. Add e2e command

**File**: `package.json`

**Intent**: Give the project one canonical browser gate.

**Contract**: Add `check:e2e` that runs Playwright tests. Keep existing scripts unchanged.

#### 3. Add minimal shared e2e helpers

**File**: e2e helper file or spec-local helpers

**Intent**: Keep tests concise without hiding the actual user flow.

**Contract**: Provide small helpers for reading required family/admin passwords from env, choosing a profile through visible controls, and navigating to `/items`. Helpers must not hard-code secrets or bypass the UI by pre-seeding session tokens.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run lint` passes with Playwright files present.
- [ ] `npm.cmd run build` passes with Playwright files present.
- [ ] `npm.cmd run check:e2e` starts Playwright and fails readably if the app server is not running or passwords are missing.

#### Manual Verification

- [ ] Playwright config defaults to local app usage and documents the base URL override in code or comments where helpful.
- [ ] Helpers use env-backed passwords and do not commit raw secrets.
- [ ] No browser test mutates catalog rows in this phase.

## Phase 2: Family Login And Catalog Search E2E

### Overview

Prove a real family profile can enter through the browser, reach `/items`, see readable seed catalog data, and submit a search.

### Changes Required

#### 1. Family profile entry flow

**File**: e2e spec file

**Intent**: Cover the hydration/localStorage gap left by endpoint smoke.

**Contract**: Visit the app, select `Family profile 1`, fill the family password from env, submit "Enter app", then navigate to `/items` through the UI or direct route after the profile is active. Assert the topbar shows family mode and write capability.

#### 2. Catalog data visibility assertion

**File**: e2e spec file

**Intent**: Ensure browser entry reaches readable catalog data, not just the shell.

**Contract**: Assert `/items` shows "Item catalog" and at least one known seed title such as Dune, Catan, or Hades. Failure messaging should point back to `npm.cmd run check:catalog` as the seed prerequisite when practical.

#### 3. Browser search flow

**File**: e2e spec file

**Intent**: Add minimal UI-level confidence for search/current-state behavior.

**Contract**: Fill the visible search input, submit the search, assert the searched seed title remains visible and at least one unrelated seed title is absent or the matching count reflects the filtered state. Do not assert SQL implementation details.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:catalog` passes before e2e.
- [ ] With the local app server running, `npm.cmd run check:e2e` proves family login reaches `/items`.
- [ ] `npm.cmd run check:e2e` proves a known seed title is visible after login.
- [ ] `npm.cmd run check:e2e` proves search filters the visible catalog UI.

#### Manual Verification

- [ ] The test reads like a user flow and does not bypass profile selection with internal token creation.
- [ ] Assertions are based on stable user-visible text, not pixel positions or snapshots.
- [ ] The test does not create, update, or delete catalog rows.

## Phase 3: Guest And Admin Visibility Boundaries

### Overview

Add the two visible UI boundary checks that remain valuable after server-side authorization contracts: guest read-only affordances and admin unlock delete-control visibility.

### Changes Required

#### 1. Guest read-only catalog flow

**File**: e2e spec file

**Intent**: Prove guest can browse/search but does not see write/destructive controls.

**Contract**: Select Guest in the browser, enter the app, open `/items`, assert readable catalog/search UI and a read-only indicator, and assert "Add item", "Save state", and "Delete item" are not visible.

#### 2. Admin unlock visibility flow

**File**: e2e spec file

**Intent**: Prove the browser admin unlock state is wired into delete-control visibility for a family session.

**Contract**: Enter as a family profile, unlock admin mode through `/admin` using the env-backed admin password, navigate to `/items`, and assert at least one "Delete item" control becomes visible. Do not click delete.

#### 3. Keep browser state isolated

**File**: Playwright config/specs

**Intent**: Avoid cross-test leakage from profile/admin localStorage.

**Contract**: Use isolated browser contexts per test or clear relevant storage between tests. Do not rely on test ordering.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run check:e2e` proves guest can view `/items` and search UI.
- [ ] `npm.cmd run check:e2e` proves guest does not see add/update/delete controls.
- [ ] `npm.cmd run check:e2e` proves admin unlock makes delete controls visible for a family session.

#### Manual Verification

- [ ] The guest test is described as visible affordance coverage, not security proof.
- [ ] The admin test does not perform destructive delete.
- [ ] Tests are independent and do not share localStorage state unintentionally.

## Phase 4: Gate Docs And Cookbook

### Overview

Wire the e2e command into project docs and mark the rollout as complete.

### Changes Required

#### 1. Deployment/check documentation

**File**: `docs/deployment.md`

**Intent**: Make the new browser gate runnable by humans and agents.

**Contract**: Document `npm.cmd run check:e2e`, local server prerequisite, `FAMILY_SHELF_E2E_BASE_URL` override, password env requirements, and recommended run order after `check:catalog` and before/alongside `check:smoke`.

#### 2. Test plan quality gate and cookbook update

**File**: `context/foundation/test-plan.md`

**Intent**: Close Phase 4 and teach future contributors the minimal e2e pattern.

**Contract**: Mark Phase 4 complete after implementation; update section 6.4 with the shipped pattern: browser e2e for hydration/profile entry, seed catalog visibility/search, guest read-only affordances, admin delete-control visibility, no pixel-perfect suite, no destructive production browser actions.

#### 3. Final verification pass

**File**: no dedicated file unless docs require one

**Intent**: Prove all gates compose after e2e is introduced.

**Contract**: Run lint, build, check:profiles, check:catalog, check:catalog-api, check:smoke where network/target access is available, and check:e2e with local server running.

### Success Criteria

#### Automated Verification

- [ ] `npm.cmd run lint` passes.
- [ ] `npm.cmd run build` passes.
- [ ] `npm.cmd run check:profiles` passes.
- [ ] `npm.cmd run check:catalog` passes.
- [ ] With the local app server running, `npm.cmd run check:catalog-api` passes.
- [ ] With the local app server running, `npm.cmd run check:e2e` passes.
- [ ] `context/foundation/test-plan.md` section 6.4 no longer contains the Phase 4 TBD placeholder.

#### Manual Verification

- [ ] Deployment docs explain e2e prerequisites and target override.
- [ ] The cookbook makes clear that e2e is minimal UI coverage, not a pixel-perfect suite.
- [ ] The shipped e2e gate does not replace production `check:smoke`.

## Testing Strategy

Automated:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:profiles`
- `npm.cmd run check:catalog`
- Start the local app server.
- `npm.cmd run check:catalog-api`
- `npm.cmd run check:e2e`
- `npm.cmd run check:smoke` when production/preview target access is intentional.

Manual:

1. Inspect e2e specs to confirm they exercise visible user flows and do not use internal token creation.
2. Confirm no raw passwords or tokens are committed or printed.
3. Confirm no e2e test clicks destructive delete.
4. Confirm docs explain local server/base URL requirements.

## Migration Notes

Installing Playwright may add a lockfile change and may require browser installation in developer/CI environments. The plan should keep this explicit: adding the package command is not enough if the browser binary is absent. No application database migration is expected.

## Open Risks And Assumptions

- Network or package install may require approval because Playwright is a new dev dependency.
- Local e2e requires a running app server and configured `.env.local` passwords.
- Seed titles depend on `check:catalog`; e2e should fail readably when seed rows are missing.
- There is no existing CI workflow to wire; package/docs gates are the scope for this change.

## References

- Research: `context/changes/testing-minimal-ui-gate-wiring/research.md`
- Test plan: `context/foundation/test-plan.md` Phase 4
- Profile gate: `src/components/ProfileGate.tsx`
- Items page: `src/app/items/page.tsx`
- Admin unlock panel: `src/components/AdminUnlockPanel.tsx`
- Delete form: `src/components/DeleteCatalogItemForm.tsx`
- Smoke script: `scripts/check-smoke.mjs`
- Deployment docs: `docs/deployment.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `-- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Playwright Harness And Command

#### Automated

- [x] 1.1 `npm.cmd run lint` passes with Playwright files present. (commit `0969e51`)
- [x] 1.2 `npm.cmd run build` passes with Playwright files present. (commit `0969e51`)
- [x] 1.3 `npm.cmd run check:e2e` starts Playwright and fails readably if the app server is not running or passwords are missing. (commit `0969e51`)

#### Manual

- [x] 1.4 Playwright config defaults to local app usage and documents the base URL override in code or comments where helpful. (commit `0969e51`)
- [x] 1.5 Helpers use env-backed passwords and do not commit raw secrets. (commit `0969e51`)
- [x] 1.6 No browser test mutates catalog rows in this phase. (commit `0969e51`)

### Phase 2: Family Login And Catalog Search E2E

#### Automated

- [x] 2.1 `npm.cmd run check:catalog` passes before e2e.
- [x] 2.2 With the local app server running, `npm.cmd run check:e2e` proves family login reaches `/items`.
- [x] 2.3 `npm.cmd run check:e2e` proves a known seed title is visible after login.
- [x] 2.4 `npm.cmd run check:e2e` proves search filters the visible catalog UI.

#### Manual

- [x] 2.5 The test reads like a user flow and does not bypass profile selection with internal token creation.
- [x] 2.6 Assertions are based on stable user-visible text, not pixel positions or snapshots.
- [x] 2.7 The test does not create, update, or delete catalog rows.

### Phase 3: Guest And Admin Visibility Boundaries

#### Automated

- [ ] 3.1 `npm.cmd run check:e2e` proves guest can view `/items` and search UI.
- [ ] 3.2 `npm.cmd run check:e2e` proves guest does not see add/update/delete controls.
- [ ] 3.3 `npm.cmd run check:e2e` proves admin unlock makes delete controls visible for a family session.

#### Manual

- [ ] 3.4 The guest test is described as visible affordance coverage, not security proof.
- [ ] 3.5 The admin test does not perform destructive delete.
- [ ] 3.6 Tests are independent and do not share localStorage state unintentionally.

### Phase 4: Gate Docs And Cookbook

#### Automated

- [ ] 4.1 `npm.cmd run lint` passes.
- [ ] 4.2 `npm.cmd run build` passes.
- [ ] 4.3 `npm.cmd run check:profiles` passes.
- [ ] 4.4 `npm.cmd run check:catalog` passes.
- [ ] 4.5 With the local app server running, `npm.cmd run check:catalog-api` passes.
- [ ] 4.6 With the local app server running, `npm.cmd run check:e2e` passes.
- [ ] 4.7 `context/foundation/test-plan.md` section 6.4 no longer contains the Phase 4 TBD placeholder.

#### Manual

- [ ] 4.8 Deployment docs explain e2e prerequisites and target override.
- [ ] 4.9 The cookbook makes clear that e2e is minimal UI coverage, not a pixel-perfect suite.
- [ ] 4.10 The shipped e2e gate does not replace production `check:smoke`.
