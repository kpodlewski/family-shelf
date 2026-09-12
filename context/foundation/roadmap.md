---
project: Family Shelf
version: 1
status: proposed
created: 2026-07-24
updated: 2026-09-12
prd_version: 1
main_goal: speed
top_blocker: time
---

## Vision recap

Family Shelf helps a small family track shared physical items so borrowed or misplaced items do not disappear into memory gaps. The roadmap optimizes for speed: ship visible family value in thin end-to-end increments before polishing secondary workflows.

## North star

The north star - the smallest user-visible flow that proves the product is useful - is `S-02`: a family member can search the catalog and see the current item state plus note. This directly addresses the PRD's core problem: family members should know whether an item is available, borrowed, or described as being in a specific place.

## At a glance

| ID | Type | Outcome | Change ID | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|---|
| F-01 | foundation | Minimal shared catalog state exists so vertical slices can read and update the same items. | catalog-state-contract | none | FR-004, FR-005, FR-006, FR-007, FR-008, US-01, US-02 | impl_reviewed |
| S-01 | slice | Family member can open the shared app and choose a simple profile. | shared-entry-profile-selection | none | FR-001, FR-002, US-01, US-02 | impl_reviewed |
| S-02 | slice | Family member can search for an item and see its current status and note. | search-current-item-state | F-01, S-01 | FR-005, FR-006, FR-008, US-01 | impl_reviewed |
| S-03 | slice | Family member can add a new item that appears in the catalog. | add-catalog-item | F-01, S-01 | FR-004, FR-005, US-01 | impl_reviewed |
| S-04 | slice | Family member can change borrowing status and note for an item. | update-borrowing-state | F-01, S-02, S-03 | FR-006, FR-007, FR-008, US-02 | impl_reviewed |
| S-05 | slice | Admin can unlock protected destructive actions and delete an item. | admin-delete-item | F-01, S-01, S-03 | FR-003, FR-009, US-03 | impl_reviewed |
| F-02 | foundation | Critical access and catalog smoke protects production login and item visibility. | testing-critical-access-catalog-smoke | F-01, S-01, S-02, S-05 | FR-001, FR-003, FR-005, FR-006, US-01 | implemented |
| F-03 | foundation | Catalog mutation contracts protect durable add/update/delete/readback behavior. | testing-catalog-mutation-contracts | F-01, S-02, S-03, S-04, S-05 | FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, US-01, US-02, US-03 | implemented |
| F-04 | foundation | Authorization regression boundaries protect guest/family/admin server-side access. | testing-authorization-regression-boundary | F-02, F-03 | FR-003, FR-009, US-03 | implemented |
| F-05 | foundation | Minimal UI e2e wiring protects login, catalog search, guest read-only UI, and admin delete-control visibility. | testing-minimal-ui-gate-wiring | F-02, F-03, F-04 | FR-001, FR-003, FR-005, FR-006, FR-009, US-01, US-03 | archived |
| M-01 | maintenance | Bootstrap verification notes preserve setup evidence and local server logs. | bootstrap-verification | none | n/a | active |
| M-02 | maintenance | GitHub issue migration notes preserve external task handoff state. | github-issues-migration | none | n/a | active |

## Baseline

- Frontend: partial/present - app shell and placeholder pages exist for home, catalog, and admin screens.
- Backend/API: absent - no request handlers or server-side catalog operations are wired.
- Data: absent - catalog data is currently local mock data in UI components.
- Auth/access: absent - profile selection and admin password flow are not implemented.
- Deploy/infra: present - Vercel decision and first deployment are recorded in foundation/deployment docs.
- Observability: absent - no dedicated logging, metrics, or error tracking layer is present; this is acceptable for the first MVP slices.

## Foundations

### F-01: Minimal shared catalog state exists so vertical slices can read and update the same items.

**Outcome**: The app has the smallest shared catalog state contract needed for search, add, status update, notes, and delete flows to operate on the same item records.

**Change ID**: catalog-state-contract

**PRD refs**: FR-004, FR-005, FR-006, FR-007, FR-008, US-01, US-02

**Prerequisites**: none

**Parallel with**: S-01

**Blockers**: none

**Unknowns**:

- Storage implementation is intentionally left to `/10x-plan`; the roadmap only requires shared state semantics. Block: no.

