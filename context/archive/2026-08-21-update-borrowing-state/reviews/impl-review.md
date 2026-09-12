<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Update Borrowing State Implementation Plan

- **Plan**: `context/changes/update-borrowing-state/plan.md`
- **Scope**: Phase 1-3 of 3
- **Date**: 2026-08-21
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 - Client update form imports catalog contracts through server repository modules

- **Severity**: WARNING
- **Impact**: MEDIUM - real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: `src/components/UpdateCatalogItemForm.tsx:8`
- **Detail**: `UpdateCatalogItemForm` imports runtime values from `@/lib/catalog` and `@/lib/catalogValidation`. `catalogValidation` also imports runtime enums and types from `@/lib/catalog`, while `catalog.ts` is the server repository module and imports `node:crypto`, the database client, and profile authorization helpers. The build passes and `AddCatalogItemForm` already used this pattern, but S-04 extends a mixed client/server boundary instead of keeping UI-safe catalog contracts separate from repository code.
- **Fix**: Split shared catalog enums, item types, and validation limits into a client-safe module such as `src/lib/catalogContract.ts`; then import that module from the repository, validation helpers, and client forms.
  - Strength: Keeps UI components dependent on a pure contract module and reduces the chance that future repository code leaks into client bundles.
  - Tradeoff: Touches several files because the existing add-item form and validation helper use the same pattern.
  - Confidence: HIGH - the import graph shows client components using values from the repository module, and the split is a standard boundary cleanup.
  - Blind spot: I did not inspect emitted client chunks; `next build` currently succeeds, so this is architectural risk rather than a present runtime failure.
- **Decision**: FIXED - split catalog types, enums, and limits into `src/lib/catalogContract.ts`; updated repository, validation, format helpers, and client forms to import from the client-safe contract module.

## Verification

| Command | Result |
|---------|--------|
| `npm.cmd run check:catalog` | PASS - Catalog contract check passed. |
| `npm.cmd run check:profiles` | PASS - Profile contract check passed. |
| `npm.cmd run build` | PASS - Next.js production build completed. |
| `npm.cmd run lint` | PASS - ESLint completed with no reported issues. |

## Triage Verification

| Command | Result |
|---------|--------|
| `npm.cmd run check:catalog` | PASS - Catalog contract check passed after F1 fix. |
| `npm.cmd run check:profiles` | PASS - Profile contract check passed after F1 fix. |
| `npm.cmd run build` | PASS - Next.js production build completed after F1 fix. |
| `npm.cmd run lint` | PASS - ESLint completed with no reported issues after F1 fix. |

## Notes

- Implemented phases match the plan: repository/API update contract, inline family-only update UI, route refresh preserving current URL, and final verification.
- Scope guardrails held: no history, delete, admin unlock, item detail page, modal, optimistic UI, or borrowed-date editing was added.
- Manual progress items are all marked complete in `## Progress`; the code and checks provide observable support for the server write boundary, guest read-only behavior, persistence, search compatibility, and contract-row cleanup.
