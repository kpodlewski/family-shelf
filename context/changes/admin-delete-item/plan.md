# Admin Delete Item Implementation Plan

## Overview

Implement roadmap slice S-05: an admin can unlock protected destructive catalog actions and delete an item. This extends the existing family profile/session model without turning the MVP into a full login system.

## Current State Analysis

- `context/foundation/prd.md` defines US-03, FR-003, and FR-009: admin-only destructive catalog actions, admin password unlock, and item deletion.
- `context/foundation/roadmap.md` identifies `admin-delete-item` as S-05 and the last MVP slice currently proposed.
- `src/lib/profiles.ts` already defines the `admin:delete` capability type, but no current profile has that capability; family profiles can write catalog data, while guest remains read/search-only.
- `src/lib/profileAuthorization.ts` verifies profile evidence using `profileId` plus `sessionToken` for password-protected family profiles.
- `src/lib/catalog.ts` already has durable Postgres-backed list, search, create, and update operations, but no delete operation.
- `src/app/api/catalog-items/[id]/route.ts` already owns item-specific mutations through `PATCH`; `DELETE` belongs beside that handler.
- `src/app/admin/page.tsx` is a placeholder that explicitly says admin/delete behavior is future work.
- `/items` already renders the active catalog list and item cards, so it is the chosen surface for delete controls after admin unlock.
- `scripts/check-catalog.mjs` already creates isolated contract rows for create/update checks and cleans them up, which is the pattern to follow for delete verification.

## Desired End State

A family user can open `/admin`, enter the separate admin password, and unlock admin mode in the browser. Once unlocked, `/items` shows delete controls for catalog items. Deleting an item requires a valid family profile session and a valid admin token, uses a standard confirmation dialog, removes the item from Postgres by stable `id`, and redirects or refreshes back to `/items`.

### Key Discoveries

- The delete path must not reuse ordinary `catalog:write` alone because family members can write/update but must not delete.
- The existing `ProfileGate` and profile session token remain useful as one half of the delete evidence.
- A separate admin password/token is the cleanest match for the PRD without introducing a real account system.
- Delete verification should create and delete only contract-owned rows so checks are safe against a real configured database.

## What We're NOT Doing

- No real login system, users table, password reset, OAuth, or role management UI.
- No admin profile in the profile picker.
- No bulk delete.
- No soft delete, recycle bin, audit log, or status history.
- No item detail page, edit-item-details flow, image upload, or structured place field.
- No delete controls for guest users or non-unlocked family sessions.
- No database schema migration unless implementation discovers an unavoidable need.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Admin credential | Separate admin password, e.g. `FAMILY_SHELF_ADMIN_PASSWORD` | Keeps destructive access separate from normal family catalog access. |
| Unlock persistence | Admin token stored locally like the selected profile session | Matches the MVP private-family model and avoids repeated unlocks during cleanup. |
| Delete surface | `/items` after admin unlock | Lets admin delete in the existing catalog workflow where item context is visible. |
| Confirmation | Standard browser confirmation | Smallest acceptable guard for MVP while keeping delete quick. |
| API evidence | Valid family profile session plus admin token | Requires both app access and admin unlock before destructive mutation. |
| Verification | Contract row delete only in `check:catalog` | Covers repository/database semantics without risking user or seed rows. |

## Admin Authorization Contract

- Add a separate admin password config boundary, independent of the family password config.
- Add admin token creation/verification using the existing HMAC token style or a narrow equivalent helper.
- The admin token can be persisted in local storage by client UI.
- `DELETE /api/catalog-items/[id]` accepts `profileId`, `sessionToken`, and `adminToken`.
- The route verifies the active profile session first, then verifies the admin token.
- A guest or missing profile session is rejected even if an admin token is present.
- Missing admin password configuration returns a readable server error and does not unlock delete.

## Phase 1: Admin Unlock Boundary

### Overview

Create the separate admin password/token boundary and replace the admin placeholder with a small unlock screen.

### Changes Required:

#### 1. Admin password config

**File**: `src/lib/profileConfig.ts` or `src/lib/adminConfig.ts`

**Intent**: Keep the admin password separate from the family profile password and out of client bundles.

