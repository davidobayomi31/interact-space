# Interact Space — V1: The Intelligent Community Network

A connected world of communities, built for Mirac Inc. Two layers, one experience:
the **Digital City** (communities, discussions, events, people) and the **AI Companion**
(a guide that connects you to people — it never replaces them, and it never becomes a feed).

**V1 is a real application, not a mock.** It has real accounts, a real database, real
posts with threaded comments and voting, moderation, and an AI companion that can run on
a real LLM. One city is seeded (Lagos, Nigeria) so nothing ever feels empty.

## What V1 does

- **Real accounts + login** — email/password, bcrypt-hashed, session in an httpOnly cookie.
- **AI-guided discovery (the identity)** — the companion guides you to communities, people
  and discussions. Bounded and explained — every recommendation carries a *because*. No
  endless feed anywhere.
- **Real communities you can join** — membership lives in the database.
- **Reddit structure, kept** — posts with **threaded comments** and **up/down voting**.
  Votes are a *quality signal*: they rank the best answer to the top of a thread, they
  don't power a scroll.
- **AI companion** — a real Claude call over the live catalog (grounded: it can't invent a
  community or person), with automatic fallback to a rule-based engine when no API key is set.
- **Basic moderation** — any member can report a post or comment; moderators review a queue
  and remove or dismiss.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts **both** the API (`server/`, port 8787)
and the web app (Vite, port 5173) together.



### Turn on the real AI companion (optional)

The companion works out of the box using a rule-based engine. To use a real LLM:

```bash
cp .env.example .env
# then put your key in .env:
# ANTHROPIC_API_KEY=sk-ant-...
```

Restart `npm run dev`. The companion now uses Claude and grounds every answer in the live
database. No key? It transparently falls back to keyword matching — nothing breaks.

## The demo journey

1. **Arrival** (`/`) — the open city, explorable without an account: trending communities,
   events, and live public discussions (real posts, real vote scores).
2. **Join** (`/auth`) — create an account, then the **AI onboarding** (`/welcome`) collects
   your goals and interests through conversation and reveals your starting map, each pick
   traced to what you said.
3. **My Space** (`/space`) — your communities, a bounded catch-up digest, events, connections.
4. **Communities** (`/community/:id`) — per-community identity, rules, moderators; start a
   discussion (if you've joined).
5. **Threads** (`/post/:id`) — a post with vote-ranked, threaded comments. Reply, vote, report.
6. **Companion** (gold button, any screen) — "Introduce me to people in sustainable
   agriculture", "What discussions should I read about farming?"
7. **Moderate** (`/mod`) — appears once you moderate a community. Review reports, remove or
   dismiss. *(Demo rule: the first community you join makes you its moderator so the tools
   are reachable.)*

## Architecture

```
Browser (React + Vite, port 5173)
   │  /api/*  (Vite proxy)
   ▼
Express API (server/, port 8787)
   │
   ├── pg  →  Postgres  (accounts, memberships, posts, comments,
   │                       votes, reports, jobs, chats, ads)
   └── Claude (optional) →  grounded companion  (falls back to rule engine)
```

- **Frontend** — React + React Router. Keeps the seeded *catalog* (communities, people,
  events) for display; everything dynamic (accounts, posts, comments, votes, moderation,
  companion) comes from the API. See `src/api.js`.
- **Backend** — `server/index.js` (routes), `server/db.js` (schema + serialization),
  `server/auth.js` (accounts/sessions), `server/companion.js` (LLM + fallback),
  `server/seed.js` (one-time seed from `src/data/seed.js`).

## Stack

Vite · React · React Router · Express · Postgres (`pg`) · bcrypt · JWT · @anthropic-ai/sdk.

## Not in V1 (deliberately)

No infinite home feed, no global karma leaderboard, no algorithmic scroll — the absence is
the product. Multi-city, user-created communities, notifications, and the immersive
"digital city" layer are future phases.

## Deploy (Vercel + Neon, free)

The frontend is served as static files from Vercel's CDN; everything under
`/api/*` runs as one serverless function (`api/index.js`, which is just the
Express app). Data lives in Postgres, so it survives deploys and restarts.

**1. Create the database.** At [neon.tech](https://neon.tech), create a free
project and copy the connection string (it looks like
`postgres://user:pass@ep-something.neon.tech/neondb?sslmode=require`).

**2. Import the repo at [vercel.com/new](https://vercel.com/new).** Vercel reads
`vercel.json`; no build settings need changing.

**3. Add environment variables** (Vercel → Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Neon connection string |
| `JWT_SECRET` | any long random string — signs login sessions |
| `ANTHROPIC_API_KEY` | optional; turns on the real LLM companion |

**4. Deploy.** The first request creates the schema and seeds the Lagos data.

## Run it locally

```bash
npm install
```

You need a Postgres running locally. With Homebrew:

```bash
brew install postgresql@17 && brew services start postgresql@17 && createdb interact
```

Then point the app at it:

```bash
cp .env.example .env
# set DATABASE_URL=postgres://<your-mac-username>@127.0.0.1:5432/interact
npm run dev
```

Open http://localhost:5173. `npm run dev` starts both the API (`server/`, port
8787) and the web app (Vite, port 5173). The first request creates the tables
and seeds them; to start over, `dropdb interact && createdb interact`.
