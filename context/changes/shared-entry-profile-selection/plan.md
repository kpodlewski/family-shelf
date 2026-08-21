# Shared Entry Profile Selection Implementation Plan

## Overview

Implement the roadmap's S-01 slice: a family member opens the shared app, chooses a simple profile, and can continue into catalog work with that profile visible. The plan keeps this as auth-light MVP access, not a full login system: four family profiles share one family password from environment/config, while a guest profile can read/search only.

## Current State Analysis

- `context/foundation/prd.md` defines FR-001 and FR-002 as must-have shared URL access and simple named profile selection. It also says real login, multi-family separation, and strict profile privacy are non-goals for the MVP.
- `context/foundation/roadmap.md` marks `shared-entry-profile-selection` as S-01, with no prerequisites and as a prerequisite for S-02 and S-03.
- `src/app/layout.tsx` currently renders `{children}` directly, so there is no app-wide profile context, gate, or active profile display.
- `src/app/page.tsx`, `src/app/items/page.tsx`, and `src/app/admin/page.tsx` are static App Router pages. They can be wrapped by a client-side profile shell without changing the catalog contract from F-01.
- `src/lib/catalog.ts` already exposes read/query catalog data. This slice should not add catalog writes or persistence.
- The project has no test runner yet. Existing verification commands are `npm.cmd run check:catalog`, `npm.cmd run build`, and `npm.cmd run lint`.

## Desired End State

A first-time visitor sees a profile selection experience before everyday catalog work. Four family profile placeholders require the shared family password, and the guest profile can enter without that password but is represented as read-only in the app's profile contract. After a successful profile selection, the active profile is remembered in the browser across refreshes, shown in the UI, and can be changed.

### Key Discoveries

- PRD access control allows simple family profiles and explicitly avoids real login for the MVP.
- The user's planning decision extends the PRD by adding a shared family password for family profiles; this must stay lightweight and not become full authentication.
- The family password must not be hard-coded in source. It should be read from server environment/config, with a local development fallback only when the implementation explicitly documents it as non-production.
- Guest read-only must exist as a role/capability contract now, even though add/update/delete forms are not implemented yet.

## What We're NOT Doing

- No full user accounts, sign-up, password reset, sessions database, OAuth, or multi-family tenancy.
- No admin password unlock or delete flow; those belong to S-05.
- No UI for creating, editing, or deleting profiles.
- No private per-person catalog visibility. Family data remains shared.
- No catalog add/update/delete behavior in this slice.
- No durable catalog persistence decision.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Profile set | Four family profiles plus one guest profile | Matches the user's MVP scope while avoiding private names in the plan. |
| Family password | One shared family password | Gives lightweight access control without per-user auth complexity. |
| Password storage | Environment/config, no management UI | Keeps secrets out of the repo and avoids building profile administration. |
| Guest permissions | Guest can browse and search only | Establishes the read-only contract needed by later write slices. |
| Profile persistence | Browser localStorage/session flag | Keeps the profile selected after refresh without backend session storage. |
| Entry experience | Home/shared app entry shows selection before catalog work | Satisfies the shared entry point requirement with minimal routing. |

## Profile Contract

Add a typed profile model in `src/lib/profiles.ts` or a closely named module:

- `ProfileRole = "family" | "guest"`.
- `ProfileCapability = "catalog:read" | "catalog:search" | "catalog:write" | "admin:delete"`.
- `AppProfile` includes:
  - `id: string`
  - `label: string`
  - `role: ProfileRole`
  - `requiresFamilyPassword: boolean`
  - `capabilities: readonly ProfileCapability[]`
- Family profiles have read/search/write catalog capabilities but no admin delete capability.
- The guest profile has only read/search capabilities.
- Profile labels in source must use neutral placeholders unless the user later provides names intentionally.

## Phase 1: Profile Contract And Config Validation

### Overview

Create the shared profile contract and a lightweight verification script so later UI and write slices can depend on stable roles/capabilities.

### Changes Required

#### 1. Profile model and seed profiles

**File**: `src/lib/profiles.ts`

**Intent**: Define the typed profile list that powers selection and later authorization checks.

**Contract**: Export profile role/capability types, the profile list, `listAppProfiles()`, `getAppProfileById(id)`, and `profileCan(profile, capability)`.

#### 2. Family password config boundary

**File**: `src/lib/profilePassword.ts` or `src/lib/profileConfig.ts`

