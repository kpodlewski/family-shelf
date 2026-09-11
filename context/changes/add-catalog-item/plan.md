# Add Catalog Item Implementation Plan

## Overview

Implement roadmap slice S-03: a family member can add a new item and immediately see it in the shared catalog. This is the first true write slice, so it must introduce durable storage that works with the project's Vercel deployment target instead of extending the in-memory seed.

## Current State Analysis

- `context/foundation/prd.md` defines FR-004 as must-have: family members can add an item to the catalog.
- `context/foundation/roadmap.md` marks `add-catalog-item` as S-03 with prerequisites F-01 and S-01.
- `catalog-state-contract` intentionally left `src/lib/catalog.ts` as an in-memory read/query seed and warned that downstream write slices must decide real persistence.
- `search-current-item-state` added URL-backed search UI on `/items`, so a newly created item can be surfaced by redirecting back to `/items?q=<title>`.
- `src/lib/profiles.ts` grants family profiles `catalog:write` and guest only `catalog:read`/`catalog:search`.
- `ProfileGate` currently keeps the active profile in a client context, but server writes cannot trust client-only profile state. S-03 needs a server-verifiable write boundary.
- `context/foundation/infrastructure.md` recommends Vercel and explicitly calls out that future database choice matters once real catalog data is stored.

## Desired End State

A family profile can add a catalog item from `/items` by entering title, kind, status, and optional note. The item is saved in durable Postgres storage provisioned for Vercel, appears in the catalog after redirect, and participates in existing search. Guest profiles do not see the write form and server-side write logic rejects guest or invalid profile submissions.

### Key Discoveries

- A JSON file would be acceptable for local experiments but is not a correct durable production choice on Vercel serverless.
- Vercel's current storage path is Marketplace storage; for Postgres, Neon is a native Marketplace option with a free plan.
- The existing catalog item type already has the MVP fields needed for add: title, kind, status, optional note, optional borrower/date.
- S-03 should not implement status update workflows, borrower/date editing, item detail pages, or delete behavior.

## What We're NOT Doing

- No JSON file store or in-memory mutation as the MVP write store.
- No update, delete, admin unlock, or item detail page.
- No status history.
- No fuzzy search, filters, sorting, or pagination.
- No strict per-person privacy or real login system.
- No image upload or edit item details flow.
- No borrower name/date fields in the add form; those remain optional data fields for S-04.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Durable storage | Neon Postgres via Vercel Marketplace | Works with Vercel serverless and avoids false durability from filesystem writes. |
| Add fields | `title`, `kind`, `status`, optional `note` | Gives users enough control while avoiding borrower/date update scope. |
| Form location | `/items`, above catalog results, family-only | Keeps add and catalog verification in one workflow. |
| Success behavior | Redirect back to `/items?q=<title>` or `/items` with the item visible | Confirms the item landed in the same catalog/search flow. |
| Permissions | Family can add; guest is read-only; server write boundary verifies | Matches `catalog:write` capabilities and avoids trusting UI-only hiding. |
| Validation | Required trimmed title, enum kind/status, note max length, duplicate titles allowed | Keeps `id` as identity and prevents dirty inputs. |
| Verification | Extend `check:catalog` for DB/create contract plus existing build/lint/profile checks | Keeps project verification lightweight while covering the first write path. |

## Data Contract

Use a Postgres table with the existing catalog contract as the public shape:

- `id`: text primary key, generated server-side.
- `title`: non-empty text.
- `kind`: one of `book`, `board-game`, `video-game`.
- `status`: one of `available`, `borrowed`.
- `borrower_name`: nullable text, not written by S-03.
- `borrowed_date`: nullable text/date, not written by S-03.
- `note`: nullable text.
- `created_at`: timestamp for ordering/debugging.
- `updated_at`: timestamp for future update slices.

The exported TypeScript contract remains `CatalogItem`. UI should call repository functions rather than SQL directly.

## Phase 1: Durable Catalog Repository

### Overview

Introduce the database-backed catalog repository and migration/check scaffolding while preserving the existing read/search API.

### Changes Required

#### 1. Database client boundary

**File**: `src/lib/database.ts` or closely named module

**Intent**: Centralize Postgres connection setup for Vercel/Neon.

**Contract**: Read database connection from environment, fail clearly when missing, and keep raw connection details out of UI components.

#### 2. Catalog repository refactor

**File**: `src/lib/catalog.ts`

**Intent**: Move from static seed reads to async durable reads without leaking storage details into pages.

**Contract**: Keep the public `CatalogItem` type and enum exports. Replace or add async repository functions for list, get, search, and create. Search still matches title, kind label, borrower name, borrowed date, and note.

#### 3. Schema/migration artifact

**File**: `scripts/` migration file or `src/lib/catalogSchema.ts`

**Intent**: Make the expected table shape explicit and reproducible.

**Contract**: Define `catalog_items` schema with stable columns matching the Data Contract. Implementation may use raw SQL or a minimal migration helper, but must not introduce a large ORM unless it is clearly needed.

#### 4. Catalog contract check adaptation

**File**: `scripts/check-catalog.mjs`

