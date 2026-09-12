# Admin Delete Item - Plan Brief

> Full plan: `context/changes/admin-delete-item/plan.md`

## What & Why

Build the final MVP slice: protected admin deletion for catalog items. The goal is to let the family clean up the catalog while keeping destructive actions separate from everyday family add/update workflows.

## Starting Point

The app already has family profile sessions, catalog add/update APIs, and a Postgres-backed catalog. `/admin` is currently a placeholder, and `/items` is the active catalog workflow where delete controls should appear after admin unlock.

## Desired End State

A family user unlocks admin mode with a separate admin password on `/admin`. After unlock, `/items` shows delete controls; confirming a delete removes the item by stable id and returns to `/items`. Guest and non-unlocked family sessions cannot delete.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Admin credential | Separate admin password | Prevents normal family catalog write access from implying delete access. |
| Unlock persistence | Local admin token | Matches the private-family MVP and avoids repeated unlocks during cleanup. |
| Delete surface | `/items` after unlock | Keeps delete close to item context and existing search workflow. |
| Confirmation | Standard confirm dialog | Lightweight guard chosen for MVP speed. |
| API evidence | Family profile session plus admin token | Requires both app access and admin unlock for destructive mutation. |
| Verification | Delete one contract-owned row | Covers database semantics without touching real user rows. |

## Scope

**In scope:**

- Separate admin password configuration.
- Admin token creation/verification.
- `/admin` unlock UI.
- `DELETE /api/catalog-items/[id]`.
- Catalog repository delete function.
- Delete controls on `/items` after admin unlock.
- Contract-row delete coverage in `check:catalog`.

**Out of scope:**

- Full login system or admin profile in profile picker.
- Bulk delete, soft delete, undo, audit log, or status history.
- Item detail pages or edit-item-details.
- Password reset or role management UI.

## Architecture / Approach

Keep the existing profile/session model for ordinary app access, then add a narrow admin unlock layer. Delete requests carry `profileId`, `sessionToken`, and `adminToken`; the route validates the active family session, validates admin unlock, then deletes the item by id through the catalog repository.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Admin Unlock Boundary | Separate admin password, token, API, and `/admin` unlock UI | Accidentally leaking or overusing admin secret client-side |
| 2. Delete Repository And API | Durable delete operation, `DELETE` route, contract check | Conflating family write access with delete access |
| 3. Delete UI On `/items` | Admin-only delete controls with confirmation | Destructive UI appearing for the wrong user/session |
| 4. Final Verification And Handoff | Full checks and admin env documentation | Missing manual coverage for destructive edge cases |

**Prerequisites:** Existing family password/profile session and configured Postgres database.
**Estimated effort:** About 2-3 focused implementation sessions across 4 phases.

## Open Risks & Assumptions

- Local-storage admin unlock is acceptable for this private family MVP.
- Deleted data is permanently removed; no soft-delete safety net is planned.
- Changing the admin password should invalidate existing admin tokens.

## Success Criteria (Summary)

- Admin can unlock from `/admin` and delete a test item from `/items`.
- Guest and non-unlocked family sessions cannot delete.
- Existing search/add/update flows and all standard checks continue to pass.
