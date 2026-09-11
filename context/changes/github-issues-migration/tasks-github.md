---
project: Family Shelf
source: context/foundation/roadmap.md
task_system: GitHub Issues
repository: kpodlewski/family-shelf
created: 2026-07-24
updated: 2026-07-24
status: migrated
---

# GitHub Tasks Migration

This file records the migration from `context/foundation/roadmap.md` to GitHub Issues.

## Labels

| Label | Meaning |
|---|---|
| `roadmap` | Roadmap item migrated from `context/foundation/roadmap.md`. |
| `foundation` | Foundation work that supports later slices. |
| `slice` | End-to-end product slice. |
| `ready-for-planning` | Ready to plan or implement; not done. |
| `proposed` | Proposed roadmap work that is not ready yet. |

## Issue Map

| Roadmap ID | GitHub Issue | Type | Status label | Change ID |
|---|---|---|---|---|
| F-01 | [#1 Catalog state contract](https://github.com/kpodlewski/family-shelf/issues/1) | foundation | `ready-for-planning` | `catalog-state-contract` |
| S-01 | [#2 Shared entry and profile selection](https://github.com/kpodlewski/family-shelf/issues/2) | slice | `ready-for-planning` | `shared-entry-profile-selection` |
| S-02 | [#3 Search current item state](https://github.com/kpodlewski/family-shelf/issues/3) | slice | `proposed` | `search-current-item-state` |
| S-03 | [#4 Add catalog item](https://github.com/kpodlewski/family-shelf/issues/4) | slice | `proposed` | `add-catalog-item` |
| S-04 | [#5 Update borrowing state](https://github.com/kpodlewski/family-shelf/issues/5) | slice | `proposed` | `update-borrowing-state` |
| S-05 | [#6 Admin delete item](https://github.com/kpodlewski/family-shelf/issues/6) | slice | `proposed` | `admin-delete-item` |

## Dependency Order

1. F-01 and S-01 can be planned first.
2. S-02 and S-03 depend on F-01 and S-01.
3. S-04 depends on F-01, S-02, and S-03.
4. S-05 depends on F-01, S-01, and S-03.

## Notes

- `ready-for-planning` means the task is ready to be broken down or implemented. It does not mean the issue is complete.
- Closing an issue is the completion signal; no separate `done` label is used.
- Issue bodies contain the copied roadmap outcome, PRD refs, prerequisites, risks, and suggested `/10x-plan` handoff.