**Intent**: Centralize the environment/config read for the shared family password so it is not scattered through UI code.

**Contract**: Export a server-only helper used by the profile session route. The helper reads a single env variable such as `FAMILY_SHELF_FAMILY_PASSWORD` and never exposes the raw value to client components.

#### 3. Profile contract check

**File**: `scripts/check-profiles.mjs`

**Intent**: Verify the profile contract without adding a full test runner.

**Contract**: The script validates exactly one guest profile, four family profiles, unique ids, valid roles, no `admin:delete` capability on guest/family profiles, guest read/search-only behavior, and family write capability.

#### 4. Package script

**File**: `package.json`

**Intent**: Give implementers one stable command to verify the new profile contract.

**Contract**: Add `check:profiles` that runs the new script.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:profiles` passes.
- `npm.cmd run check:catalog` still passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Profile names in source and docs are neutral placeholders, not private family names.
- The profile contract clearly distinguishes family write capability from guest read/search capability.
- No source file contains a real family password.

## Phase 2: Profile Selection And Session Memory

### Overview

Add the interactive entry flow: guest can enter directly, family profiles require the shared password, and the selected profile is remembered in the browser across refreshes.

### Changes Required

#### 1. Password verification route

**File**: `src/app/api/profile-session/route.ts`

**Intent**: Verify the shared family password on the server side so the raw env value is not bundled into client JavaScript.

**Contract**: Accept a profile id and password for family profiles, reject missing/incorrect passwords, accept guest profile without a password, and return only non-secret profile/session metadata.

#### 2. Client profile provider

**File**: `src/components/ProfileProvider.tsx` or `src/components/ProfileGate.tsx`

**Intent**: Own profile selection state, localStorage persistence, loading state, invalid password state, and profile switching.

**Contract**: Mark the component `"use client"`. Store only non-secret selected profile/session metadata in localStorage. Do not store the family password.

#### 3. Entry selection UI

**File**: `src/components/ProfileGate.tsx` or `src/components/ProfilePicker.tsx`

**Intent**: Present the first screen for choosing a family or guest profile before catalog work.

**Contract**: Show the profile choices, password input only when a family profile is selected, a clear guest read-only affordance, and a path into the app after successful selection.

#### 4. App-wide shell integration

**File**: `src/app/layout.tsx`

**Intent**: Ensure the profile gate applies to the shared app entry and deep links without duplicating logic in every page.

**Contract**: Wrap `children` with the client profile gate/provider while keeping metadata and global styles intact.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:profiles` passes.
- `npm.cmd run build` passes with the new client/server boundary.
- `npm.cmd run lint` passes.

#### Manual Verification

- First visit without a stored profile shows profile selection before catalog content.
- Choosing guest enters the app without password.
- Choosing a family profile requires the shared family password.
- An incorrect family password shows an understandable error and does not enter the app.
- A successful profile selection survives browser refresh.
- Switching profile clears the current selection and returns to profile choice.

## Phase 3: UI Adoption And Read-Only Signals

### Overview

Make the selected profile visible in the existing pages and establish the read-only contract for guest users without building future write forms prematurely.

### Changes Required

#### 1. Active profile display

**File**: `src/components/ProfileShell.tsx` or the chosen profile gate component

**Intent**: Show who is currently using the app and give the user a clear way to change profiles.

**Contract**: Display active profile label and role/capability summary in the app shell. The control must not cause layout shifts or hide page content on mobile.

#### 2. Home entry adjustment

**File**: `src/app/page.tsx`

**Intent**: Make the home page feel like the shared entry point after profile selection, with a clear path into the catalog.

**Contract**: Keep the existing recent-items value from `listCatalogItems()`, preserve links to catalog/admin, and avoid duplicating profile state in the page.

#### 3. Catalog read-only signal

**File**: `src/app/items/page.tsx`

**Intent**: Establish how read-only users are represented before S-02/S-03 add search and write controls.

**Contract**: Show a small guest/read-only signal when the active profile lacks write capability, without hiding the existing catalog list.

#### 4. Admin placeholder alignment

**File**: `src/app/admin/page.tsx`

**Intent**: Avoid implying that S-01 implemented admin unlock or destructive actions.

**Contract**: Keep admin as a placeholder and state only that protected actions are future MVP work; do not grant delete capability to any S-01 profile.

### Success Criteria

#### Automated Verification

- `npm.cmd run check:profiles` passes.
- `npm.cmd run check:catalog` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.

#### Manual Verification

