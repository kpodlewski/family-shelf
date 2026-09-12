# Deployment Notes

## Runtime Environment

Family Shelf is deployed on Vercel and stores catalog data in Neon Postgres.

Required environment variables:

- `DATABASE_URL` or `POSTGRES_URL`: Postgres connection string injected by the Vercel Neon integration.
- `FAMILY_SHELF_FAMILY_PASSWORD`: shared password for the four family profiles.
- `FAMILY_SHELF_ADMIN_PASSWORD`: separate password for unlocking admin-only destructive actions.

Local development can use `.env.local`; it is ignored by git and must not be committed.
Vercel preview and production environments should receive database variables from the
connected Neon Marketplace resource.

Changing `FAMILY_SHELF_FAMILY_PASSWORD` or `FAMILY_SHELF_ADMIN_PASSWORD` in
Vercel requires a fresh deployment before production uses the new value.

## Database Setup

The expected table shape is defined in `scripts/catalog-schema.sql`.
Running `npm.cmd run check:catalog` applies the schema if needed, inserts the stable
seed catalog rows, and verifies read/search/create/update/delete behavior against
the configured database.

`npm.cmd run check:catalog-api` verifies the HTTP catalog mutation boundary against
a running local app server. It targets `http://localhost:3000` by default; set
`FAMILY_SHELF_CATALOG_API_BASE_URL` only when intentionally checking another local
or disposable preview target. Run `check:catalog` first so schema and seed rows are
ready, then start the app locally before running `check:catalog-api`.

`npm.cmd run check:e2e` verifies the minimal browser flow against a running local
app server. It targets `http://localhost:3000` by default; set
`FAMILY_SHELF_E2E_BASE_URL` only when intentionally checking another local or
disposable preview target. The browser check requires
`FAMILY_SHELF_FAMILY_PASSWORD` and `FAMILY_SHELF_ADMIN_PASSWORD` from the shell or
`.env.local`, and it expects stable seed rows from `check:catalog`.

Authenticated Playwright specs should use files under `playwright/.auth/`, which
is git-ignored. Set `FAMILY_SHELF_E2E_FAMILY_STORAGE_STATE` to an auth-state file
when running `*.authenticated.spec.ts`; the default critical-flow specs keep
selecting profiles through the UI so they still protect the entry gate.

## Verification

Before shipping a preview or production change:

1. Confirm the Vercel project is connected to the Neon resource.
2. Confirm `DATABASE_URL` or `POSTGRES_URL` is available in the target environment.
3. Confirm `FAMILY_SHELF_FAMILY_PASSWORD` is configured in the target environment.
4. Confirm `FAMILY_SHELF_ADMIN_PASSWORD` is configured in the target environment.
5. Run `npm.cmd run check:catalog`.
6. Start the app locally and run `npm.cmd run check:catalog-api`.
7. With the same local app server running, run `npm.cmd run check:e2e`.
8. Run `npm.cmd run check:profiles`.
9. Run `npm.cmd run build`.
10. Run `npm.cmd run lint`.
11. Run `npm.cmd run check:smoke`.
12. Manually verify admin unlock and item delete in the target environment using a disposable item.

`check:smoke` targets production by default. It expects production Vercel
environment variables to be configured and redeployed, and it expects stable
catalog seed rows to exist; run `check:catalog` first when seed rows may be
missing. The browser e2e gate is local or intentional-preview UI coverage; it
does not replace production `check:smoke`.

## Rollback Notes

Rolling back the app code does not delete catalog rows that users already created.
If a bad write reaches the database, fix the data intentionally in Neon or add a
future admin workflow. Do not delete production data as part of a normal code rollback.