**Intent**: Keep contract verification working after the repository becomes database-backed.

**Contract**: Verify required env/config presence in a friendly way, schema availability where possible, supported kinds/statuses, and read/search behavior. The check should be usable by agents before phase closeout.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes against the configured local/preview database.
- `npm.cmd run build` passes after async repository changes.
- `npm.cmd run lint` passes.

#### Manual Verification

- No code path writes catalog data to JSON or process memory as the durable store.
- Catalog read/search still renders existing items from the database.
- Missing database configuration fails with an understandable message.

## Phase 2: Add Item Write Boundary

### Overview

Add the server-side create operation, validation, and profile capability enforcement.

### Changes Required

#### 1. Create catalog item operation

**File**: `src/lib/catalog.ts`

**Intent**: Provide one server-side write function for S-03.

**Contract**: Export a create function that accepts title, kind, status, optional note, and the acting profile/session evidence needed for authorization. It generates a stable id, trims inputs, stores nullable note, and returns the created `CatalogItem`.

#### 2. Server action or route handler

**File**: `src/app/items/actions.ts` or `src/app/api/catalog-items/route.ts`

**Intent**: Create a server boundary that can be called from the add form.

**Contract**: Validate input, verify the active profile has `catalog:write`, call the create repository function, and redirect or respond without exposing raw database errors. Do not trust a hidden form field alone for authorization.

#### 3. Validation helpers

**File**: `src/lib/catalogValidation.ts` or `src/lib/catalog.ts`

**Intent**: Keep form validation consistent and testable.

**Contract**: Title is required after trim, kind/status must be supported enum values, note is optional and length-limited, duplicate titles are allowed, and invalid input returns user-readable errors.

#### 4. Profile write verification

**File**: `src/components/ProfileGate.tsx`, `src/app/api/profile-session/route.ts`, or a server-readable session helper

**Intent**: Bridge client-selected profile state to server-side write authorization.

**Contract**: Family profile writes must be verifiable by the server using the existing signed profile session approach or an equivalent narrow mechanism. Guest writes must be rejected even if the request is forged.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes with create/write contract coverage.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Family profile can submit a valid add form.
- Guest profile cannot submit a catalog write, including via forged client state where practical to test.
- Invalid title/kind/status/note input is rejected with a readable message.
- Duplicate titles are allowed and produce distinct ids.

## Phase 3: Add Form UI And Catalog Integration

### Overview

Place the add form into the catalog workflow and make successful creation visible immediately.

### Changes Required

#### 1. Add item form component

**File**: `src/components/AddCatalogItemForm.tsx`

**Intent**: Give family users a compact form for creating catalog entries.

**Contract**: Render title, kind, status, and optional note fields. Hide or omit the form for guests while keeping the read-only notice. The UI must fit mobile width without overlapping the search form or result list.

#### 2. Catalog page integration

**File**: `src/app/items/page.tsx`

**Intent**: Keep search, add, and result confirmation in one catalog page.

**Contract**: Render add form above or near the catalog list for profiles with write capability. After successful create, redirect so the new item is visible, preferably through `/items?q=<title>` unless implementation chooses `/items` for clearer UX.

#### 3. Result rendering compatibility

**File**: `src/app/items/page.tsx`

**Intent**: Ensure database-created items render like seed items.

**Contract**: New items show title, formatted kind, formatted status, note when present, and participate in the result count and search.

#### 4. User-facing copy alignment

**File**: `src/components/ProfileAccessNotice.tsx` or page-local copy

**Intent**: Avoid implying guests can write or that admin/delete exists in S-03.

**Contract**: Family users see add affordance; guest users see read/search-only state. No delete/admin copy changes beyond clarifying future work.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Family profile sees the add item form on `/items`.
- Guest profile does not see an enabled add item form.
- Adding title + kind + status + note creates an item.
- Newly added item appears in the catalog after redirect.
- Newly added item is searchable by title and note.
- Mobile-width layout keeps profile notice, search form, add form, and results readable.

## Phase 4: Production Configuration Handoff

### Overview

Document the Vercel/Neon setup and verify the app fails safely when database configuration is missing.

### Changes Required

#### 1. Environment documentation

**File**: `.env.example` or `context/changes/add-catalog-item/plan.md`

**Intent**: Make required database variables discoverable without committing secrets.

**Contract**: List required env variable names and where they are configured in Vercel. Do not include real credentials.

#### 2. Operational notes

**File**: `context/changes/add-catalog-item/plan.md` or brief

**Intent**: Record that Neon/Vercel Marketplace is the production storage decision for S-03.

**Contract**: Include setup prerequisites, local development expectation, and rollback notes for database writes.

#### 3. Final verification

**File**: no dedicated file unless checks require one

**Intent**: Close the slice with a production-aware checklist.

