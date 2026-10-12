# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

An Anki-inspired spaced-repetition (SRS) web app for learning English articles, novels, and movies. Two independent npm packages: the React frontend at the repo root, and the Express backend under `server/`. Data is persisted to PostgreSQL.

## Commands

```bash
# Frontend (repo root)
npm install
npm run dev          # Vite dev server :5173 (proxies /api → :3000)
npm run build        # tsc typecheck + vite build
npm run test         # vitest run
npx vitest run src/lib/srs.test.ts        # single test file
npx vitest run -t "sessionQueue"          # filter by test name

# Backend (server/)
cd server && npm install
npm run dev          # tsx watch, listens :3000
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm run test         # vitest run

# Full stack via Docker Compose (frontend :8080, backend :3000, Postgres :5432)
docker compose up -d --build
docker compose down          # stop
docker compose down -v        # stop AND wipe the database
```

## Architecture

**Data flow:** React (zustand store `src/store.ts`) → `fetch` to relative `/api/*` → Express (`server/src/index.ts`) → PostgreSQL via `pg` (`server/src/db.ts`). The frontend never talks to Postgres directly and has no base-URL config: `/api` is proxied by Vite in dev (`vite.config.ts`) and by nginx in Docker (`frontend/nginx.conf`).

**Two packages, no shared code.** The frontend and backend each have their own `package.json`, `tsconfig.json`, and build step, and are built into separate Docker images. There is no workspace/monorepo tooling.

**SRS scheduling is server-side only.** The SM-2 `schedule()` function lives in `server/src/srs.ts` and is applied by `POST /api/cards/:id/review`. The frontend's `src/lib/srs.ts` deliberately does NOT contain scheduling logic — only queue/stat helpers (`isDue`, `countDue`, `countNew`, `sessionQueue`). When rating a card, the frontend sends the rating and receives back the fully updated card.

**Duplicated types must stay in sync.** `Card`/`Deck`/`Rating` are defined in both `src/lib/types.ts` (frontend) and `server/src/types.ts` (backend). Any schema change requires updating both.

**Database schema** is created on backend startup with `CREATE TABLE IF NOT EXISTS` in `server/src/db.ts` — there is no migration tool. Two gotchas:
- The `interval` column is named `interval_days` (because `interval` is a reserved SQL keyword), mapped to `Card.interval` via `rowToCard`.
- `tags` is a Postgres `TEXT[]` column (passed as a JS array).

**Import merges, not replaces.** `POST /api/state` (the top-bar "Import" button) regenerates IDs and appends decks/cards to existing data — it does not wipe the DB. `samples/collecting-deck.json` is a ready-to-import deck bundle in this format (`{ decks, cards }` with `deckId` references).
