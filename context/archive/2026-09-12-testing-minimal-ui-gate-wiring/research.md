---
date: 2026-09-12T01:12:51.3036501+02:00
researcher: Codex
git_commit: c4b80b9dc0e07d882b33bc79ba648e6a2463b239
branch: main
repository: family-shelf
topic: "Minimal UI and gate wiring rollout research"
tags: [research, testing, e2e, ui, gates]
status: complete
last_updated: 2026-09-12
last_updated_by: Codex
---

# Research: Minimal UI and gate wiring rollout

**Date**: 2026-09-12T01:12:51.3036501+02:00  
**Researcher**: Codex  
**Git Commit**: c4b80b9dc0e07d882b33bc79ba648e6a2463b239  
**Branch**: main  
**Repository**: family-shelf

## Research Question

Ground rollout Phase 4 of `context/foundation/test-plan.md`: "Minimal UI and gate wiring". Risks covered: #1 production family/admin login breaks, #2 family user enters the app but cannot view the item catalog, #3 catalog list/search/status update regresses and current state becomes untrustworthy, and #4 guest can perform write/delete actions. Identify the cheapest useful UI/e2e layer and gate wiring without adding pixel-perfect visual coverage for every screen.

## Summary

Phase 4 should add the first browser-level test layer, but keep it deliberately tiny. Earlier phases already cover API/session contracts, durable catalog mutations, authorization composition, and production-ish smoke. The remaining gap is browser behavior that only appears after client hydration: selecting a profile in `ProfileGate`, storing/revalidating localStorage sessions, navigating into `/items`, submitting the search form, and seeing guest/family/admin controls appear or remain hidden.

The cheapest useful layer is a minimal Playwright suite plus package/docs gate wiring. There is currently no test runner dependency or e2e command in `package.json`, and no `.github` workflow directory was found, so "gate wiring" should start with package scripts and deployment/test-plan documentation rather than inventing CI infrastructure from scratch.

Recommended minimal browser coverage:

- family login via the UI reaches `/items` and sees a known seed title;
- search via the UI filters to a known seed item;
- family user can see add/update affordances, proving the hydrated profile context enables write controls;
- guest login reaches `/items`, sees readable catalog/search, and does not see add/update/delete affordances;
- admin unlock via `/admin` makes delete controls visible for a family session, without actually deleting production/shared rows.

Avoid broad e2e mutation flows and pixel-perfect visual assertions. Durable add/update/delete and destructive authorization are already covered by `check:catalog`, `check:catalog-api`, and `check:profiles`.

## Detailed Findings

### App-wide login/profile gate is browser-only

`ProfileGate` wraps every route from `src/app/layout.tsx:2` and `src/app/layout.tsx:14`, so true user entry is a client-side flow. The gate stores the active profile session in localStorage under `family-shelf:selected-profile` (`src/components/ProfileGate.tsx:28`). On hydration it reads localStorage, revalidates family sessions through `/api/profile-session`, refreshes valid payloads, and clears invalid storage (`src/components/ProfileGate.tsx:61`, `src/components/ProfileGate.tsx:71`, `src/components/ProfileGate.tsx:86`, `src/components/ProfileGate.tsx:89`, `src/components/ProfileGate.tsx:96`, `src/components/ProfileGate.tsx:99`).

Initial profile selection is also browser-only: the form posts to `/api/profile-session`, stores the returned profile/session payload, and then renders the app shell (`src/components/ProfileGate.tsx:115`, `src/components/ProfileGate.tsx:135`, `src/components/ProfileGate.tsx:155`). The visible topbar distinguishes family vs guest and write access with "Catalog updates allowed" or "Read-only" (`src/components/ProfileGate.tsx:170`, `src/components/ProfileGate.tsx:173`, `src/components/ProfileGate.tsx:176`). The login screen exposes "Choose your profile", family/guest radio options, and "Enter app" (`src/components/ProfileGate.tsx:198`, `src/components/ProfileGate.tsx:224`, `src/components/ProfileGate.tsx:251`).

This is exactly the gap left by prior phases: endpoint smoke can prove credentials work, but it cannot prove the hydrated UI uses those credentials to enter the app.

