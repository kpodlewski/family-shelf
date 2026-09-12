# Update Borrowing State Implementation Plan

## Overview

Implement roadmap slice S-04: a family member can change an item's current borrowing state and note from the catalog. This builds directly on the Neon-backed catalog repository, profile write boundary, and `/items` search/add workflow from `add-catalog-item`.

## Current State Analysis

- `context/foundation/roadmap.md` defines S-04 as `update-borrowing-state` with prerequisites F-01, S-02, and S-03.
- `add-catalog-item` introduced Neon/Postgres persistence, `catalog_items`, `createCatalogItem`, `/api/catalog-items`, server-side profile authorization, validation helpers, and `AddCatalogItemForm`.
- `src/lib/catalog.ts` already exposes `CatalogItem` with `status`, `borrowerName`, `borrowedDate`, and `note` fields, but only create/read/search operations exist.
- `src/app/items/page.tsx` renders all catalog results inline and already shows status, note, borrower, and date when present.
- `ProfileGate` exposes `useActiveProfileSession()` with the signed session token needed by client-side write forms.
- Guest profiles do not have `catalog:write`; the existing `verifyProfileCapability()` helper can enforce family-only updates server-side.
- `scripts/check-catalog.mjs` verifies schema, seed rows, read/search/create behavior, and now cleans contract rows after each run.

## Desired End State

A family profile can update an existing catalog item inline on `/items` by changing `status`, `note`, and optional `borrowerName`. The update is saved in Postgres, the user remains on the current `/items` URL and search query, and the refreshed list shows the new visible state. Guest profiles can still browse and search but cannot see or perform enabled update actions, and forged requests are rejected server-side.

### Key Discoveries

- The current table already has the needed fields: `status`, `borrower_name`, `note`, and `updated_at`.
- S-04 does not need a schema migration unless we decide to expose `borrowed_date`; the chosen MVP scope excludes date editing.
- The S-03 API/form pattern is reusable: client form sends `profileId` + `sessionToken`, route validates/auths, repository writes, UI refreshes.
- Search must keep working after updates because `searchCatalogItems()` reads from the same fields that this slice modifies.

## What We're NOT Doing

- No status history or audit log.
- No `borrowedDate` editing in the UI.
- No item detail page, modal, or drawer.
- No optimistic UI.
- No admin/delete behavior.
- No per-profile ownership rules.
- No real login system or stricter identity model.
- No pagination, sorting, fuzzy search, or realtime sync.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Update fields | `status`, `note`, optional `borrowerName` | Covers the MVP borrowing state without adding date/history complexity. |
| UI location | Inline on `/items` per item | Keeps status changes in the same search/current-state workflow. |
| Permissions | Family-only via `catalog:write`, guest read-only | Reuses the existing profile capability contract and server boundary. |
| Post-save behavior | Refresh the current list while preserving current search URL | Users stay in context after editing a filtered result. |
| History | No history; only current visible state | Matches roadmap scope and avoids hidden data model growth. |

## Data Contract

The public `CatalogItem` shape remains stable:

- `status`: `available` or `borrowed`, required.
- `note`: nullable text, trimmed on write.
- `borrowerName`: nullable text, trimmed on write.
- `borrowedDate`: remains nullable and read-only in S-04.
- `updated_at`: maintained in the database for future debugging/operations, not exposed as user-facing history.

Repository and route code should use `CatalogItem` and existing enum exports instead of duplicating literal contracts in UI components.

## Phase 1: Update Repository And API Contract

### Overview

Add the server-side update operation, validation, authorization, and contract coverage while leaving the UI unchanged.

### Changes Required

#### 1. Catalog update repository function

**File**: `src/lib/catalog.ts`

**Intent**: Provide one durable write function for changing the current item state.

**Contract**: Export an async update function that accepts item id, status, note, optional borrowerName, and an acting profile. It must require `catalog:write`, trim nullable text fields, update `updated_at`, return the updated `CatalogItem`, and return `null` or a controlled result when the item id does not exist.

#### 2. Update validation helper

**File**: `src/lib/catalogValidation.ts`

