# Add Catalog Item - Plan Brief

> Full plan: `context/changes/add-catalog-item/plan.md`

## What & Why

Build S-03: family users can add new catalog items and see them in the shared catalog. This is the first write slice, so it introduces real Vercel-compatible durable storage instead of extending the seed-only repository.

## Starting Point

The app already has profile selection, read-only guest capability, and URL-backed catalog search. Catalog data currently comes from `src/lib/catalog.ts`, which intentionally stayed read/query-only and in-memory until a write slice chose persistence.

## Desired End State

Family profiles can add title, kind, status, and optional note from `/items`. The new item is saved in Neon Postgres, appears after redirect, and is searchable by title/note. Guests remain read-only and server write logic rejects guest writes.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Storage | Neon Postgres via Vercel Marketplace | Correct durable storage for Vercel serverless. |
| Add fields | title, kind, status, optional note | Enough control for S-03 without taking borrower/date update scope. |
| UI location | `/items` | Add, search, and result confirmation stay in one catalog workflow. |
| Success path | Redirect to visible catalog result | User immediately sees the created item. |
| Permissions | Family-only write, server-enforced | Matches `catalog:write` and protects against forged UI state. |
| Validation | Trimmed title, enum kind/status, note max, duplicate titles allowed | Keeps id as identity and avoids title uniqueness traps. |
| Checks | Extend `check:catalog` | Fits current lightweight verification style. |

## Scope

**In scope:**

- Neon/Postgres-backed catalog repository.
- `catalog_items` schema/migration/seed path.
- Create item write operation.
- Add form on `/items` for family profiles.
- Server-side write authorization.
- Validation for title/kind/status/note.
- `check:catalog` coverage for read/search/create contract.

**Out of scope:**

- JSON file persistence or in-memory write store.
- Update, delete, admin unlock, item details page.
- Borrower/date fields in the add form.
- Status history, image upload, filters, pagination, realtime sync.

## Architecture / Approach

Introduce a thin database boundary for Neon/Postgres, keep catalog business logic in `src/lib/catalog.ts` or adjacent repository modules, and keep UI components free of SQL. `/items` renders async catalog data, a family-only add form calls a server boundary, and successful create redirects to a catalog view where the new row is visible.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Durable Catalog Repository | Neon-backed read/search repository and schema/check scaffolding | DB env/setup may block full verification. |
| 2. Add Item Write Boundary | Server-side create, validation, and family-only authorization | Must not trust client-only profile state. |
| 3. Add Form UI And Catalog Integration | Family add form on `/items`, visible created item | Page can get crowded on mobile. |
| 4. Production Configuration Handoff | Env docs and final Vercel/Neon verification | Secrets/config are human-controlled and must not leak. |

**Prerequisites:** Neon/Postgres resource provisioned for the Vercel project, with env vars available locally or in preview.
**Estimated effort:** Medium, roughly 2-4 implementation sessions across 4 phases.

## Open Risks & Assumptions

- Neon setup may require a human action in Vercel Marketplace before code can fully pass checks.
- Existing sync catalog calls must become async safely.
- Server-side authorization needs a reliable session/profile verification path.

## Success Criteria (Summary)

- Family user can add an item and immediately find it in catalog/search.
- Guest user remains read-only and cannot write through forged requests.
- Data persists in Neon/Postgres and no real credentials are committed.
