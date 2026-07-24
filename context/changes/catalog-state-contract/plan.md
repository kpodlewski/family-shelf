# Catalog State Contract Implementation Plan

## Overview

Create the minimal shared catalog state contract needed before the roadmap's vertical slices can safely read and reuse the same item data. This change replaces duplicated page-local mock arrays with one typed read/query layer and narrows status handling to the MVP states defined in the PRD.

This is a foundation change for roadmap item F-01. It intentionally does not add durable persistence, API routes, or write operations. Later slices can reuse the same contract, but S-03/S-04/S-05 must decide real persistence before treating writes as MVP-complete.

## Current State Analysis

- `src/app/page.tsx` and `src/app/items/page.tsx` each define their own `items` array, so the app does not yet have shared catalog state.
- `src/lib/formatItemStatus.ts` accepts any string and formats `maintenance`, even though the PRD only needs available and borrowed states.
- There is no backend/API, no database, and no test runner. Verification today is `npm.cmd run build` and `npm.cmd run lint`.
- The roadmap says F-01 must stay narrow: define the shared catalog state contract required by search, add, status update, notes, and delete flows without building the full data layer.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Storage boundary | In-memory seed plus typed repository | Minimal F-01 scope; avoids pretending serverless memory is durable shared storage. |
| Item identity | Stable explicit `id: string` | Supports duplicate names and future update/delete operations. |
| Item kind | Explicit `kind` field | The domain needs books, board games, and video games as separate item kinds. |
| Status model | `available` and `borrowed` only | Matches the PRD MVP and removes unsupported `maintenance`. |
| Borrowing fields | Flat optional nullable fields | Keeps components simple while supporting optional borrower/date/note. |
| Repository operations | Read/query only | Mutations belong to downstream slices once persistence is decided. |
| UI adoption | Replace both existing mock arrays | Proves both screens read from the same contract and removes duplication. |
| Testing | Build/lint plus lightweight contract check | Adds coverage for helpers without introducing a full test runner yet. |

## Scope

In scope:

- Define shared catalog item types in `src/lib`.
- Add seed catalog data in one place.
- Add read/query functions for list, get by id, and simple search.
- Add item kind and status formatting helpers.
- Refactor home and catalog pages to read from the shared repository.
- Add a lightweight contract check script and package script.

Out of scope:

- Durable persistence, database, migrations, or API routes.
- Add/update/delete write operations.
- Profile selection, admin password flow, or access control.
- Search UI beyond rendering data from the shared contract.
- New full test framework such as Vitest.

## Data Contract

Define the catalog contract in `src/lib/catalog.ts` or a closely named module:

- `CatalogItemStatus = "available" | "borrowed"`.
- `CatalogItemKind = "book" | "board-game" | "video-game"`.
- `CatalogItem` includes:
  - `id: string`
  - `title: string`
  - `kind: CatalogItemKind`
  - `status: CatalogItemStatus`
  - `borrowerName?: string | null`
  - `borrowedDate?: string | null`
  - `note?: string | null`
- Seed data uses stable explicit ids, for example `dune-book`, `catan-board-game`, and `hades-video-game`.

Contract rules:

- `id` is the stable identifier; no code should use `title` as the key for update/delete planning.
- `kind` is stored as a machine-readable value and formatted separately for UI labels.
- `borrowerName` and `borrowedDate` may be empty even when status is `borrowed`.
- `note` is the MVP place/context field and may describe where an item is or who has it.

## Phase 1: Shared Catalog Contract

### Changes Required

1. Add the shared catalog module.
   - **Intent:** Establish one typed source of catalog truth for current UI reads and future slices.
   - **Contract:** Export `CatalogItemStatus`, `CatalogItemKind`, `CatalogItem`, seed data, `listCatalogItems`, `getCatalogItemById`, and `searchCatalogItems`.

2. Implement read/query behavior.
   - **Intent:** Give downstream slices stable read semantics before adding persistence.
   - **Contract:** `listCatalogItems()` returns all seed items; `getCatalogItemById(id)` returns an item or `null`; `searchCatalogItems(query)` matches case-insensitively across title, kind label, borrower name, and note.

3. Keep repository data immutable to callers.
   - **Intent:** Prevent page code from mutating the seed array directly.
   - **Contract:** Export functions rather than a mutable array; returned arrays should not expose the module's internal array reference when avoidable.

### Success Criteria

#### Automated Verification

- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.
- Catalog contract check passes through the new package script.

#### Manual Verification

- The catalog module exposes only read/query operations for F-01.
- Seed items cover all three item kinds: book, board game, and video game.
- No code path depends on item title as identity.

---

## Phase 2: UI Adoption And Formatting

### Changes Required

1. Narrow item status formatting.
   - **Intent:** Remove unsupported `maintenance` and make status formatting type-safe.
   - **Contract:** `formatItemStatus` accepts `CatalogItemStatus` only and returns labels for `available` and `borrowed`.