**Intent**: Keep update input validation consistent with create validation.

**Contract**: Validate item id as non-empty text, status as the existing enum, note as optional max-length text, and borrowerName as optional max-length text. Empty strings become `null` for nullable fields.

#### 3. Update API route

**File**: `src/app/api/catalog-items/[id]/route.ts`

**Intent**: Create a server boundary for updating a single item.

**Contract**: Accept `PATCH`, parse JSON, verify `catalog:write` via `verifyProfileCapability()`, validate input, call the repository update function, return `{ item }`, return `404` for missing items, and avoid exposing raw database errors.

#### 4. Catalog check coverage

**File**: `scripts/check-catalog.mjs`

**Intent**: Lock update semantics into the existing lightweight verification command.

**Contract**: Add isolated contract rows for update checks, assert status/note/borrowerName updates persist and remain searchable, assert nullable note/borrowerName behavior, then clean up the contract rows.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes with update contract coverage.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Server rejects guest or missing-profile update attempts.
- Invalid item id/status/note/borrowerName input returns a readable error.
- Updating a known item changes only current state fields, not title/kind/id.
- Contract test rows do not remain in the database after `check:catalog`.

## Phase 2: Inline Update UI On Catalog Items

### Overview

Render compact inline update controls on `/items` for family profiles while preserving guest read-only search.

### Changes Required

#### 1. Item update form component

**File**: `src/components/UpdateCatalogItemForm.tsx`

**Intent**: Let family users edit the current borrowing state from each result card.

**Contract**: Render controls for status, borrowerName, and note using the existing active profile session. Hide or omit the form for profiles without `catalog:write`. Submit to the update API, show readable errors, refresh the current route on success, and do not navigate away from the current search URL.

#### 2. Catalog page integration

**File**: `src/app/items/page.tsx`

**Intent**: Keep search, add, update, and result confirmation in one workflow.

**Contract**: Place update controls inside each item card without breaking existing result text, status badges, empty state, or mobile layout. Existing item display remains visible even when controls are present.

#### 3. Copy alignment

**File**: `src/components/ProfileAccessNotice.tsx` or page-local copy

**Intent**: Avoid implying delete/admin behavior exists while update controls are available.

**Contract**: Family copy may mention add/update; guest copy must stay read/search-only with write actions unavailable.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Family profile sees inline update controls for each item on `/items`.
- Guest profile does not see enabled update controls.
- Changing an item to `borrowed` with borrowerName and note persists after refresh.
- Changing an item back to `available` can clear borrowerName and note.
- Updating from a filtered `/items?q=...` view preserves the current URL/search context.
- Updated note and borrowerName are searchable.
- Mobile-width layout keeps add form, search form, item display, and update controls readable.

## Phase 3: Final Verification And Handoff

### Overview

Close the slice with full checks, final manual coverage, and documentation/plan notes if update behavior introduces any operational caveats.

### Changes Required

#### 1. Final check pass

**File**: no dedicated file unless checks require one

**Intent**: Prove S-04 integrates cleanly with S-02 and S-03.

**Contract**: Run the same project checks used by prior slices and confirm database contract rows are cleaned.

#### 2. Optional deployment note update

**File**: `docs/deployment.md` only if needed

**Intent**: Keep operational docs honest if update verification changes database setup expectations.

**Contract**: Do not add secrets. Only document command or rollback implications if S-04 creates a new operational requirement.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes in the configured environment.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Family can update status, borrowerName, and note on a seeded item.
- Guest can browse/search the same item but cannot update it.
- Existing add item flow still works after update UI is present.
- Existing search-current-item-state behavior still works with updated data.
- No status history, delete action, or admin unlock UI was added.

## Testing Strategy

Automated:

- Run `npm.cmd run check:catalog`.
- Run `npm.cmd run check:profiles`.
- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.

Manual:

1. Select a family profile and open `/items`.
2. Search for a known item.
3. Change its status to `borrowed`, set borrowerName, and add a note.
4. Refresh and confirm the updated state remains visible.
5. Search by the new borrowerName and note.
6. Change the item back to `available` and clear nullable fields.
7. Switch to guest and confirm update controls are absent or disabled.
8. Confirm add item and search still work.
9. Check mobile layout for add/search/update/result readability.