- Active profile is visible after entering the app.
- Guest profile is visibly read-only.
- Family profiles are visibly allowed to continue with everyday catalog work.
- Home page and `/items` still render the shared catalog items after profile selection.
- `/admin` does not expose delete or password-unlock behavior in this slice.
- Mobile-width layout keeps profile controls and page content readable without overlap.

## Testing Strategy

Automated:

- Run `npm.cmd run check:profiles`.
- Run `npm.cmd run check:catalog`.
- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.

Manual:

1. Clear the browser's localStorage for the app.
2. Open `/` and confirm profile selection appears before catalog content.
3. Select guest and confirm the app opens without password and shows read-only state.
4. Switch profile, choose a family profile, enter a wrong password, and confirm access is rejected.
5. Enter the configured family password and confirm the app opens.
6. Refresh and confirm the selected profile persists.
7. Open `/items` and `/admin` and confirm profile state remains visible.

## Performance Considerations

The profile list is tiny and static. No caching, pagination, remote profile fetch, or background refresh is needed. Client-side profile state should avoid blocking render longer than the localStorage hydration check.

## Migration Notes

There is no data migration. The only required environment setup is the shared family password variable for non-guest profile entry. Local development may use a documented placeholder, but real secrets must not be committed.

## Open Risks And Assumptions

- The shared family password is auth-light. It prevents casual access in the UI but is not a replacement for a hardened authentication system.
- The guest read-only contract will become more important in S-03/S-04 when write forms exist; this slice should expose capabilities now so later slices can enforce them.
- Exact family profile names remain outside the plan to avoid committing private data.

## References

- Roadmap item: `context/foundation/roadmap.md` S-01 / `shared-entry-profile-selection`
- PRD requirements: `context/foundation/prd.md` FR-001, FR-002, US-01, US-02, access control, non-goals
- Existing app shell: `src/app/layout.tsx`
- Existing home page: `src/app/page.tsx`
- Existing catalog page: `src/app/items/page.tsx`
- Existing admin placeholder: `src/app/admin/page.tsx`
- Existing catalog contract: `src/lib/catalog.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `— <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Profile Contract And Config Validation

#### Automated

- [x] 1.1 `npm.cmd run check:profiles` passes. — b9d6b1f
- [x] 1.2 `npm.cmd run check:catalog` still passes. — b9d6b1f
- [x] 1.3 `npm.cmd run build` passes. — b9d6b1f
- [x] 1.4 `npm.cmd run lint` passes. — b9d6b1f

#### Manual

- [x] 1.5 Profile names in source and docs are neutral placeholders, not private family names. — b9d6b1f
- [x] 1.6 The profile contract clearly distinguishes family write capability from guest read/search capability. — b9d6b1f
- [x] 1.7 No source file contains a real family password. — b9d6b1f

### Phase 2: Profile Selection And Session Memory

#### Automated

- [x] 2.1 `npm.cmd run check:profiles` passes. — 3429a44
- [x] 2.2 `npm.cmd run build` passes with the new client/server boundary. — 3429a44
- [x] 2.3 `npm.cmd run lint` passes. — 3429a44

#### Manual

- [x] 2.4 First visit without a stored profile shows profile selection before catalog content. — 3429a44
- [x] 2.5 Choosing guest enters the app without password. — 3429a44
- [x] 2.6 Choosing a family profile requires the shared family password. — 3429a44
- [x] 2.7 An incorrect family password shows an understandable error and does not enter the app. — 3429a44
- [x] 2.8 A successful profile selection survives browser refresh. — 3429a44
- [x] 2.9 Switching profile clears the current selection and returns to profile choice. — 3429a44

### Phase 3: UI Adoption And Read-Only Signals

#### Automated

- [x] 3.1 `npm.cmd run check:profiles` passes.
- [x] 3.2 `npm.cmd run check:catalog` passes.
- [x] 3.3 `npm.cmd run build` passes.
- [x] 3.4 `npm.cmd run lint` passes.

#### Manual

- [x] 3.5 Active profile is visible after entering the app.
- [x] 3.6 Guest profile is visibly read-only.
- [x] 3.7 Family profiles are visibly allowed to continue with everyday catalog work.
- [x] 3.8 Home page and `/items` still render the shared catalog items after profile selection.
- [x] 3.9 `/admin` does not expose delete or password-unlock behavior in this slice.
- [x] 3.10 Mobile-width layout keeps profile controls and page content readable without overlap.
