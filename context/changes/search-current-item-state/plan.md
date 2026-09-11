# Search Current Item State Implementation Plan

## Overview

Implement roadmap slice S-02: a family member can search the shared catalog and immediately understand an item's current state and note. This is the project's north star slice, so the plan prioritizes a small, visible search flow over broader catalog polish.

## Current State Analysis

- `context/foundation/roadmap.md` names `search-current-item-state` as S-02 and the product north star.
- `context/foundation/prd.md` is not present in this repo, so roadmap refs and completed foundation plans are the available upstream source of truth.
- `catalog-state-contract` already created `src/lib/catalog.ts` with `listCatalogItems()`, `getCatalogItemById()`, and `searchCatalogItems(query)`.
- `searchCatalogItems(query)` already matches case-insensitively across title, kind search labels, borrower name, borrowed date, and note.
- `src/app/items/page.tsx` currently renders all catalog items with title, kind, note, and status, but it has no search input or URL query handling.
- `shared-entry-profile-selection` wraps the app in `ProfileGate`, exposes the active profile through `useActiveProfile()`, and grants both family and guest profiles `catalog:search`.
- Existing verification is script-based: `npm.cmd run check:catalog`, `npm.cmd run check:profiles`, `npm.cmd run build`, and `npm.cmd run lint`.

## Desired End State

After profile selection, the catalog page lets a family or guest user search by item title, kind, borrower, date, or note. The query lives in the URL as `?q=...`, so refreshes and shared links preserve the result. Results show enough current state to answer "is this available, borrowed, or described by a note?", and no-result searches show a calm empty state with a clear way to reset the query.

### Key Discoveries

- The search repository helper already exists; this slice should adopt it in the UI, not reinvent search logic.
- URL search params fit the north star better than local-only state because a user can refresh or share the current lookup.
- Guest profiles already have `catalog:search`; this slice should not add extra guest blocking.
- There is no durable persistence yet. S-02 should remain read-only and work against the shared seed contract.

## What We're NOT Doing

- No fuzzy search, typo tolerance, ranking engine, indexing, pagination, filters, or sorting.
- No add/update/delete actions.
- No persistence or API route for catalog search.
- No separate guest search restrictions beyond the existing profile capability contract.
- No change to the profile password/session model.
- No full test framework.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Search behavior | Simple text search through `searchCatalogItems(query)` | Uses the existing F-01 contract and keeps S-02 thin. |
| Query persistence | URL search param `?q=...` | Refresh and shared links preserve the current lookup. |
| Empty results | Empty state plus clear-search action | Helps users recover without implying the catalog is broken. |
| Guest behavior | Guest can search normally and sees read-only notice | Guest has `catalog:search`; write restrictions belong to future write slices. |
| Verification | Extend `check:catalog` edge cases plus build/lint | Keeps verification lightweight and aligned with existing project scripts. |

## Search UI Contract

- The catalog route remains `/items`.
- The query parameter is `q`.
- Empty or whitespace-only `q` shows all catalog items.
- Non-empty `q` calls `searchCatalogItems(q)` and renders only matching items.
- Clearing search removes `q` from the URL or navigates back to `/items`.
- The result count reflects the filtered list.
- Item cards continue to show title, kind, status, and note when present.
- Borrowed items should expose borrower/date context when available so search results explain current state, not only title/status.

## Phase 1: URL Search Contract

### Overview

Wire `/items?q=...` to the existing catalog search helper while keeping server-rendered page behavior simple.

### Changes Required

#### 1. Read query params on the catalog page

**File**: `src/app/items/page.tsx`

**Intent**: Make `/items` respond to URL query state so search survives refresh and can be shared.

**Contract**: Accept `searchParams`, normalize `q` to a string, and use `searchCatalogItems(query)` for non-empty queries. Empty query renders `listCatalogItems()`.

#### 2. Preserve the shared catalog contract

**File**: `src/lib/catalog.ts`

**Intent**: Avoid adding duplicate UI-side search logic.

**Contract**: Keep `searchCatalogItems(query)` as the single search function. Adjust only if a small missing edge case is discovered during implementation.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes.
- `npm.cmd run build` passes with `/items` query param handling.
- `npm.cmd run lint` passes.

#### Manual Verification

- Opening `/items` with no query shows all catalog items.
- Opening `/items?q=dune` shows the Dune item.
- Refreshing `/items?q=dune` keeps the filtered result.
- Opening `/items?q=` behaves like no search.

## Phase 2: Search Form And Current-State Results

### Overview

Add the visible search interaction and ensure every result answers the user's current-state question.

### Changes Required

#### 1. Search form component

**File**: `src/components/CatalogSearchForm.tsx`

**Intent**: Provide a reusable, client-light or server-compatible form for entering a search query.

**Contract**: Submit with `method="get"` to `/items`, use input name `q`, initialize from the current query, and include a clear action when a query is active. The form must not require client state unless implementation needs it for ergonomics.

#### 2. Result card state detail

**File**: `src/app/items/page.tsx`

**Intent**: Make search results useful at a glance.

**Contract**: Each item row/card shows title, kind, formatted status, note when present, and borrower/date context when present. Existing status/kind helpers remain the formatting boundary.

#### 3. Empty result state

**File**: `src/app/items/page.tsx`

**Intent**: Make no-match searches understandable and recoverable.

**Contract**: When the query is non-empty and the filtered result is empty, show a short empty state and a clear-search link/button back to `/items`.

#### 4. Profile/read-only continuity

**File**: `src/components/ProfileAccessNotice.tsx` or `src/app/items/page.tsx`

**Intent**: Keep guest search allowed while preserving the read-only signal.