## Performance Considerations

The catalog is small. A simple item update followed by route refresh is sufficient for MVP. Avoid optimistic state, local cache invalidation, websocket updates, list virtualization, and pagination until real usage shows they are needed.

## Migration Notes

No schema migration is expected because `catalog_items` already includes the target fields. Rollback of code does not roll back user-edited item state. Destructive database rollback remains out of scope.

## Open Risks And Assumptions

- The shared family password/session token is enough for MVP write authorization.
- The first UI pass may make item cards denser; Phase 2 must keep mobile layout readable.
- Multiple users editing the same item concurrently will be last-write-wins for MVP.
- `borrowedDate` remains read-only in this slice even though the table supports it.

## References

- Roadmap item: `context/foundation/roadmap.md` S-04 / `update-borrowing-state`
- Add item plan: `context/changes/add-catalog-item/plan.md`
- Search plan: `context/changes/search-current-item-state/plan.md`
- Catalog repository: `src/lib/catalog.ts`
- Add item route pattern: `src/app/api/catalog-items/route.ts`
- Add item form pattern: `src/components/AddCatalogItemForm.tsx`
- Catalog page: `src/app/items/page.tsx`
- Authorization helper: `src/lib/profileAuthorization.ts`
- Catalog verification: `scripts/check-catalog.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Update Repository And API Contract

#### Automated

- [x] 1.1 `npm.cmd run check:catalog` passes with update contract coverage. — a9dc762
- [x] 1.2 `npm.cmd run check:profiles` passes. — a9dc762
- [x] 1.3 `npm.cmd run build` passes. — a9dc762
- [x] 1.4 `npm.cmd run lint` passes. — a9dc762

#### Manual

- [x] 1.5 Server rejects guest or missing-profile update attempts. — a9dc762
- [x] 1.6 Invalid item id/status/note/borrowerName input returns a readable error. — a9dc762
- [x] 1.7 Updating a known item changes only current state fields, not title/kind/id. — a9dc762
- [x] 1.8 Contract test rows do not remain in the database after `check:catalog`. — a9dc762

### Phase 2: Inline Update UI On Catalog Items

#### Automated

- [x] 2.1 `npm.cmd run check:catalog` passes. — 18a7ce5
- [x] 2.2 `npm.cmd run check:profiles` passes. — 18a7ce5
- [x] 2.3 `npm.cmd run build` passes. — 18a7ce5
- [x] 2.4 `npm.cmd run lint` passes. — 18a7ce5

#### Manual

- [x] 2.5 Family profile sees inline update controls for each item on `/items`. — 18a7ce5
- [x] 2.6 Guest profile does not see enabled update controls. — 18a7ce5
- [x] 2.7 Changing an item to `borrowed` with borrowerName and note persists after refresh. — 18a7ce5
- [x] 2.8 Changing an item back to `available` can clear borrowerName and note. — 18a7ce5
- [x] 2.9 Updating from a filtered `/items?q=...` view preserves the current URL/search context. — 18a7ce5
- [x] 2.10 Updated note and borrowerName are searchable. — 18a7ce5
- [x] 2.11 Mobile-width layout keeps add form, search form, item display, and update controls readable. — 18a7ce5

### Phase 3: Final Verification And Handoff

#### Automated

- [x] 3.1 `npm.cmd run check:catalog` passes in the configured environment.
- [x] 3.2 `npm.cmd run check:profiles` passes.
- [x] 3.3 `npm.cmd run build` passes.
- [x] 3.4 `npm.cmd run lint` passes.

#### Manual

- [x] 3.5 Family can update status, borrowerName, and note on a seeded item.
- [x] 3.6 Guest can browse/search the same item but cannot update it.
- [x] 3.7 Existing add item flow still works after update UI is present.
- [x] 3.8 Existing search-current-item-state behavior still works with updated data.
- [x] 3.9 No status history, delete action, or admin unlock UI was added.