### `/items` UI combines server data with hydrated controls

`/items` server-renders catalog data by calling `searchCatalogItems` or `listCatalogItems` based on the `q` search param (`src/app/items/page.tsx:25`, `src/app/items/page.tsx:26`). It renders the "Item catalog" shell, search form, count text, item status labels, and the add/update/delete components (`src/app/items/page.tsx:30`, `src/app/items/page.tsx:33`, `src/app/items/page.tsx:34`, `src/app/items/page.tsx:40`, `src/app/items/page.tsx:66`, `src/app/items/page.tsx:69`, `src/app/items/page.tsx:70`).

`CatalogSearchForm` is a plain GET form to `/items`, so an e2e test can assert browser navigation/search without any DB mutation (`src/components/CatalogSearchForm.tsx:7`). `ProfileAccessNotice` is a compact UI oracle for family vs guest capability: family can add/update and guest can browse/search only (`src/components/ProfileAccessNotice.tsx:1` through `src/components/ProfileAccessNotice.tsx:17` from full read).

Cheapest meaningful UI coverage for Risk #2 and #3 is therefore: log in as family, open `/items`, assert "Item catalog" plus a known seed title such as Dune/Catan/Hades, submit a search, and assert the filtered result/count changes. The durable data/search semantics remain covered by `check:catalog` and `check:catalog-api`; browser e2e should only prove the real user path can reach and operate the UI.

### Guest UI boundary is visible but not sufficient authorization

Guest write prevention appears in the UI through hidden controls:

- `AddCatalogItemForm` returns `null` unless the active session profile includes `catalog:write` (`src/components/AddCatalogItemForm.tsx:37` from prior Phase 3 research).
- `UpdateCatalogItemForm` does the same for status updates (`src/components/UpdateCatalogItemForm.tsx:39` from prior Phase 3 research).
- `DeleteCatalogItemForm` requires hydration, an admin token, and a `catalog:write` profile before rendering (`src/components/DeleteCatalogItemForm.tsx:74` through `src/components/DeleteCatalogItemForm.tsx:80` from prior Phase 3 research).

Phase 3 already proved server-side authorization, so Phase 4 should not pretend hidden UI controls are the security boundary. The useful browser assertion is narrower: a guest can enter `/items`, see catalog/search, see "Read-only" or the guest notice, and not see "Add item", "Save state", or "Delete item". This catches accidental UI regressions without replacing server-side auth tests.

### Admin unlock UI controls delete visibility through localStorage

`AdminUnlockPanel` stores admin unlock in localStorage using `ADMIN_SESSION_STORAGE_KEY`, revalidates stored tokens through `/api/admin-session`, and clears invalid stored tokens (`src/components/AdminUnlockPanel.tsx:6`, `src/components/AdminUnlockPanel.tsx:23`, `src/components/AdminUnlockPanel.tsx:34`, `src/components/AdminUnlockPanel.tsx:45`, `src/components/AdminUnlockPanel.tsx:47`, `src/components/AdminUnlockPanel.tsx:50`). Unlock submission posts the admin password, stores the returned token, and renders "Admin mode unlocked" with a "Go to items" link (`src/components/AdminUnlockPanel.tsx:69`, `src/components/AdminUnlockPanel.tsx:85`, `src/components/AdminUnlockPanel.tsx:112`, `src/components/AdminUnlockPanel.tsx:122`).

`DeleteCatalogItemForm` independently reads/revalidates the same admin token before showing delete controls (`src/components/DeleteCatalogItemForm.tsx:37`, `src/components/DeleteCatalogItemForm.tsx:46`, `src/components/DeleteCatalogItemForm.tsx:57`, `src/components/DeleteCatalogItemForm.tsx:59`, `src/components/DeleteCatalogItemForm.tsx:62`). A focused e2e can unlock admin, go to items as a family profile, and assert "Delete item" appears. It should not actually click delete in this phase because Phase 2/3 already cover durable delete behavior and safe rejections with contract-owned rows.

### Existing gates and runner gap

