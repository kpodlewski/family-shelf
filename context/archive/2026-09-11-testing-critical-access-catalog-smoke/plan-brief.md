# Critical Access And Catalog Smoke - Plan Brief

> Full plan: `context/changes/testing-critical-access-catalog-smoke/plan.md`
> Research: `context/changes/testing-critical-access-catalog-smoke/research.md`

## What & Why

This plan adds the first risk-bearing smoke layer for Family Shelf. It targets the production failure class we already saw: local login works, but production family/admin login or item viewing breaks because env vars, deployment, or data access are wrong.

## Starting Point

Today the project has `check:profiles` for static profile shape and `check:catalog` for direct DB contract coverage. There is no command that proves production accepts family/admin credentials or that `/items` renders real catalog rows through the deployed app.

## Desired End State

`npm.cmd run check:smoke` verifies production session endpoints and the production `/items` page. It loads local `.env.local` credentials when needed, keeps secrets out of output, and asserts `/items` returns a known seed title after `check:catalog`.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Smoke target | Production by default | Protects the real incident class, not only local dev. | User + Research |
| Secret source | Load `.env.local` automatically | Keeps local agent runs easy while still using env-style secrets. | User |
| Items proof | `200` plus known seed title | Proves real catalog data rendered, not only shell HTML. | User + Research |
| Missing env test | Contract-level only | Avoids unsafe production env manipulation. | User + Plan |
| Deliverable | `check:smoke`, docs, cookbook update | Gives a repeatable quality gate and durable guidance. | User + Plan |

## Scope

**In scope:**
- Add `scripts/check-smoke.mjs`.
- Add `check:smoke` package script.
- Verify family/admin session endpoint success and wrong-password rejection.
- Verify production `/items` responds with a known seed title.
- Update deployment docs and `test-plan.md` cookbook entries.

**Out of scope:**
- Full browser e2e setup.
- Visual regression suite.
- Add/update/delete mutation smoke.
- Destructive admin delete smoke.
- Hard-coded secrets or committed credentials.

## Architecture / Approach

Follow the existing script-check pattern rather than introducing a test runner. The smoke script loads env values like `check:catalog`, performs a few production HTTP requests, validates status/body shape, and reports redacted actionable failures.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Session Endpoint Contract Harness | Endpoint smoke for family/admin credentials | Secret leakage or implementation-mirrored checks |
| 2. Production `/items` Catalog Smoke | Production route/data smoke for catalog viewing | Shell-only success without data proof |
| 3. Deployment Documentation And Gate Placement | Docs and quality-gate placement | Operators run checks in wrong order |
| 4. Cookbook Update And Final Verification | Durable test-plan cookbook and full verification | New pattern is forgotten by future agents |

**Prerequisites:** `.env.local` has valid family/admin passwords; production Vercel env vars are set and redeployed; `check:catalog` can seed/verify stable catalog rows.  
**Estimated effort:** ~1 focused implementation session across 4 small phases.

## Open Risks & Assumptions

- Production smoke depends on external network and Vercel availability.
- Known seed title assertion assumes `check:catalog` remains responsible for stable seed rows.
- Loading `.env.local` can mask production drift unless the script targets production after redeploy, which this plan requires by default.

## Success Criteria (Summary)

- `npm.cmd run check:smoke` catches broken production family/admin session credentials.
- `npm.cmd run check:smoke` proves production `/items` renders seeded catalog data.
- Deployment docs and `test-plan.md` explain when and how to use the smoke gate.
