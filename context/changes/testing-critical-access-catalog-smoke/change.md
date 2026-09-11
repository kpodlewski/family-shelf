---
change_id: testing-critical-access-catalog-smoke
title: Critical access and catalog smoke
status: implementing
created: 2026-09-11
updated: 2026-09-11
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical access and catalog smoke".
Risks covered: #1 Production family/admin login breaks, #2 Family user enters the app but cannot view the item catalog. Test types planned: contract + smoke.
Risk response intent:

- #1: prove correct env-backed family and admin credentials unlock only the intended sessions; missing/wrong config fails readably.
- #2: prove a valid family session reaches /items and receives a non-empty readable catalog from the real data boundary.
After creating the folder, follow the downstream continuation rule.