`package.json` currently has `dev`, `build`, `check:catalog`, `check:catalog-api`, `check:smoke`, `check:profiles`, `start`, and `lint`, but no e2e/test runner command and no Playwright/Vitest/Jest dependency (`package.json:6` through `package.json:13`, `package.json:15`, `package.json:31`). The test plan explicitly notes no e2e runner yet and says a future Playwright layer may be added when browser verification is needed (`context/foundation/test-plan.md:93`, `context/foundation/test-plan.md:104`, `context/foundation/test-plan.md:120`).

No `.github` directory exists in the current repo scan, so CI wiring is not locally present. Deployment docs already list the manual/runbook gate order, including `check:catalog-api` and `check:smoke` (`docs/deployment.md:27`, `docs/deployment.md:31`, `docs/deployment.md:42`, `docs/deployment.md:46`, `docs/deployment.md:49`). Phase 4 gate wiring should therefore add package scripts and docs/cookbook updates first. If CI is added later, it can consume the same commands.

### Existing smoke/contract coverage should not be duplicated

`check:smoke` already posts valid/wrong family/admin credentials to session endpoints and fetches `/items` HTML, asserting `HTTP 200`, "Item catalog", and at least one stable seed title. This protects production env and server-rendered catalog data, but not browser localStorage/hydration/profile UI behavior.

`check:catalog` owns direct DB/schema/search/mutation behavior, and `check:catalog-api` owns API mutation/authorization readback. Phase 4 should not mutate rows via the browser except possibly a future disposable-row suite; that would add cost and flakiness without a new high-value risk.

## Code References

- `src/app/layout.tsx:14` - App routes are wrapped by `ProfileGate`, making browser profile entry part of the real user flow.
- `src/components/ProfileGate.tsx:28` - Profile session localStorage key.
- `src/components/ProfileGate.tsx:61` - Hydration reads stored profile session.
- `src/components/ProfileGate.tsx:71` - Stored family sessions are revalidated through `/api/profile-session`.
- `src/components/ProfileGate.tsx:115` - Initial profile login posts to `/api/profile-session`.
- `src/components/ProfileGate.tsx:135` - Successful profile login stores returned payload in localStorage.
- `src/components/ProfileGate.tsx:170` - Topbar displays selected profile.
- `src/components/ProfileGate.tsx:176` - Topbar displays write/read-only capability.
- `src/app/items/page.tsx:25` - Search path calls `searchCatalogItems`.
- `src/app/items/page.tsx:26` - Default path calls `listCatalogItems`.
- `src/app/items/page.tsx:30` - Items page renders "Item catalog".
- `src/app/items/page.tsx:33` - Add form is part of items page.
- `src/app/items/page.tsx:34` - Search form is part of items page.
- `src/app/items/page.tsx:69` - Update form is rendered per item.
- `src/app/items/page.tsx:70` - Delete form is rendered per item.
- `src/components/AdminUnlockPanel.tsx:69` - Admin unlock form posts to `/api/admin-session`.
- `src/components/AdminUnlockPanel.tsx:85` - Successful admin unlock stores admin token.
- `src/components/DeleteCatalogItemForm.tsx:37` - Delete UI reads stored admin token.
- `src/components/DeleteCatalogItemForm.tsx:46` - Delete UI revalidates stored admin token.
- `package.json:6-13` - Current script set lacks an e2e command.
- `context/foundation/test-plan.md:120` - Critical login/catalog e2e becomes required after Phase 4.
- `docs/deployment.md:41-46` - Current verification order includes existing scripts but no browser e2e.

## Architecture Insights

- Browser state is intentionally localStorage-based. That is cheap for the product, but it means contract/smoke scripts cannot fully replace one small browser e2e.
- The UI has good stable text hooks already: "Choose your profile", "Enter app", "Item catalog", "Search catalog", "Add item", "Save state", "Read-only", "Admin mode unlocked", and "Delete item". A minimal Playwright suite can avoid adding test IDs at first.
- The existing layered test strategy is now strong enough to keep e2e narrow. Use browser e2e only for hydrated navigation and visible affordance checks; keep data correctness and server authorization in scripts.
- Gate wiring should be command-first: add `check:e2e` or similar package script, document local server/env prerequisites, and update `context/foundation/test-plan.md` section 6.4. There is no local CI workflow to wire yet.

## Historical Context

