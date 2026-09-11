---
bootstrapped_at: 2026-07-23T14:50:20+02:00
starter_id: next
starter_name: Next.js
project_name: family-shelf
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: next
package_manager: npm
project_name: family-shelf
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

A solo builder shipping a small shared catalog MVP in a short after-hours window needs a battle-tested, well-documented web starter that can support browsing, search, notes, and status updates without a lot of custom infrastructure. Next.js with TypeScript and Vercel is the best fit for the product because it keeps the MVP fast to build and easy to deploy while staying aligned with the PRD's low-traffic, low-complexity goals.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | create-next-app v16.2.11 published 2026-07-23T12:40:29.973Z | fresh | resolved from cmd_template |
| GitHub repo | not run | n/a | card docs_url is https://nextjs.org/docs, not a GitHub repository URL |

## Scaffold log

**Resolved invocation**: `npx.cmd create-next-app@latest bootstrap-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
**Strategy**: subdir-then-move with a valid temp package name for create-next-app
**Exit code**: 0
**Files moved**: 20841
**Conflicts (.scaffold siblings)**: AGENTS.md.scaffold
**.gitignore handling**: moved silently
**bootstrap-scaffold cleanup**: deleted

Post-merge hygiene:
- Renamed the root package from `bootstrap-scaffold` to `family-shelf`.
- Scoped TypeScript and ESLint to the root app so existing course/tooling folders are not checked as app source.
- Removed remote Google font usage from the root layout so builds do not depend on fetching font CSS.

Verification commands:
- `npm.cmd run build`: passed
- `npm.cmd run lint`: passed

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 2 HIGH, 1 MODERATE, 0 LOW
**Direct vs transitive**: 0/1/0/0 direct of total 0/2/1/0

#### HIGH findings

- `next` direct dependency is affected via `postcss` and `sharp`; npm reports the current advisory range as `9.3.4-canary.0 - 16.3.0-preview.7`.
- `sharp` transitive dependency has inherited libvips vulnerabilities; npm reports this through `next`.

#### MODERATE findings

- `postcss` transitive dependency has an XSS advisory for CSS stringification; npm reports this through `next`.

#### LOW / INFO findings

None reported.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | verified |
| quality_override | false |
| path_taken | standard |
| self_check_answers | null |
| team_size | solo |
| deployment_target | vercel |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | false |
| has_payments | false |
| has_realtime | false |
| has_ai | false |
| has_background_jobs | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified.

Useful manual steps in the meantime:
- `git init` if you have not already started your own repo history.
- Review `AGENTS.md.scaffold` and decide whether any generated guidance should be merged into the existing `AGENTS.md`.
- Track the npm audit findings and update `next` when a patched release is available.
