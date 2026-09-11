---
bootstrapped_at: 2026-07-23T14:27:37+02:00
starter_id: next
starter_name: Next.js
project_name: family-shelf
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: failed
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
| npm package | create-next-app v16.2.11 published 2026-07-22T23:59:18.862Z | fresh | resolved from cmd_template |
| GitHub repo | not run | n/a | card docs_url is https://nextjs.org/docs, not a GitHub repository URL |

## Scaffold log

**Resolved invocation**: `npx.cmd create-next-app@latest .bootstrap-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
**Strategy**: subdir-then-move
**Exit code**: 1

**Stderr (last 20 lines)**:

```text
npm warn exec The following package was not found and will be installed: create-next-app@16.2.11
Could not create a project called ".bootstrap-scaffold" because of npm naming restrictions:
    * name cannot start with a period
```

**.bootstrap-scaffold left in place at**: not created by the CLI

## Post-scaffold audit

**Audit not run**: scaffold halted at Step 2; no project to audit.

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

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, the project was not scaffolded because the starter CLI rejected the temp directory name.

Useful manual steps in the meantime:
- Re-invoke `/10x-bootstrapper` after adjusting the temp directory naming strategy for Next.js.
- Keep the existing `context/` directory unchanged.
