# Catalog State Contract - Plan Brief

> Full plan: `context/changes/catalog-state-contract/plan.md`

## What & Why

Build the minimum shared catalog state contract for Family Shelf. The current UI has duplicated local mock arrays, so later slices would otherwise disagree about item shape, identity, status, and search behavior.

## Starting Point

The app is a small Next.js App Router project with home, catalog, and admin pages. Catalog data currently lives as duplicated arrays in `src/app/page.tsx` and `src/app/items/page.tsx`, and `formatItemStatus` accepts any string.

## Desired End State

Both home and catalog pages read from one typed catalog repository. Items have stable ids, explicit kinds, MVP-only status values, optional borrower/date/note fields, and read/query helpers that downstream slices can reuse.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Storage boundary | In-memory seed plus typed repository | Keeps F-01 small and avoids pretending serverless memory is durable. |
| Identity | Explicit `id: string` | Supports duplicate titles and future update/delete operations. |
| Item kind | `book`, `board-game`, `video-game` | Matches the domain categories the project needs now. |
| Status | `available` / `borrowed` only | Matches the PRD and removes unsupported `maintenance`. |
| Borrowing fields | Flat optional nullable fields | Simple for UI and aligned with optional borrower/date in the PRD. |
| Operations | Read/query only | Mutations belong to later slices once persistence is decided. |
| UI adoption | Replace both page mocks | Verifies the contract in real screens and removes duplication. |
| Verification | Lightweight contract check | Adds useful safety without installing a full test runner. |

## Scope

**In scope:** shared types, seed data, list/get/search helpers, kind/status formatting, page refactor, lightweight contract check.

**Out of scope:** database, API routes, durable writes, add/update/delete mutations, profile selection, admin auth, full test runner.

## Architecture / Approach

Create a small typed catalog module in `src/lib` that owns seed data and read/query helpers. Pages consume the module instead of defining their own arrays. Formatting helpers turn machine values into UI labels, while the repository stays read-only until later slices introduce persistence.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Shared Catalog Contract | Types, seed data, read/query helpers | Accidentally designing too much storage behavior. |
| 2. UI Adoption And Formatting | Home/catalog use shared data; status is narrowed | Small UI refactor may reveal missing display fields. |
| 3. Lightweight Contract Verification | Scripted checks for ids, kinds, statuses, and search | Node script must stay simple without becoming a test framework. |

**Prerequisites:** existing `context/changes/catalog-state-contract/change.md`, roadmap F-01, current Next app scaffold.  
**Estimated effort:** about 1 focused implementation pass across 3 small phases.

## Open Risks & Assumptions

- In-memory seed data is not durable shared persistence.
- Later write slices must either introduce real persistence or deliberately extend this repository contract.
- Search is intentionally simple linear filtering for MVP scale.

## Success Criteria Summary

- Home and catalog read from the same typed catalog source.
- Catalog items have stable ids, explicit kinds, and only `available` / `borrowed` statuses.
- `npm.cmd run check:catalog`, `npm.cmd run build`, and `npm.cmd run lint` pass.