**Contract**: Export an admin password env var name, e.g. `FAMILY_SHELF_ADMIN_PASSWORD`, plus helper functions that return trimmed config or `null`. Do not expose the raw password to client components.

#### 2. Admin session token helper

**File**: `src/lib/adminSession.ts` or `src/lib/profileSession.ts`

**Intent**: Provide a narrow signed token for admin unlock, similar to the existing profile session token.

**Contract**: Export create/verify helpers for admin tokens. Tokens must be signed server-side using the admin password or derived secret and must fail closed on malformed input.

#### 3. Admin session API

**File**: `src/app/api/admin-session/route.ts`

**Intent**: Give client UI one route for unlocking and verifying admin mode.

**Contract**: Accept `POST` JSON with either `password` or `adminToken`. Return `{ adminToken }` on success. Return readable `400`, `401`, or `503` errors for invalid JSON, wrong password/token, or missing config.

#### 4. Admin unlock UI

**File**: `src/app/admin/page.tsx` and a client component such as `src/components/AdminUnlockPanel.tsx`

**Intent**: Replace the placeholder with the minimal admin unlock workflow.

**Contract**: Render a password form, store the returned admin token in local storage, show an unlocked state with a link to `/items`, and provide a way to clear admin unlock locally.

### Success Criteria:

#### Automated Verification:

- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes with the admin session route and client UI.
- `npm.cmd run lint` passes.

#### Manual Verification:

- `/admin` shows an admin password form before unlock.
- Wrong admin password shows a readable error.
- Correct admin password unlocks admin mode and survives refresh in the same browser.
- Clearing admin unlock removes admin mode without changing the selected family profile.
- Missing admin password config fails with a readable message.

## Phase 2: Delete Repository And API

### Overview

Add the durable delete operation, route handler, validation, authorization, and database contract coverage before exposing delete in the UI.

### Changes Required:

#### 1. Delete input contract

**File**: `src/lib/catalogContract.ts` and `src/lib/catalogValidation.ts`

**Intent**: Keep item id validation explicit for destructive operations.

**Contract**: Add a small delete input type or reuse a shared id validator. Validate `id` as non-empty trimmed text. Do not validate by title.

#### 2. Catalog delete repository function

**File**: `src/lib/catalog.ts`

**Intent**: Provide one server-side function for deleting a catalog item by stable id.

**Contract**: Export `deleteCatalogItem` or equivalent. It accepts an item id and returns the deleted `CatalogItem` or `null` when not found. It deletes from `catalog_items` with `DELETE ... WHERE id = ... RETURNING ...`.

#### 3. Delete API route

**File**: `src/app/api/catalog-items/[id]/route.ts`

**Intent**: Add the server boundary for destructive item deletion.

**Contract**: Add `DELETE` beside the existing `PATCH`. Parse JSON, verify `profileId` and `sessionToken` as a valid family profile session, verify `adminToken`, validate route `id`, call the repository delete function, return `{ item }`, return `404` when the item is missing, and avoid exposing raw database errors.

#### 4. Delete contract coverage

**File**: `scripts/check-catalog.mjs`

**Intent**: Lock delete database semantics into the lightweight verification command.

**Contract**: Create one contract-owned item, delete it by id, assert the returned row matches that id/title, assert it no longer appears in subsequent reads/searches, and clean any matching contract leftovers in `finally`.

### Success Criteria:

#### Automated Verification:

- `npm.cmd run check:catalog` passes with delete contract coverage.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification:

- Server rejects delete without active family profile evidence.
- Server rejects delete without admin token.
- Server rejects delete with guest profile evidence.
- Deleting a missing item returns a readable `404`.
- Delete changes only the intended item and does not affect seed/user rows.

## Phase 3: Delete UI On `/items`

### Overview

Show delete controls on item cards only when admin mode is unlocked, then call the delete API with both profile and admin evidence.

### Changes Required:

#### 1. Admin session client helper

**File**: `src/components/AdminUnlockPanel.tsx`, `src/components/DeleteCatalogItemForm.tsx`, or a small shared hook/module

**Intent**: Let `/items` know whether admin mode is unlocked in this browser.

**Contract**: Read the stored admin token from local storage, verify it through `/api/admin-session` or fail closed, and expose enough state for delete controls to render only after unlock.

