# Search Current Item State - Plan Brief

> Full plan: `context/changes/search-current-item-state/plan.md`

## What & Why

Build the S-02 north star slice for Family Shelf: a user can search the catalog and see the current item status plus note. This turns the existing shared catalog contract into the first everyday useful family workflow.

## Starting Point

`src/lib/catalog.ts` already exposes `searchCatalogItems(query)`, and `/items` already renders all catalog items after profile selection. The missing piece is a user-facing search flow with URL-backed query state, useful result details, and no-result recovery.

## Desired End State

`/items?q=...` filters the catalog by title, kind, borrower, date, or note. The visible catalog page includes a search input, filtered result count, current-state details, and a calm empty state with a clear action. Guest and family profiles can both search; guest remains visibly read-only.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Search scope | Simple text search | Existing `searchCatalogItems` already covers the MVP fields. |
| Query state | URL param `q` | Refreshes and shared links keep the current lookup. |
| Empty results | Empty state plus clear action | Users can recover quickly from no-match searches. |
| Guest access | Search allowed | Guest has `catalog:search`; write restrictions are future-slice work. |
| Verification | Extend `check:catalog` | Keeps checks lightweight and aligned with existing scripts. |

## Scope

**In scope:**

- URL-backed search on `/items`.
- Search form using query param `q`.
- Filtered results via `searchCatalogItems`.
- Current-state result details: status, note, borrower/date when present.
- Empty state with clear-search action.
- Expanded catalog search edge-case checks.

**Out of scope:**

- Fuzzy search, filters, sorting, pagination, ranking, indexing.
- Catalog add/update/delete.
- Persistence, database, or catalog API route.
- New guest restrictions beyond existing read-only signals.
- New full test framework.

## Architecture / Approach

Keep search read-only and route-local. `/items` reads `searchParams.q`, delegates filtering to `src/lib/catalog.ts`, and renders the result list. A small `CatalogSearchForm` submits with GET to `/items`, so the URL remains the source of query state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. URL Search Contract | `/items?q=...` filters through the existing catalog helper | Next.js search param typing can be easy to get slightly wrong. |
| 2. Search Form And Current-State Results | Visible search UI, useful result cards, empty state | UI polish could expand beyond the north star. |
| 3. Verification Coverage And Plan Closeout | Search edge cases in `check:catalog` and final verification | Checks should stay lightweight, not become a test framework. |

**Prerequisites:** F-01 `catalog-state-contract` and S-01 `shared-entry-profile-selection` are implemented.
**Estimated effort:** One short implementation cycle across 3 small phases.

## Open Risks & Assumptions

- `context/foundation/prd.md` is absent; roadmap and completed plans are treated as source of truth.
- Seed data is tiny, so linear search is intentionally enough.
- Future persistence should preserve the `q` URL contract.

## Success Criteria (Summary)

- A user can search from `/items` and refresh/share the filtered URL.
- Results show current status and note/borrower context clearly.
- Guest can search while remaining visibly read-only.