**Contract**: Run all automated checks and manually verify add/search across family and guest profiles with the configured database.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:catalog` passes in the configured environment.
- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Vercel project has required Neon/Postgres environment variables configured.
- No real database credentials are committed.
- The app can add an item locally or in preview using the configured database.
- Existing search-current-item-state behavior still works with database-backed data.

## Testing Strategy

Automated:

- Run `npm.cmd run check:catalog`.
- Run `npm.cmd run check:profiles`.
- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.

Manual:

1. Confirm Neon/Postgres env variables are present locally or in the target preview environment.
2. Select a family profile and open `/items`.
3. Add an item with title, kind, status, and note.
4. Confirm the item appears after redirect and can be found by title and note.
5. Add another item with the same title and confirm duplicate title is allowed with a distinct id.
6. Switch to guest and confirm the write form is absent or disabled.
7. Attempt an invalid submission and confirm a readable validation message.
8. Check mobile layout for profile notice, search, add form, and results.

## Performance Considerations

The expected catalog size is small. Simple indexed Postgres reads and `ILIKE`/normalized text search are sufficient for MVP. Avoid search indexes, pagination, caching, realtime sync, or optimistic UI until the data volume or UX demands it.

## Migration Notes

S-03 introduces durable storage. Existing seed items should be inserted into the database through a migration/seed step or preserved as initial rows. The exported `CatalogItem` TypeScript shape should stay stable so S-02 UI continues to work. Rollback of code does not automatically roll back inserted user data; destructive data rollback is out of scope.

## Open Risks And Assumptions

- Neon/Postgres must be provisioned before implementation can fully verify the write path.
- Vercel Marketplace injects production/preview environment variables, but local `.env` setup remains a human-controlled step.
- Server-side authorization must not rely only on client context or hidden form fields.
- Introducing async database reads may require updating pages that currently call catalog functions synchronously.

## References

- PRD: `context/foundation/prd.md` FR-004, FR-005, US-01
- Roadmap item: `context/foundation/roadmap.md` S-03 / `add-catalog-item`
- Foundation plan: `context/changes/catalog-state-contract/plan.md`
- Search plan: `context/changes/search-current-item-state/plan.md`
- Infrastructure decision: `context/foundation/infrastructure.md`
- Vercel Postgres docs: https://vercel.com/docs/postgres
- Vercel Marketplace storage docs: https://vercel.com/docs/marketplace-storage
- Neon Marketplace page: https://vercel.com/marketplace/neon

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `- <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Durable Catalog Repository

#### Automated

- [x] 1.1 `npm.cmd run check:catalog` passes against the configured local/preview database. — c7446d1
- [x] 1.2 `npm.cmd run build` passes after async repository changes. — c7446d1
- [x] 1.3 `npm.cmd run lint` passes. — c7446d1

#### Manual

- [x] 1.4 No code path writes catalog data to JSON or process memory as the durable store. — c7446d1
- [x] 1.5 Catalog read/search still renders existing items from the database. — c7446d1
- [x] 1.6 Missing database configuration fails with an understandable message. — c7446d1

### Phase 2: Add Item Write Boundary

#### Automated

- [x] 2.1 `npm.cmd run check:catalog` passes with create/write contract coverage. — 7c84189
- [x] 2.2 `npm.cmd run check:profiles` passes. — 7c84189
- [x] 2.3 `npm.cmd run build` passes. — 7c84189
- [x] 2.4 `npm.cmd run lint` passes. — 7c84189

#### Manual

- [x] 2.5 Family profile can submit a valid add form. — 7c84189
- [x] 2.6 Guest profile cannot submit a catalog write, including via forged client state where practical to test. — 7c84189
- [x] 2.7 Invalid title/kind/status/note input is rejected with a readable message. — 7c84189
- [x] 2.8 Duplicate titles are allowed and produce distinct ids. — 7c84189

### Phase 3: Add Form UI And Catalog Integration

#### Automated

- [x] 3.1 `npm.cmd run check:catalog` passes. — 5cff66d
- [x] 3.2 `npm.cmd run check:profiles` passes. — 5cff66d
- [x] 3.3 `npm.cmd run build` passes. — 5cff66d
- [x] 3.4 `npm.cmd run lint` passes. — 5cff66d

#### Manual

- [x] 3.5 Family profile sees the add item form on `/items`. — 5cff66d
- [x] 3.6 Guest profile does not see an enabled add item form. — 5cff66d
- [x] 3.7 Adding title + kind + status + note creates an item. — 5cff66d
- [x] 3.8 Newly added item appears in the catalog after redirect. — 5cff66d
- [x] 3.9 Newly added item is searchable by title and note. — 5cff66d
- [x] 3.10 Mobile-width layout keeps profile notice, search form, add form, and results readable. — 5cff66d

### Phase 4: Production Configuration Handoff

#### Automated

- [x] 4.1 `npm.cmd run check:catalog` passes in the configured environment. — 6c92b86
- [x] 4.2 `npm.cmd run check:profiles` passes. — 6c92b86
- [x] 4.3 `npm.cmd run build` passes. — 6c92b86
- [x] 4.4 `npm.cmd run lint` passes. — 6c92b86

#### Manual

- [x] 4.5 Vercel project has required Neon/Postgres environment variables configured. — 6c92b86
- [x] 4.6 No real database credentials are committed. — 6c92b86
- [x] 4.7 The app can add an item locally or in preview using the configured database. — 6c92b86
- [x] 4.8 Existing search-current-item-state behavior still works with database-backed data. — 6c92b86