- `context/changes/testing-critical-access-catalog-smoke/research.md` explicitly deferred full browser login-to-items coverage to Phase 4 after adding endpoint/server smoke.
- `context/changes/testing-critical-access-catalog-smoke/plan.md` shipped `check:smoke` as production-facing endpoint and `/items` HTML smoke, with a known seed-title assertion.
- `context/changes/testing-catalog-mutation-contracts/plan.md` and implementation shipped `check:catalog-api` for HTTP mutation contracts with durable DB readback, so Phase 4 does not need browser mutation persistence coverage.
- `context/changes/testing-authorization-regression-boundary/research.md` and implementation established that hidden UI controls are not the authorization boundary; Phase 4 should use UI checks only as visible affordance regressions.
- `docs/deployment.md` already documents the existing script gate order and production smoke behavior, making it the likely place to add the browser e2e command once shipped.

## Related Research

- `context/changes/testing-critical-access-catalog-smoke/research.md`
- `context/changes/testing-catalog-mutation-contracts/research.md`
- `context/changes/testing-authorization-regression-boundary/research.md`

## Open Questions

- Should Phase 4 install Playwright (`@playwright/test`) as the first e2e runner, or keep using ad hoc browser automation outside package scripts? Research favors Playwright because Phase 4 needs a repeatable gate, not a one-off manual check.
- Should the e2e default target be local-only (`localhost`) with production covered by `check:smoke`, or should it support a base URL override for preview environments? Research favors local default with an override.
- Should admin unlock e2e assert delete button visibility only, or create/delete a disposable item through the UI? Research favors visibility only for Phase 4 because durable delete behavior is already covered by API contracts.

## Recommended Plan Input

Plan Phase 4 as a small e2e/gate rollout:

1. Add Playwright and a `check:e2e` package command if accepted during planning.
2. Configure e2e to target local app by default with a base URL override.
3. Add a family login-to-items/search smoke that asserts known seed data and search behavior.
4. Add a guest read-only UI smoke that asserts catalog/search visibility and absence of add/update/delete controls.
5. Add an admin unlock visibility smoke that asserts delete controls appear after family login plus admin unlock, without clicking delete.
6. Update deployment docs and `context/foundation/test-plan.md` §6.4 with the minimal e2e pattern and gate order.

Avoid:

- pixel-perfect visual assertions;
- full browser add/update/delete persistence checks;
- production destructive browser tests;
- replacing existing `check:smoke`, `check:catalog`, `check:catalog-api`, or `check:profiles`.

## Downstream Handoff

Suggested next command:

```text
/10x-plan testing-minimal-ui-gate-wiring

Plan rollout Phase 4 of context/foundation/test-plan.md. Read research.md and change.md fully. Risks covered: #1 Production family/admin login breaks, #2 Family user enters the app but cannot view the item catalog, #3 Catalog list/search/status update regresses and current state becomes untrustworthy, #4 Guest can perform write or delete actions. Test types: e2e + gates. Hot-spot scope: src, scripts, package/docs.

Risk response guidance from the test plan and research:

- Risk #1: prior `check:smoke` already protects env-backed session endpoints and server `/items` smoke; Phase 4 should add only browser proof that profile selection/hydration can enter the app. Do not duplicate endpoint credential matrices.
- Risk #2: prove the browser family flow reaches `/items` and sees a known seed item after profile login; avoid DOM-only shell assertions that do not prove readable catalog data.
- Risk #3: add the smallest browser-level search/current-state confidence, likely a search form flow against known seed data; leave durable mutation readback to `check:catalog` and `check:catalog-api`.
- Risk #4: prove visible guest UI boundaries align with server-side auth by asserting guest can browse/search but does not see add/update/delete controls; keep server authorization proof in `check:catalog-api`.

Plan sub-phases by cost x signal and risk priority. Decide whether to introduce Playwright as the repeatable e2e runner and how to wire `check:e2e` into docs/gates. Keep the e2e suite minimal: family login-to-items/search, guest read-only affordances, and admin unlock/delete-control visibility without destructive browser deletion. Include a final sub-phase that updates `context/foundation/test-plan.md` §6.4 and deployment docs with the shipped e2e pattern.
```
