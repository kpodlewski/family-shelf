---
change_id: testing-catalog-mutation-contracts
title: Catalog mutation contracts
status: impl_reviewed
created: 2026-09-11
updated: 2026-09-12
archived_at: null
---

## Notes

Open a change folder for rollout Phase 2 of context/foundation/test-plan.md: "Catalog mutation contracts". Risks covered: #3 Catalog list/search/status update regresses and current state becomes untrustworthy, #5 Durable catalog mutations lie or lose state after add/update/delete, #6 Admin delete removes the wrong item or fails without a safe rejection. Test types planned: contract + integration. Risk response intent:

- #3: prove search and status update preserve visible current state across refresh/readback; challenge that UI form state proves persisted catalog state; avoid testing only formatter helpers or copying SQL expectations from implementation.
- #5: prove add/update/delete operations change exactly the intended durable row and subsequent list/search reflects it; challenge that returning 200 proves durable state changed correctly; avoid brittle ordering and tests that mutate real user rows.
- #6: prove delete targets a stable item id, returns safe errors for missing/unauthorized cases, and does not affect other rows; challenge that title or visible card position can be treated as identity; avoid broad end-to-end delete without asserting side effects.

After creating the folder, follow the downstream continuation rule.
