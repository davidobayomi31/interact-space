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

> First run seeds the database (`server/interact.db`) from the Lagos data. Delete that file
> to reseed from scratch.

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
   ├── better-sqlite3  →  server/interact.db   (accounts, memberships, posts,
   │                                             comments, votes, reports)
   └── Claude (optional) →  grounded companion  (falls back to rule engine)
```

- **Frontend** — React + React Router. Keeps the seeded *catalog* (communities, people,
  events) for display; everything dynamic (accounts, posts, comments, votes, moderation,
  companion) comes from the API. See `src/api.js`.
- **Backend** — `server/index.js` (routes), `server/db.js` (schema + serialization),
  `server/auth.js` (accounts/sessions), `server/companion.js` (LLM + fallback),
  `server/seed.js` (one-time seed from `src/data/seed.js`).

## Stack

Vite · React · React Router · Express · better-sqlite3 · bcrypt · JWT · @anthropic-ai/sdk.

## Not in V1 (deliberately)

No infinite home feed, no global karma leaderboard, no algorithmic scroll — the absence is
the product. Multi-city, user-created communities, notifications, and the immersive
"digital city" layer are future phases.

## Deploy a shareable link (Render, free)

`render.yaml` defines one free web service that runs the whole app — Vite builds
the frontend into `dist/`, and the Express server serves that build *and* `/api`
on a single port, so there is no separate frontend host to configure.

1. Push this repo to GitHub.
2. At [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**,
   pick this repo. Render reads `render.yaml` and fills in the settings.
3. **Apply**. First build takes ~3–5 minutes; you get
   `https://<name>.onrender.com`.

Optional: add `ANTHROPIC_API_KEY` in the service's **Environment** tab to switch
the companion from the rule-based fallback to the real LLM.

**Free-tier limits, so nothing surprises you:** the service sleeps after ~15
minutes of inactivity and takes ~50 seconds to wake on the next visit, and the
disk is ephemeral — `server/interact.db` is rebuilt from the seed on every
deploy or restart, so visitor-created accounts and posts are not permanent.
Good for demos; migrate to Postgres (see ROADMAP.md) before real users.
