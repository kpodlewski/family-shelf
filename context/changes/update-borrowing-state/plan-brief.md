# Update Borrowing State - Plan Brief

> Full plan: `context/changes/update-borrowing-state/plan.md`

## What & Why

Build S-04: family users can update an item's current borrowing state directly from the catalog. This closes the main MVP loop after search and add: the shared shelf can now reflect what is currently borrowed, by whom, and with what note.

## Starting Point

The app already has Neon-backed catalog reads/writes, URL search, profile selection, and an add-item form on `/items`. The table already contains `status`, `borrower_name`, `note`, and `updated_at`, but there is no update repository function, update API route, or inline update UI.

## Desired End State

Family profiles can update `status`, `note`, and optional `borrowerName` inline on `/items`. Guest profiles remain read/search-only, forged writes are rejected server-side, and successful updates refresh the current list without losing the current search URL.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Update fields | `status`, `note`, optional `borrowerName` | Captures current borrowing state without adding history/date complexity. |
| UI location | Inline on `/items` | Keeps update in the same search/current-state workflow. |
| Permissions | Family-only via `catalog:write` | Reuses the existing S-03 write boundary. |
| Post-save behavior | Refresh current route/search | Keeps users in context after editing a filtered list. |
| History | None | Roadmap asks for current visible state, not audit history. |

## Scope

**In scope:**

- Update current status.
- Update nullable note.
- Update nullable borrowerName.
- Family-only server-side authorization.
- Inline controls on `/items`.
- Contract checks for update behavior and cleanup.

**Out of scope:**

- Status history.
- Borrowed date editing.
- Delete/admin behavior.
- Item detail page, modal, or drawer.
- Optimistic UI.
- Per-profile ownership rules.

## Architecture / Approach

Follow the S-03 pattern: add validation and repository update support, expose a narrow authenticated `PATCH /api/catalog-items/[id]` boundary, then add a client form that uses `useActiveProfileSession()` and refreshes the current route on success.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Update Repository And API Contract | Durable update function, validation, API route, and check coverage | Accidentally allowing guest/forged writes or leaving contract rows in DB |
| 2. Inline Update UI On Catalog Items | Family-only inline update controls on `/items` | Dense item cards on mobile |
| 3. Final Verification And Handoff | Full checks and final manual coverage | Regression in add/search flows |

**Prerequisites:** S-02 and S-03 implemented against Neon/Postgres.  
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Last-write-wins is acceptable for concurrent edits in MVP.
- Shared family profile session is sufficient write evidence for this private family app.
- `borrowedDate` remains read-only until a future slice changes scope.

## Success Criteria (Summary)

- Family can update an item's status, borrowerName, and note from `/items`.
- Guest can browse/search but cannot update.
- Updated borrowerName and note remain visible, searchable, and durable after refresh.
