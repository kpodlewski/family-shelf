---
change_id: testing-minimal-ui-gate-wiring
title: Minimal UI and gate wiring
status: archived
created: 2026-09-12
updated: 2026-09-12
archived_at: 2026-09-12T08:55:43Z
---

## Notes

Open a change folder for rollout Phase 4 of context/foundation/test-plan.md: "Minimal UI and gate wiring".
Risks covered: #1 Production family/admin login breaks, #2 Family user enters the app but cannot view the item catalog, #3 Catalog list/search/status update regresses and current state becomes untrustworthy, #4 Guest can perform write or delete actions. Test types planned: e2e + gates.
Risk response intent:

- #1: keep critical login/admin unlock protected by deployed-like checks without duplicating the profile/session contract suite.
- #2: prove a real user path can enter the app and view readable catalog data.
- #3: add the smallest UI-level confidence for list/search/status behavior now that API contracts cover durable state.
- #4: prove visible guest UI boundaries align with server-side authorization, without treating hidden controls as the only protection.

Avoid pixel-perfect visual coverage for every screen; this phase should add only the minimal UI/e2e layer and gate wiring that protects the critical login/catalog flows.
