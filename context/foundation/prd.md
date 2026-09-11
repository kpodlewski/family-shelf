---
project: Family Shelf
version: 1
status: draft
created: 2026-05-18
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 4
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

The main catalog owner lends physical items such as books, board games, PC games, and other household media to friends, then loses track of who has them and when they were borrowed. The cost today is that an item can effectively be lost because there is no reliable shared record of its borrowing state.

Notes and spreadsheets have not solved the problem because notes are easy to forget or lose, and a local spreadsheet is private to one person. The product needs to make the family inventory and borrowing state available to the family members who need it.

## User & Persona

Primary persona: the main catalog owner who creates the tool and is responsible for keeping track of physical household items.

### Secondary persona

Family members who need shared access to the catalog and borrowing state.

## Success Criteria

### Primary

- Borrowed items can be tracked.
- Family members can check where an item is placed.

### Secondary

- A family member can search for an item later and understand its current state without asking around.

### Guardrails

- Borrower name and borrowed date are optional in the MVP.
- The first usable MVP target is 4 weeks of after-hours work.

## User Stories

### US-01: Family member checks an item status

- **Given** a family member opens the shared URL and chooses their profile
- **When** they search for an item
- **Then** they can see the item's current borrowing/status state and any note that explains where it is or who has it

#### Acceptance Criteria

- Search can find an item that exists in the catalog.
- The item view shows whether the item is currently borrowed.
- If borrower name or borrowed date was provided, the item view shows those values.
- Item notes are visible from the item view.

### US-02: Family member records that an item was borrowed

- **Given** a family member has found an item in the catalog
- **When** they change the item status to borrowed
- **Then** the item is marked as borrowed, with optional borrower name and optional borrowed date

#### Acceptance Criteria

- Borrower name can be left empty.
- Borrowed date can be left empty.
- A borrowed item remains visibly borrowed when another family member opens it later.

### US-03: Admin protects destructive catalog actions

- **Given** the admin profile is protected by a password
- **When** someone tries to remove an item from the catalog
- **Then** that destructive action is available only to the admin profile

#### Acceptance Criteria

- Family member profiles cannot delete catalog items.
- The admin profile requires a password before admin-only actions are available.

## Functional Requirements

- FR-001: Family member can open the app from a shared private URL. Priority: must-have
- FR-002: Family member can choose a simple named profile. Priority: must-have
- FR-003: Admin can unlock the admin profile with a password. Priority: must-have
- FR-004: Family member can add an item to the catalog. Priority: must-have
- FR-005: Family member can search for an item. Priority: must-have
- FR-006: Family member can view an item's current borrowing/status state. Priority: must-have
- FR-007: Family member can change an item's borrowing/status state. Priority: must-have
- FR-008: Family member can add a note to an item. Priority: must-have
- FR-009: Admin can delete an item from the catalog. Priority: must-have

> Socratic: Editing item details was challenged and removed from the MVP because adding items plus notes/status changes is enough to solve the losing-borrowed-items pain.

## Non-Functional Requirements

- The app is usable on both phone and desktop browser sizes.
- Only people with the shared private URL can access the app.
- Family profiles do not require strict privacy boundaries between family members.

## Business Logic

Each item's current availability is determined by its latest saved status and note, so the family can quickly tell whether the item is available, borrowed, or described as being in a specific place.

The rule consumes user-facing inputs: item status, optional borrower name, optional borrowed date, and item note. Its output is the visible current state of the item in search results or item details.

## Access Control

Family members use simple named profiles without passwords. Access is granted through a shared private URL.

The app uses an admin plus family members model, but family members are not blocked from everyday catalog work: they can add items and change borrowing status. Admin-only scope is limited to managing access or family profiles, resolving administrative cleanup, and deleting catalog items.

For the MVP, it is acceptable that anyone with the shared URL may be able to enter, because the app is intended for private family use.

## Non-Goals

- No item photo upload in the MVP; photos can be added later if there is enough time.
- No editing existing item details in the MVP; adding items plus notes and status changes is enough for the first borrowed-item tracking flow.
- No structured item-place field in the MVP; place can be written in item notes.
- No real login system or multi-family/group separation in the MVP; the first version serves one family through a shared private URL.
- No strict privacy boundaries between family member profiles in the MVP; the catalog is shared family data.
- No status history in the MVP; only the current saved state matters.

## Open Questions

None.
