# Family Shelf

Family Shelf is a private family catalog for books, board games, video games, and other shared household items. It helps the family check what is available, what is borrowed, and where useful notes about an item live.

The project is a 10xDevs MVP/10xBuilder submission built from the context documents in `context/foundation/`.

## Core Features

- Choose a family profile or guest profile before entering the app.
- Browse and search the shared catalog.
- Add new catalog items from a dedicated add-item page.
- Update item title, borrowing status, borrower, and note.
- Delete catalog items only after admin unlock.
- Import local developer entry files into the database without committing those files.

## Access Model

This is intentionally not a full multi-account auth system. For the private-family MVP:

- Family profiles use one shared family password.
- Guest can browse and search only.
- Admin unlock uses a separate password for destructive actions.
- Server-side API routes verify profile capabilities before catalog mutations.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Neon Postgres
- `@neondatabase/serverless`
- Playwright for browser E2E checks
- Vercel deployment

## Required Environment Variables

Local development can use `.env.local`:

```env
DATABASE_URL=...
FAMILY_SHELF_FAMILY_PASSWORD=...
FAMILY_SHELF_ADMIN_PASSWORD=...
```

`POSTGRES_URL` can be used instead of `DATABASE_URL`. Do not commit `.env.local`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Useful Commands

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:profiles
npm.cmd run check:catalog
npm.cmd run check:catalog-api
npm.cmd run check:e2e
npm.cmd run check:smoke
```

Notes:

- `check:catalog-api` and `check:e2e` require the local app server to be running.
- `check:catalog`, `check:catalog-api`, and `check:smoke` need configured database/password environment variables.
- `check:smoke` targets the production URL by default.

## Developer Data Import

Local entry files such as `entry-data.txt` and `entrydata*.txt` are ignored by git.

Import entries:

```bash
npm.cmd run seed:entries -- entrydata2.txt
```

The importer skips existing rows by title and item kind, so repeated runs do not duplicate records.

## Project Context

- Product requirements: `context/foundation/prd.md`
- Roadmap: `context/foundation/roadmap.md`
- Test plan: `context/foundation/test-plan.md`
- Deployment notes: `docs/deployment.md`
