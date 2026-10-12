# MyAnki

An Anki-inspired spaced-repetition web app for learning English articles, novels, and movies.

- **Frontend**: React + Vite + TypeScript + zustand
- **Backend**: Node.js + Express + TypeScript (REST API)
- **Database**: PostgreSQL
- **Deployment**: Docker Compose

## Run with Docker Compose (recommended)

```bash
docker compose up -d --build
```

Then open http://localhost:8080

| Service   | URL                 |
| --------- | ------------------- |
| Frontend  | http://localhost:8080 |
| Backend   | http://localhost:3000/api/health |
| Postgres  | localhost:5432 (internal) |

Data persists in the `pgdata` volume. To wipe everything:

```bash
docker compose down -v
```

## Run in development mode

```bash
# 1. start PostgreSQL (e.g. via docker)
docker run --name mynote-db -e POSTGRES_USER=mynote -e POSTGRES_PASSWORD=mynote \
  -e POSTGRES_DB=mynote -p 5432:5432 -d postgres:16-alpine

# 2. backend
cd server
npm install
npm run dev          # listens on :3000

# 3. frontend (new terminal)
cd ..
npm install
npm run dev          # http://localhost:5173 (proxies /api → :3000)
```

## API

| Method | Path                  | Description            |
| ------ | --------------------- | ---------------------- |
| GET    | `/api/health`         | Health check           |
| GET    | `/api/state`          | All decks + cards      |
| POST   | `/api/state`          | Replace all (import)   |
| POST   | `/api/decks`          | Create deck            |
| PUT    | `/api/decks/:id`      | Update deck            |
| DELETE | `/api/decks/:id`      | Delete deck (cascades) |
| POST   | `/api/cards`          | Create card            |
| PUT    | `/api/cards/:id`      | Update card            |
| DELETE | `/api/cards/:id`      | Delete card            |
| POST   | `/api/cards/:id/review` | Apply SRS rating     |
| POST   | `/api/import`         | Bulk import cards      |