**Contract**: Do not hide search for guest profiles. Keep or refine the read-only notice so guest users understand they can browse/search but cannot write.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- The catalog page has a visible search input.
- Searching by title filters the list.
- Searching by note or borrower filters the list.
- Result count reflects filtered results.
- Empty results show a clear message and reset action.
- Guest profile can use search and still sees read-only state.
- Family profile can use search and still sees family catalog access state.
- Mobile-width layout keeps search, notices, and result cards readable without overlap.

## Phase 3: Verification Coverage And Plan Closeout

### Overview

Strengthen the lightweight contract checks around search without introducing a full test runner.

### Changes Required

#### 1. Expand catalog search checks

**File**: `scripts/check-catalog.mjs`

**Intent**: Lock the S-02 search assumptions into the existing verification command.

**Contract**: Add assertions that empty/whitespace search returns all items, unmatched search returns zero items, title search is case-insensitive, and note/borrower/kind-label searches continue to work.

#### 2. Keep package scripts stable

**File**: `package.json`

**Intent**: Avoid unnecessary script churn.

**Contract**: Reuse `check:catalog`; add no new script unless implementation discovers a clear need.

#### 3. Update progress

**File**: `context/changes/search-current-item-state/plan.md`

**Intent**: Keep implementation state readable for later `/10x-implement` and review.

**Contract**: Mark completed success criteria with commit SHAs as each phase lands.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes with added search edge cases.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Search behavior remains read-only.
- No API routes, persistence layer, or write operations were added for S-02.
- The final UI still satisfies the roadmap outcome: a family member can search and see current status plus note.

## Testing Strategy

Automated:

- Run `npm.cmd run check:catalog`.
- Run `npm.cmd run check:profiles`.
- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.

Manual:

1. Select a guest profile and open `/items`.
2. Search for `dune` and confirm only the matching item appears.
3. Search for `Marta` or another borrower/note value and confirm the current-state context is visible.
4. Search for a nonsense query and confirm the empty state plus clear action appears.
5. Refresh a filtered URL and confirm the same query/result persists.
6. Switch to a family profile and confirm search still works with family profile state visible.
7. Check a mobile-width viewport for readable search and result layout.

## Performance Considerations

The catalog seed is tiny and in memory. Linear filtering through `searchCatalogItems` is appropriate for this MVP slice. Do not add debounce, indexing, server actions, or pagination until the catalog size or persistence layer justifies it.

## Migration Notes

There is no data migration. The route remains `/items`; links without `q` continue to work. The `q` search parameter is additive and safe to remove by navigating back to `/items`.

## Open Risks And Assumptions

- `context/foundation/prd.md` is absent, so roadmap and completed change plans are treated as the source of truth.
- The current seed data has only three items; manual search verification is limited but enough for this MVP slice.
- URL search uses normal GET behavior; if the future app introduces client-side data fetching, this contract should be preserved.

## References

- Roadmap item: `context/foundation/roadmap.md` S-02 / `search-current-item-state`
- Foundation plan: `context/changes/catalog-state-contract/plan.md`
- Profile plan: `context/changes/shared-entry-profile-selection/plan.md`
- Catalog contract: `src/lib/catalog.ts`
- Catalog page: `src/app/items/page.tsx`
- Profile notice: `src/components/ProfileAccessNotice.tsx`
- Verification script: `scripts/check-catalog.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: URL Search Contract

#### Automated

- [x] 1.1 `npm.cmd run check:catalog` passes. - 4f92a9d
- [x] 1.2 `npm.cmd run build` passes with `/items` query param handling. - 4f92a9d
- [x] 1.3 `npm.cmd run lint` passes. - 4f92a9d

#### Manual

- [x] 1.4 Opening `/items` with no query shows all catalog items. - 4f92a9d
- [x] 1.5 Opening `/items?q=dune` shows the Dune item. - 4f92a9d
- [x] 1.6 Refreshing `/items?q=dune` keeps the filtered result. - 4f92a9d
- [x] 1.7 Opening `/items?q=` behaves like no search. - 4f92a9d

### Phase 2: Search Form And Current-State Results

#### Automated

- [x] 2.1 `npm.cmd run check:catalog` passes. - 0791b6a
- [x] 2.2 `npm.cmd run check:profiles` passes. - 0791b6a
- [x] 2.3 `npm.cmd run build` passes. - 0791b6a
- [x] 2.4 `npm.cmd run lint` passes. - 0791b6a

#### Manual

- [x] 2.5 The catalog page has a visible search input. - 0791b6a
- [x] 2.6 Searching by title filters the list. - 0791b6a
- [x] 2.7 Searching by note or borrower filters the list. - 0791b6a
- [x] 2.8 Result count reflects filtered results. - 0791b6a
- [x] 2.9 Empty results show a clear message and reset action. - 0791b6a
- [x] 2.10 Guest profile can use search and still sees read-only state. - 0791b6a
- [x] 2.11 Family profile can use search and still sees family catalog access state. - 0791b6a
- [x] 2.12 Mobile-width layout keeps search, notices, and result cards readable without overlap. - 0791b6a

### Phase 3: Verification Coverage And Plan Closeout

#### Automated

- [x] 3.1 `npm.cmd run check:catalog` passes with added search edge cases. - c0f192f
- [x] 3.2 `npm.cmd run check:profiles` passes. - c0f192f
- [x] 3.3 `npm.cmd run build` passes. - c0f192f
- [x] 3.4 `npm.cmd run lint` passes. - c0f192f

#### Manual

- [x] 3.5 Search behavior remains read-only. - c0f192f
- [x] 3.6 No API routes, persistence layer, or write operations were added for S-02. - c0f192f
- [x] 3.7 The final UI still satisfies the roadmap outcome: a family member can search and see current status plus note. - c0f192f