#### 2. Delete item form component

**File**: `src/components/DeleteCatalogItemForm.tsx`

**Intent**: Provide the destructive action UI for unlocked admin mode.

**Contract**: Render nothing unless there is an active family profile session and a verified admin token. On submit, show a standard confirmation dialog, send `DELETE` with `profileId`, `sessionToken`, and `adminToken`, show readable errors, and on success navigate or refresh back to `/items`.

#### 3. Catalog page integration

**File**: `src/app/items/page.tsx`

**Intent**: Place delete controls inside existing item cards without breaking search/add/update workflows.

**Contract**: Render the delete form alongside existing item state/update controls. Preserve current search behavior where practical, but after success return to a valid `/items` view as selected in planning.

#### 4. User-facing copy alignment

**File**: `src/components/ProfileAccessNotice.tsx`, `src/app/admin/page.tsx`, or page-local copy

**Intent**: Make the write/admin distinction clear.

**Contract**: Family copy can mention add/update. Delete copy must be tied to admin unlock. Guest copy remains read/search-only.

### Success Criteria:

#### Automated Verification:

- `npm.cmd run check:catalog` passes.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification:

- Before admin unlock, `/items` does not show delete controls.
- After admin unlock, `/items` shows delete controls for catalog items.
- Clicking delete shows a standard confirmation dialog.
- Cancelling confirmation does not delete the item.
- Confirming deletion removes the item and returns to `/items`.
- Guest profile never sees enabled delete controls.
- Mobile-width layout keeps search, add, update, and delete controls readable.

## Phase 4: Final Verification And Handoff

### Overview

Close the slice with full checks, manual destructive-path coverage, and any operational notes for admin password configuration.

### Changes Required:

#### 1. Final check pass

**File**: no dedicated file unless checks require one

**Intent**: Prove delete integrates with the existing catalog and profile contracts.

**Contract**: Run the same project checks used by prior slices and confirm contract rows are cleaned.

#### 2. Operational note update

**File**: `docs/deployment.md`, `.env.example`, or `context/changes/admin-delete-item/plan.md` if no docs file exists

**Intent**: Record the required admin password env var without committing secrets.

**Contract**: Mention the env var name and local/Vercel setup expectation. Do not include real credentials.

### Success Criteria:

#### Automated Verification:

- `npm.cmd run check:catalog` passes in the configured environment.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification:

- Admin can unlock from `/admin` with the admin password.
- Admin-unlocked family session can delete a test item from `/items`.
- Family session without admin unlock cannot delete.
- Guest session cannot delete, even with a stale UI state.
- Existing add/update/search flows still work after delete UI is present.
- No full login, admin profile picker entry, bulk delete, soft delete, or audit log was added.

## Testing Strategy

Automated:

- Run `npm.cmd run check:catalog`.
- Run `npm.cmd run check:profiles`.
- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.

Manual:

1. Configure `FAMILY_SHELF_ADMIN_PASSWORD` locally or in the target environment.
2. Select a family profile and open `/items`; confirm delete controls are absent before admin unlock.
3. Open `/admin`, enter a wrong password, and confirm a readable error.
4. Enter the correct admin password and confirm unlocked state.
5. Return to `/items`, delete a disposable test item, cancel once and confirm once.
6. Confirm the deleted item no longer appears in list/search.
7. Switch to guest and confirm delete controls are absent or disabled.
8. Confirm add, update, and search still work.
9. Check mobile layout for readable admin/delete controls.

## Performance Considerations

The catalog is small, and delete is a single-row Postgres operation by primary key. No caching, pagination, background jobs, or optimistic UI are needed for the MVP.

## Migration Notes

No schema migration is expected because `catalog_items` already has stable ids and can be deleted directly. Rollback of code does not restore deleted user data. Manual destructive-data rollback is out of scope for the MVP.

## Open Risks And Assumptions

- The separate admin password is enough for a private family MVP.
- Persisting admin unlock in local storage is acceptable for this project, but the UI must make clearing unlock possible.
- Deleting an item permanently removes it; there is no soft delete or audit trail.
- The admin token should be invalidated by changing the admin password.

## References