2. Add item kind formatting.
   - **Intent:** Show the domain-specific kind without hard-coding labels in pages.
   - **Contract:** Export a helper such as `formatItemKind(kind: CatalogItemKind): string`.

3. Refactor existing pages to use the shared repository.
   - **Intent:** Replace duplicated mock arrays with the shared catalog contract.
   - **Contract:** `src/app/page.tsx` and `src/app/items/page.tsx` call `listCatalogItems()` and render `title`, formatted kind/status, and note/borrower/place context.

### Success Criteria

#### Automated Verification

- `npm.cmd run build` passes after the page refactor.
- `npm.cmd run lint` passes after the page refactor.
- No local `const items = [...]` mock arrays remain in app pages.

#### Manual Verification

- Home page still renders the recent/visible items list.
- Catalog page still renders the item list.
- Status labels show only `Available` or `Borrowed`.
- Item kind is visible or otherwise clearly available to the UI contract.

---

## Phase 3: Lightweight Contract Verification

### Changes Required

1. Add a lightweight contract check.
   - **Intent:** Verify the repository contract without adding a full test runner.
   - **Contract:** Add a small script under `scripts/` that runs with Node after a successful build. It should validate expected seed count, unique ids, supported statuses, supported kinds, get-by-id, and search behavior.

2. Add a package script for the check.
   - **Intent:** Give future agents one command to run before implementation closeout.
   - **Contract:** Add a script such as `check:catalog` to `package.json`.

3. Document the persistence limitation in code comments or the plan handoff only where helpful.
   - **Intent:** Make it hard for later slices to mistake in-memory seed data for durable shared storage.
   - **Contract:** A short comment near seed/repository code is acceptable if it prevents misuse; avoid broad architectural prose in source files.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- The check fails if duplicate ids are introduced.
- The check fails if unsupported statuses or kinds enter seed data.
- The check demonstrates search can find at least title and note/borrower matches.

---

## Testing Strategy

Automated:

- Run `npm.cmd run check:catalog`.
- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.

Manual:

1. Open the home page and confirm visible items still render.
2. Open `/items` and confirm the same shared seed items render.
3. Confirm no UI displays `Maintenance`.
4. Confirm seed examples include a book, board game, and video game.

## Performance Considerations

The seed repository is intentionally in-memory and tiny. Search can be simple linear filtering for the MVP. Do not introduce indexing, caching, pagination, or async storage behavior in F-01.

## Migration Notes

There is no data migration. This change only replaces duplicated local mock arrays with a shared typed seed. Future persistence work should keep the exported item shape stable or provide a deliberate migration plan.

## References

- Roadmap item: `context/foundation/roadmap.md` F-01 / `catalog-state-contract`
- PRD requirements: FR-004, FR-005, FR-006, FR-007, FR-008, US-01, US-02
- Existing UI mock data: `src/app/page.tsx`, `src/app/items/page.tsx`
- Existing status helper: `src/lib/formatItemStatus.ts`
- Backlog: GitHub Issue #1, Linear `FAM-5`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Shared Catalog Contract

#### Automated

- [x] 1.1 `npm.cmd run build` passes. - d8eb208
- [x] 1.2 `npm.cmd run lint` passes. - d8eb208
- [x] 1.3 Catalog contract check passes through the new package script. - d8eb208

#### Manual

- [x] 1.4 The catalog module exposes only read/query operations for F-01. - d8eb208
- [x] 1.5 Seed items cover all three item kinds. - d8eb208
- [x] 1.6 No code path depends on item title as identity. - d8eb208

### Phase 2: UI Adoption And Formatting

#### Automated

- [x] 2.1 `npm.cmd run build` passes after the page refactor. - 0b5f98a
- [x] 2.2 `npm.cmd run lint` passes after the page refactor. - 0b5f98a
- [x] 2.3 No local `const items = [...]` mock arrays remain in app pages. - 0b5f98a

#### Manual

- [x] 2.4 Home page still renders the recent/visible items list. - 0b5f98a
- [x] 2.5 Catalog page still renders the item list. - 0b5f98a
- [x] 2.6 Status labels show only `Available` or `Borrowed`. - 0b5f98a
- [x] 2.7 Item kind is visible or otherwise clearly available to the UI contract. - 0b5f98a

### Phase 3: Lightweight Contract Verification

#### Automated

- [x] 3.1 `npm.cmd run check:catalog` passes. - 80f098a
- [x] 3.2 `npm.cmd run build` passes. - 80f098a
- [x] 3.3 `npm.cmd run lint` passes. - 80f098a

#### Manual

- [x] 3.4 The check fails if duplicate ids are introduced. - 80f098a
- [x] 3.5 The check fails if unsupported statuses or kinds enter seed data. - 80f098a
- [x] 3.6 The check demonstrates search can find at least title and note/borrower matches. - 80f098a