**Risk**: If this grows into a full data layer up front, it will slow the MVP. Keep it to the minimum state contract required by the first visible flows.

**Status**: impl_reviewed

**Unlocks**: S-02, S-03, S-04, S-05

### F-02: Critical access and catalog smoke protects production login and item visibility.

**Outcome**: Production-facing smoke checks prove configured family/admin credentials unlock the intended sessions and `/items` renders readable seed catalog data.

**Change ID**: testing-critical-access-catalog-smoke

**PRD refs**: FR-001, FR-003, FR-005, FR-006, US-01

**Prerequisites**: F-01, S-01, S-02, S-05

**Parallel with**: none

**Blockers**: none

**Unknowns**:

- Production smoke depends on current deployed environment variables and stable seed rows. Block: no.

**Risk**: Local success can hide production env drift. Keep smoke checks env-backed and non-destructive.

**Status**: implemented

**Unlocks**: F-03, F-04, F-05

### F-03: Catalog mutation contracts protect durable add/update/delete/readback behavior.

**Outcome**: Contract and API checks prove catalog search, add, update, delete, and readback behavior against durable contract-owned rows.

**Change ID**: testing-catalog-mutation-contracts

**PRD refs**: FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, US-01, US-02, US-03

**Prerequisites**: F-01, S-02, S-03, S-04, S-05

**Parallel with**: none

**Blockers**: none

**Unknowns**:

- Contract checks require database connectivity and cleanup guarantees for contract-owned rows. Block: no.

**Risk**: Tests that mutate seed or user rows would make the catalog untrustworthy. Keep mutation checks scoped to contract-owned rows.

**Status**: implemented

**Unlocks**: F-04, F-05

### F-04: Authorization regression boundaries protect guest/family/admin server-side access.

**Outcome**: Integration checks prove guest evidence is rejected for writes/deletes and destructive work requires both write-capable family evidence and admin unlock.

**Change ID**: testing-authorization-regression-boundary

**PRD refs**: FR-003, FR-009, US-03

**Prerequisites**: F-02, F-03

**Parallel with**: none

**Blockers**: none

**Unknowns**:

- UI affordance checks are useful but not a security boundary. Block: no.

**Risk**: Hidden buttons alone do not prove authorization. Keep server-side authorization checks in contract/API scripts.

**Status**: implemented

**Unlocks**: F-05

### F-05: Minimal UI e2e wiring protects login, catalog search, guest read-only UI, and admin delete-control visibility.

**Outcome**: Minimal Playwright coverage proves hydrated profile entry, catalog seed visibility/search, guest read-only affordances, and admin delete-control visibility.

**Change ID**: testing-minimal-ui-gate-wiring

**PRD refs**: FR-001, FR-003, FR-005, FR-006, FR-009, US-01, US-03

**Prerequisites**: F-02, F-03, F-04

**Parallel with**: none

**Blockers**: none

**Unknowns**:

- E2e runs require a local app server, browser install, env-backed passwords, and seed rows. Block: no.

**Risk**: Browser tests can sprawl into pixel-perfect or destructive flows. Keep this suite minimal and non-destructive.

**Status**: archived

**Unlocks**: none

## Slices

### S-01: Family member can open the shared app and choose a simple profile.

**Outcome**: A family member reaches the app through the shared entry point and selects a simple named profile before everyday catalog work.

**Change ID**: shared-entry-profile-selection

**PRD refs**: FR-001, FR-002, US-01, US-02

**Prerequisites**: none

**Parallel with**: F-01

**Blockers**: none

**Unknowns**:

- Exact profile names and whether they are fixed or user-created can be decided during planning. Block: no.

**Risk**: Overbuilding profile privacy would violate the PRD's explicit non-goal. Keep profiles lightweight and shared-family oriented.

**Status**: impl_reviewed

### S-02: Family member can search for an item and see its current status and note.

**Outcome**: A family member can search the catalog and understand whether an item is available, borrowed, or described by a note.

**Change ID**: search-current-item-state

**PRD refs**: FR-005, FR-006, FR-008, US-01

**Prerequisites**: F-01, S-01

**Parallel with**: S-03 after F-01 and S-01 are complete

**Blockers**: time

**Unknowns**:

- Search behavior can start simple; fuzzy search, filters, and sorting are not required by the PRD. Block: no.

