# Shared Entry Profile Selection — Plan Brief

> Full plan: `context/changes/shared-entry-profile-selection/plan.md`

## What & Why

This plan implements S-01: a family member opens the shared app and chooses a simple profile before catalog work. It adds lightweight profile access for the MVP: four family profile placeholders share one family password from environment/config, while a guest profile can read/search only.

## Starting Point

The app currently has static App Router pages and no active profile state. The PRD wants simple family profiles, shared private URL access, and no real login system or strict privacy boundaries.

## Desired End State

First-time visitors see profile selection before the app content. Family profiles require the shared family password, guest can enter read-only, and the active profile is remembered after refresh and shown in the app shell.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Profile set | Four family profiles plus one guest | Matches the user's intended MVP without committing private names. |
| Family password | One shared password | Adds light access control without per-user auth. |
| Password storage | Env/config, no UI | Keeps secrets out of source and avoids profile administration scope. |
| Guest access | Browse/search only | Establishes read-only behavior before write slices arrive. |
| Session memory | localStorage/session flag | Keeps the chosen profile after refresh without backend session storage. |
| Entry UX | Home/shared entry gate | Satisfies the shared entry point requirement with minimal routing. |

## Scope

**In scope:**

- Typed profile contract with roles and capabilities.
- Four neutral family profile placeholders and one guest profile.
- Server-side password verification route for the shared family password.
- Client profile picker/gate with localStorage persistence.
- Active profile display and guest read-only signal.
- Lightweight `check:profiles` verification script.

**Out of scope:**

- Full authentication, user accounts, password reset, OAuth, or sessions database.
- Admin password unlock and delete flow.
- Profile management UI.
- Catalog add/update/delete behavior.
- Real private per-profile catalog data.

## Architecture / Approach

Add a small `src/lib/profiles.ts` contract that defines profile roles and capabilities. A server route verifies the shared family password from env/config, while a client profile gate stores only non-secret selected-profile metadata and wraps the existing pages through the app layout.

## Phases At A Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Profile Contract And Config Validation | Typed profile/capability model plus `check:profiles` | Accidentally encoding secrets or private names. |
| 2. Profile Selection And Session Memory | Profile picker, family password verification, localStorage persistence | Leaking password into client code or overbuilding auth. |
| 3. UI Adoption And Read-Only Signals | Active profile shell and guest read-only affordance | Implying future write/admin behavior exists before it does. |

**Prerequisites:** F-01 is already implemented; no code prerequisite blocks S-01.
**Estimated effort:** ~2-3 focused sessions across 3 phases.

## Open Risks & Assumptions

- The shared family password is an MVP gate, not hardened authentication.
- Guest read-only enforcement becomes more important once S-03/S-04 add write forms.
- Real family names stay out of the plan and source until intentionally configured.

## Success Criteria (Summary)

- Users must choose guest or a family profile before catalog content is available.
- Guest can enter without password and is visibly read-only.
- Family profile entry requires the configured shared family password and persists after refresh.
