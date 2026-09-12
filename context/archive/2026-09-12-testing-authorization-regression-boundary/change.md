---
change_id: testing-authorization-regression-boundary
title: Authorization regression boundary
status: archived
created: 2026-09-12
updated: 2026-09-12
archived_at: 2026-09-12T09:05:34Z
---

## Notes

Open a change folder for rollout Phase 3 of context/foundation/test-plan.md: "Authorization regression boundary".
Risks covered: #4 Guest can perform write or delete actions, #6 Admin delete removes the wrong item or fails without a safe rejection. Test types planned: contract + integration.
Risk response intent:

- #4: prove guest evidence is rejected for add/update/delete while family/admin evidence is required for destructive work; challenge that hidden buttons are authorization; avoid UI-only permission tests and over-mocking auth helpers.
- #6: prove delete targets a stable item id, returns safe errors for missing/unauthorized cases, and does not affect other rows; challenge that title or visible card position can be treated as identity; avoid broad end-to-end delete without asserting side effects.

After creating the folder, follow the downstream continuation rule.