**Risk**: This slice can absorb too much UI polish. Ship the smallest status-and-note lookup that proves the family can find an item.

**Status**: impl_reviewed

### S-03: Family member can add a new item that appears in the catalog.

**Outcome**: A family member can add an item and then see it as part of the shared catalog.

**Change ID**: add-catalog-item

**PRD refs**: FR-004, FR-005, US-01

**Prerequisites**: F-01, S-01

**Parallel with**: S-02 after F-01 and S-01 are complete

**Blockers**: time

**Unknowns**:

- Required item fields should remain minimal because editing details is not in the MVP. Block: no.

**Risk**: Adding too many fields recreates the removed "edit item details" scope. Keep the item shape narrow.

**Status**: impl_reviewed

### S-04: Family member can change borrowing status and note for an item.

**Outcome**: A family member can mark an item as borrowed or available and attach a note explaining who has it or where it is.

**Change ID**: update-borrowing-state

**PRD refs**: FR-006, FR-007, FR-008, US-02

**Prerequisites**: F-01, S-02, S-03

**Parallel with**: none

**Blockers**: time

**Unknowns**:

- Borrower name and borrowed date are optional in the PRD; planning should keep them optional. Block: no.

**Risk**: Status history is explicitly out of scope. Store only the current visible state unless the PRD changes.

**Status**: impl_reviewed

### S-05: Admin can unlock protected destructive actions and delete an item.

**Outcome**: Admin-only deletion is protected by a password gate, while family members cannot delete catalog items.

**Change ID**: admin-delete-item

**PRD refs**: FR-003, FR-009, US-03

**Prerequisites**: F-01, S-01, S-03

**Parallel with**: S-04 after S-03 is complete

**Blockers**: time

**Unknowns**:

- Password setup and recovery can stay minimal for the MVP because this serves one private family. Block: no.

**Risk**: Turning this into a full login system would violate the PRD non-goal. Keep the admin gate narrow and only for destructive actions.

**Status**: impl_reviewed

## Maintenance

### M-01: Bootstrap verification notes preserve setup evidence and local server logs.

**Outcome**: Bootstrap verification artifacts capture setup checks and local dev-server evidence for future troubleshooting.

**Change ID**: bootstrap-verification

**PRD refs**: n/a

**Prerequisites**: none

**Parallel with**: none

**Blockers**: none

**Unknowns**:

- This folder predates the current change.md convention. Block: no.

**Risk**: Treat this as project evidence, not a product slice.

**Status**: active

### M-02: GitHub issue migration notes preserve external task handoff state.

**Outcome**: GitHub issue migration notes capture the external task handoff state for follow-up coordination.

**Change ID**: github-issues-migration

**PRD refs**: n/a

**Prerequisites**: none

**Parallel with**: none

**Blockers**: none

**Unknowns**:

- This folder predates the current change.md convention. Block: no.

**Risk**: Treat this as coordination evidence, not a product slice.

**Status**: active

## Backlog Handoff

| Roadmap ID | Change ID | Suggested handoff |
|---|---|---|
| F-01 | catalog-state-contract | completed |
| F-02 | testing-critical-access-catalog-smoke | completed |
| F-03 | testing-catalog-mutation-contracts | completed |
| F-04 | testing-authorization-regression-boundary | completed |
| F-05 | testing-minimal-ui-gate-wiring | archived |
| S-01 | shared-entry-profile-selection | completed |
| S-02 | search-current-item-state | completed |
| S-03 | add-catalog-item | completed |
| S-04 | update-borrowing-state | completed |
| S-05 | admin-delete-item | completed |
| M-01 | bootstrap-verification | active |
| M-02 | github-issues-migration | active |

## Open Roadmap Questions

No blocking roadmap questions. Implementation details such as the specific persistence approach, exact profile list, and admin password storage belong in `/10x-plan` for the relevant change.

## Parked

- Edit item details.
- Item photo upload.
- Structured item-place field.
- Real login system.
- Multi-family or group separation.
- Strict profile privacy.
- Status history.

## Done

- F-01 `catalog-state-contract`
- S-01 `shared-entry-profile-selection`
- S-02 `search-current-item-state`
- S-03 `add-catalog-item`
- S-04 `update-borrowing-state`
- S-05 `admin-delete-item`
- F-05 `testing-minimal-ui-gate-wiring`
