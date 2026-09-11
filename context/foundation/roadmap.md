---
project: Family Shelf
version: 1
status: proposed
created: 2026-07-24
updated: 2026-09-11
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

## Backlog Handoff

| Roadmap ID | Change ID | Suggested handoff |
|---|---|---|
| F-01 | catalog-state-contract | completed |
| S-01 | shared-entry-profile-selection | completed |
| S-02 | search-current-item-state | completed |
| S-03 | add-catalog-item | completed |
| S-04 | update-borrowing-state | completed |
| S-05 | admin-delete-item | completed |

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