- PRD: `context/foundation/prd.md` US-03, FR-003, FR-009
- Roadmap item: `context/foundation/roadmap.md` S-05 / `admin-delete-item`
- Profile plan: `context/changes/shared-entry-profile-selection/plan.md`
- Add item plan: `context/changes/add-catalog-item/plan.md`
- Update state plan: `context/changes/update-borrowing-state/plan.md`
- Catalog repository: `src/lib/catalog.ts`
- Item route: `src/app/api/catalog-items/[id]/route.ts`
- Admin placeholder: `src/app/admin/page.tsx`
- Catalog page: `src/app/items/page.tsx`
- Profile authorization: `src/lib/profileAuthorization.ts`
- Catalog verification: `scripts/check-catalog.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Admin Unlock Boundary

#### Automated

- [x] 1.1 `npm.cmd run check:profiles` passes. — 5270523
- [x] 1.2 `npm.cmd run build` passes with the admin session route and client UI. — 5270523
- [x] 1.3 `npm.cmd run lint` passes. — 5270523

#### Manual

- [x] 1.4 `/admin` shows an admin password form before unlock. — 5270523
- [x] 1.5 Wrong admin password shows a readable error. — 5270523
- [x] 1.6 Correct admin password unlocks admin mode and survives refresh in the same browser. — 5270523
- [x] 1.7 Clearing admin unlock removes admin mode without changing the selected family profile. — 5270523
- [x] 1.8 Missing admin password config fails with a readable message. — 5270523

### Phase 2: Delete Repository And API

#### Automated

- [x] 2.1 `npm.cmd run check:catalog` passes with delete contract coverage. — 87c31c4
- [x] 2.2 `npm.cmd run check:profiles` passes. — 87c31c4
- [x] 2.3 `npm.cmd run build` passes. — 87c31c4
- [x] 2.4 `npm.cmd run lint` passes. — 87c31c4

#### Manual

- [x] 2.5 Server rejects delete without active family profile evidence. — 87c31c4
- [x] 2.6 Server rejects delete without admin token. — 87c31c4
- [x] 2.7 Server rejects delete with guest profile evidence. — 87c31c4
- [x] 2.8 Deleting a missing item returns a readable `404`. — 87c31c4
- [x] 2.9 Delete changes only the intended item and does not affect seed/user rows. — 87c31c4

### Phase 3: Delete UI On `/items`

#### Automated

- [x] 3.1 `npm.cmd run check:catalog` passes. — 809b4bc
- [x] 3.2 `npm.cmd run check:profiles` passes. — 809b4bc
- [x] 3.3 `npm.cmd run build` passes. — 809b4bc
- [x] 3.4 `npm.cmd run lint` passes. — 809b4bc

#### Manual

- [x] 3.5 Before admin unlock, `/items` does not show delete controls. — 809b4bc
- [x] 3.6 After admin unlock, `/items` shows delete controls for catalog items. — 809b4bc
- [x] 3.7 Clicking delete shows a standard confirmation dialog. — 809b4bc
- [x] 3.8 Cancelling confirmation does not delete the item. — 809b4bc
- [x] 3.9 Confirming deletion removes the item and returns to `/items`. — 809b4bc
- [x] 3.10 Guest profile never sees enabled delete controls. — 809b4bc
- [x] 3.11 Mobile-width layout keeps search, add, update, and delete controls readable. — 809b4bc

### Phase 4: Final Verification And Handoff

#### Automated

- [x] 4.1 `npm.cmd run check:catalog` passes in the configured environment. — 20802a9
- [x] 4.2 `npm.cmd run check:profiles` passes. — 20802a9
- [x] 4.3 `npm.cmd run build` passes. — 20802a9
- [x] 4.4 `npm.cmd run lint` passes. — 20802a9

#### Manual

- [x] 4.5 Admin can unlock from `/admin` with the admin password. — 20802a9
- [x] 4.6 Admin-unlocked family session can delete a test item from `/items`. — 20802a9
- [x] 4.7 Family session without admin unlock cannot delete. — 20802a9
- [x] 4.8 Guest session cannot delete, even with a stale UI state. — 20802a9
- [x] 4.9 Existing add/update/search flows still work after delete UI is present. — 20802a9
- [x] 4.10 No full login, admin profile picker entry, bulk delete, soft delete, or audit log was added. — 20802a9
