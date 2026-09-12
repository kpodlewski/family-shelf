# Minimal UI and Gate Wiring - Plan Brief

> Full plan: `context/changes/testing-minimal-ui-gate-wiring/plan.md`
> Research: `context/changes/testing-minimal-ui-gate-wiring/research.md`

## What & Why

This plan ships Phase 4 of the test rollout: a minimal browser e2e layer plus gate documentation. Earlier phases already cover server/API/database risks; this phase closes the remaining browser-only gap around profile selection, localStorage hydration, visible catalog search, guest read-only UI, and admin unlock visibility.

## Starting Point

The project has script-based gates for profiles, catalog DB, catalog API, and production smoke. It has no e2e runner or `check:e2e` command, and no local CI workflow to wire.

## Desired End State

Playwright runs three focused browser flows against a local app by default: family login/items/search, guest read-only catalog UI, and family plus admin unlock delete-control visibility. Docs and the test-plan cookbook explain the gate and its limits.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Runner | Playwright | Repeatable browser gate with familiar Next.js support. | User + Research |
| Target | Local default + base URL override | Safe default, still allows preview checks when intentional. | User + Research |
| Admin test | Visibility only | Proves UI wiring without destructive browser delete. | User + Research |
| Scope | Three minimal specs | Covers risks #1-#4 without broad UI testing. | User + Research |
| Data | Seed titles only | Reuses `check:catalog` and avoids e2e-created rows. | Research |

## Scope

**In scope:**

- Add Playwright dev dependency/config.
- Add `npm.cmd run check:e2e`.
- Add family login/items/search e2e.
- Add guest read-only affordance e2e.
- Add admin unlock delete-control visibility e2e.
- Update deployment docs and test-plan §6.4.

**Out of scope:**

- Pixel-perfect screenshots.
- Browser add/update/delete persistence.
- Production destructive browser tests.
- New CI workflow creation.
- Replacing existing contract/smoke scripts.

## Architecture / Approach

Playwright specs target `FAMILY_SHELF_E2E_BASE_URL ?? "http://localhost:3000"` and use env-backed family/admin passwords. Tests exercise visible UI flows rather than internal token helpers, and they rely on existing seed data prepared by `check:catalog`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Playwright Harness And Command | Runner, config, command, helpers | E2E must be repeatable, not manual-only. |
| 2. Family Login And Catalog Search E2E | Family enters app, sees seed data, searches | Login passing must lead to readable catalog UI. |
| 3. Guest And Admin Visibility Boundaries | Guest read-only UI and admin delete visibility | Visible controls must align with capability state. |
| 4. Gate Docs And Cookbook | Docs, cookbook, final gates | Future agents must run the right checks. |

**Prerequisites:** configured `.env.local`, seeded catalog via `check:catalog`, local app server for e2e/API checks.

**Estimated effort:** 3-4 sessions across 4 phases.

## Open Risks & Assumptions

- Installing Playwright may require network approval and browser binaries.
- E2E requires the local app server to be running unless implementation chooses Playwright webServer orchestration.
- Seed title assertions depend on `check:catalog`.

## Success Criteria (Summary)

- `check:e2e` passes for family login/search, guest read-only UI, and admin unlock visibility.
- Existing gates still pass.
- Test-plan §6.4 and deployment docs explain minimal e2e usage and exclusions.
