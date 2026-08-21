# Deployment Notes

## Runtime Environment

Family Shelf is deployed on Vercel and stores catalog data in Neon Postgres.

Required environment variables:

- `DATABASE_URL` or `POSTGRES_URL`: Postgres connection string injected by the Vercel Neon integration.
- `FAMILY_SHELF_FAMILY_PASSWORD`: shared password for the four family profiles.

Local development can use `.env.local`; it is ignored by git and must not be committed.
Vercel preview and production environments should receive database variables from the
connected Neon Marketplace resource.

## Database Setup

The expected table shape is defined in `scripts/catalog-schema.sql`.
Running `npm.cmd run check:catalog` applies the schema if needed, inserts the stable
seed catalog rows, and verifies read/search/create behavior against the configured
database.

## Verification

Before shipping a preview or production change:

1. Confirm the Vercel project is connected to the Neon resource.
2. Confirm `DATABASE_URL` or `POSTGRES_URL` is available in the target environment.
3. Confirm `FAMILY_SHELF_FAMILY_PASSWORD` is configured in the target environment.
4. Run `npm.cmd run check:catalog`.
5. Run `npm.cmd run check:profiles`.
6. Run `npm.cmd run build`.
7. Run `npm.cmd run lint`.

## Rollback Notes

Rolling back the app code does not delete catalog rows that users already created.
If a bad write reaches the database, fix the data intentionally in Neon or add a
future admin workflow. Do not delete production data as part of a normal code rollback.
