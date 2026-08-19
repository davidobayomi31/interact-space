# Interact Space — The Plan in Plain English

Seven phases. Each one has a goal, the work, and what you can show someone
when it's done. Detail for every phase is further down this file.

---

### Phase 0 — Clean up the foundation
**Goal:** make the app tell the truth about its own data.

Right now the app has two memories that disagree. Some screens read the real
database; other screens read a hardcoded list of fake communities and people
baked into the code. So you can join a community and not see it in "My
communities." Events and Opportunities are pure decoration — there's no way to
create one.

**What I'd do:** delete the fake list, point every screen at the real database,
add real Events tables, and write tests so later phases can't quietly break
things.

**You'd see:** nothing new visually. Everything you click is now real. This is
plumbing, and it's about a week, and skipping it makes every later phase worse.

---

### Phase 1 — The AI Identity Builder ⭐
**Goal:** the thing that makes Interact Space different from everything else.

Today "onboarding" is a fake AI. It's a fixed 6-question script and a list of
about 50 keywords it looks for. It cannot ask a follow-up question.

**What I'd do:** put the real AI in charge of the interview and give it the
ability to *write to your profile while you talk*. You say "I'm a plumber in
Yaba" — it asks about your rates, your service area, whether you do emergency
call-outs, whether you want a business page. Someone who says "I'm looking for
work" gets a completely different set of questions. Behind it, I'd rebuild the
profile from flat lists of hobbies into the four sections you described: who I
am, what I do, what I'm looking for, what I offer — and let one account hold
several faces (personal, professional, business) without several logins.

**You'd see:** the demo moment. Left side of the screen is the conversation,
right side is your profile card building itself, section by section, as you
speak. Nobody fills in a form. This is the phase worth spending real time on.

---

### Phase 2 — One search box for everything
**Goal:** deliver the actual pitch — one place to find any need or offer.

There is currently no search in the app at all.

**What I'd do:** build real search across people, services, jobs, communities,
events and discussions, then let the AI handle plain-English requests like
"someone who can fix a leaking pipe in Yaba this weekend" and answer with real
people and a line explaining why each one came up.

**You'd see:** type a need, get a person. That sentence is the whole company.

---

### Phase 3 — Make trust real
**Goal:** the badge means something.

Today the "verified" badge is a switch anyone can flip. Ratings only apply to
communities, never to people. Anyone can message anyone. There's no block button.

**What I'd do:** four real verification levels — email, phone, government ID,
business registration — using outside providers for the ID checks rather than
handling documents ourselves. Ratings move onto people, scored on reliability,
communication and quality, and can *only* be left after a real completed job.
Add blocking, message permissions, spam limits, and let the AI pre-sort the
moderation queue for human moderators.

**You'd see:** a badge you can believe, a review you can trace to a real job,
and a block button.

---

### Phase 4 — Finish the transaction
**Goal:** a job can actually be completed, not just posted.

Today you post a job, someone taps "interested," and then… nothing. The app
has no idea whether the work ever happened. That's also why Phase 3's ratings
need this — a rating has to attach to something real.

**What I'd do:** widen jobs into four kinds — I need something, I offer
something, an opportunity, a resource to share — and add agreements between two
people that move through proposed → accepted → in progress → completed.
Completion is what unlocks the mutual rating. Plus notifications, because
without them nobody comes back.

**You'd see:** a request go from posted, to agreed, to done, to rated, without
leaving the app.

---

### Phase 5 — Make the empty rooms real
**Goal:** finish the features that are currently shells.

**What I'd do:** let users create their own communities, make events fully
work (create, RSVP, reminders), and make chat update instantly instead of
refreshing on a timer.

**On live streaming:** I'd cut it from V1. It's the most expensive thing on
this list and the least distinctive — the value here is people finding each
other, not broadcasting. It can come back later.

---

### Phase 6 — Money
**Goal:** payments, once there's something to attach them to.

**What I'd do:** Paystack, since it's built for Nigeria — cards, transfers,
USSD. Make the ads actually charge (today the payment button is fake). Then
protected payments for jobs: money is held when work is agreed and released
when it's done.

**One warning:** holding other people's money is a regulated activity. I'd
launch with Paystack's split payments — where we never hold the funds — and
only build true escrow after a lawyer has looked at it.

---

### Phase 7 — Ready for real people
**Goal:** stop being a demo.

**What I'd do:** move off the current database, which is a single file that
handles one thing at a time and won't survive real traffic. Add photo uploads
(profile pictures are currently just coloured circles). Add the security
layers, error tracking, and backups. Write the terms and privacy policy —
required the moment we touch government IDs. And go through every screen at
phone size, because that's where nearly all your users will be.

---

## If you only do part of this

**Phases 0, 1 and 2** are the demo: *the AI builds your identity, and then
that identity is findable by everyone who needs what you have.*

Phase 3 is what stops it being copied. Phases 4 to 6 are what make it a business.

---
---

# Interact Space — Roadmap to V1

*(Note: "JACK" was the earlier working name. Everything below uses **Interact Space**. The name never made it into the codebase — there are zero occurrences of "JACK" in `src/`, `server/`, or `index.html`, so no rename work is needed.)*

---

## Where the project actually is today

**Real and working (SQLite + Express + React, ~4,700 lines):**

| Area | Status |
|---|---|
| Accounts | Real — bcrypt, JWT in httpOnly cookie (`server/auth.js`) |
| Communities, posts, threaded comments, voting | Real — persisted, live scores, sorted trees |
| Jobs (Quick Jobs) | Real — post, browse, express interest |
| DMs + group chats | Real — persisted messages |
| Reports + moderation queue | Real — open/resolve, mod roles |
| Community ratings | Real — 1–5 stars per member |
| Ads | Half-real — records persist, `POST /api/ads/:id/pay` is a stub |
| Live streams | Shell only — a row with a viewer count, no media |
| AI Companion (discovery) | Real — `server/companion.js` calls Claude, validates every id against the DB, falls back to keyword ranking |

**The four structural problems blocking everything else:**

1. **Split brain.** `src/data/seed.js` holds static arrays (`COMMUNITIES`, `USERS`, `EVENTS`, `OPPORTUNITIES`) that `MySpace.jsx`, `Onboarding.jsx`, and `src/ai.js` still read directly — *in parallel with* the real API. `MySpace` renders your communities from the static array, so a community you actually joined may not appear. Events and Opportunities exist **only** as static data: no table, no endpoint, no way to create one.
2. **Onboarding is a script, not an AI.** `Onboarding.jsx` is a hardcoded 6-step state machine (`intro → name → goals → interests → area → privacy → reveal`). The "AI" is `extractTags()` — a ~50-word keyword dictionary in `src/ai.js`. It never calls the server, never calls Claude. It collects name, area, privacy, a tag list. That is a form wearing a chat costume.
3. **The profile is thin.** `users` has `interests`, `goals`, `skills` as flat JSON arrays. There is no *what I offer*, no *what I'm looking for*, no professional/business/creator facets, no services, no portfolio. The Identity Builder does not exist yet.
4. **Trust is cosmetic.** `id_verified` is a boolean set by `POST /api/auth/verify-id` with no verification behind it. No email confirmation, no phone, no blocking, no user-to-user reputation (ratings only target communities), no spam detection.

---

## The plan: 7 phases

Phases 0–3 produce a coherent, honest product. Phases 4–6 are the growth surface. Phase 7 ships it.

---

## Phase 0 — Kill the split brain *(foundation, do first)*

Nothing else is worth building on two sources of truth.

**Work:**
- Delete all runtime reads of `src/data/seed.js` from `MySpace.jsx`, `Onboarding.jsx`, `Discover.jsx`, `bits.jsx`. Keep the file only as input to `server/seed.js`.
- Add the missing tables so Events and Opportunities stop being fiction:
  ```sql
  CREATE TABLE events (
    id TEXT PRIMARY KEY, community_id TEXT, host_id TEXT NOT NULL,
    title TEXT NOT NULL, description TEXT, starts_at INTEGER, ends_at INTEGER,
    location TEXT, area TEXT, city TEXT, online INTEGER DEFAULT 0,
    capacity INTEGER, tags TEXT DEFAULT '[]', created_at INTEGER
  );
  CREATE TABLE event_rsvps (
    event_id TEXT, user_id TEXT, status TEXT DEFAULT 'going',
    created_at INTEGER, PRIMARY KEY (event_id, user_id)
  );
  ```
  Endpoints: `GET/POST /api/events`, `GET /api/events/:id`, `POST /api/events/:id/rsvp`.
- Retire `src/ai.js`'s matching functions (`matchCommunities`, `matchPeople`, `matchEvents`, `askCompanion`) from the client. The client should never do recommendation logic — that lives in `server/companion.js`. Keep only `extractTags`/`tagLabel`, which the server already imports.
- Replace ad-hoc `ALTER TABLE` migration checks in `db.js` with a numbered migration list (`server/migrations/001_*.js` …) and a `schema_version` table. You are about to add a lot of columns; the current pattern will not survive it.
- Add `vitest` + `supertest` and write API tests for auth, posts, votes, jobs. ~40 tests. This is the safety net for every phase after.

**Done when:** the app runs with `src/data/seed.js` imported by exactly one file (`server/seed.js`), events are creatable, and `npm test` passes.

---

## Phase 1 — The Identity Builder *(the differentiator)*

This is the feature the whole pitch rests on. Two halves: the **data model** and the **AI interview**.

### 1a. Profile data model

Replace the three flat arrays with a facet model. One identity, many aspects — never six accounts.

```sql
-- A person's identity is a set of facets they choose to switch on.
CREATE TABLE profile_facets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- personal | professional | business | creator | service | community
  headline TEXT,               -- "Plumber", "Fashion label", "Photographer"
  summary TEXT,
  visibility TEXT DEFAULT 'public',   -- public | members | connections | private
  is_primary INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER
);

-- Every claim a person makes about themselves is one row, uniformly shaped.
-- This is what makes unified search possible in Phase 2.
CREATE TABLE profile_entries (
  id TEXT PRIMARY KEY,
  facet_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  section TEXT NOT NULL,       -- offer | seeking | skill | experience | service | product | credential
  label TEXT NOT NULL,         -- "Emergency pipe repair"
  detail TEXT,                 -- free text
  tags TEXT DEFAULT '[]',
  rate TEXT,                   -- "₦15,000/visit" — nullable
  availability TEXT,           -- "Weekends", "Immediate"
  verified_by TEXT,            -- credential verification source, nullable
  created_at INTEGER
);

CREATE INDEX idx_entries_user ON profile_entries(user_id);
CREATE INDEX idx_entries_section ON profile_entries(section);
```

`section` maps directly to the four questions from the vision: **WHO I AM** (the facet itself), **WHAT I DO** (`skill`, `experience`), **WHAT I'M LOOKING FOR** (`seeking`), **WHAT I OFFER** (`offer`, `service`, `product`).

Keep `users.interests`/`goals` as the cheap denormalized tag cache the companion already reads — regenerate from entries on save.

### 1b. The AI interview replaces the scripted onboarding

New endpoint: `POST /api/onboarding/turn`, backed by a new `server/identity.js` alongside `companion.js`.

**How it works** — a tool-use loop, not a script:

- System prompt gives Claude one job: *interview this person until you can build their Interact Space identity.* It knows the facet kinds and the six `section` types, and it knows to ask about offers and needs, not hobbies.
- Claude is given **tools**, and the server executes them:
  - `set_identity({ name, area, city, privacy })`
  - `add_facet({ kind, headline, summary })`
  - `add_entry({ facet, section, label, detail, tags, rate, availability })`
  - `finish({ summary })` — ends the interview
- Every tool call writes to the DB immediately, so the profile **builds visibly on screen while you talk**. That's the moment that sells the product: the left pane is the conversation, the right pane is your identity card assembling itself card by card.
- The interview branches. "I'm a plumber" → asks about service area, rates, emergency availability, whether they want a business facet. "I'm looking for work" → asks about skills, experience, what kind of role. "I want to meet people" → stays personal, asks about interests. The current 6-step script cannot do this; the tool loop does it for free.
- On `finish`, hand off to the existing `companionReply()` for the reveal — communities, people, jobs, events matched to the entries just created. That code already works and already validates ids against the DB.

**Rewrite `Onboarding.jsx`** as a thin transcript renderer over `/api/onboarding/turn` + a live `<IdentityCard>` that re-fetches after each turn. Delete the `step` state machine. Keep chips: Claude can return suggested quick-replies alongside its message, so the UX stays tappable rather than all-typing.

**Fallback:** if `ANTHROPIC_API_KEY` is unset, fall back to the current scripted flow (keep it as `scriptedOnboarding()`). Same discipline `companion.js` already uses.

### 1c. The profile page becomes "your space"

Rebuild `Profile.jsx` to render facets as sections in the vision's exact shape — *I can help with / Available for / Looking for / My communities / My activity* — with a facet switcher when a user has more than one. `MySpace.jsx` becomes the owner's editable view of the same data.

**Done when:** a new user can talk to the AI for two minutes and end with a multi-section profile they never filled a form for.

---

## Phase 2 — Unified search & discovery

The pitch is "one place to search for needs, opportunities, services, groups, events." Right now there is no search endpoint at all.

- Add SQLite **FTS5** virtual tables over: `profile_entries`, `posts`, `communities`, `jobs`, `events`. Sync via triggers.
- `GET /api/search?q=&type=&area=&verified=` returning typed, mixed results.
- Rebuild `Discover.jsx` as the unified search surface: one input, faceted result rails (People · Services · Jobs · Communities · Events · Discussions), filters for area/verification/rating.
- **AI-assisted search:** route natural-language queries ("someone who can fix a leaking pipe in Yaba this weekend") through the companion, which turns them into structured filters *and* explains each result with its `because` line. The infrastructure for this — catalog building, id validation, `because` traces — already exists in `companion.js`; it needs the new entry types added to `buildCatalog()`.

**Done when:** one search box reaches every entity type, and the AI can answer a plain-English need with real people.

---

## Phase 3 — Trust & Safety *(the competitive advantage)*

Today: `id_verified` is a boolean anyone can set. Build the real thing.

### Verification ladder
```sql
CREATE TABLE verifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- email | phone | government_id | business_reg
  status TEXT DEFAULT 'pending',  -- pending | verified | rejected
  provider TEXT, provider_ref TEXT,
  verified_at INTEGER, expires_at INTEGER, created_at INTEGER
);
```
- **Email** — token link, self-hosted. Ship first (Resend or Postmark).
- **Phone** — SMS OTP via Termii (Nigeria-native, cheaper than Twilio for NG numbers).
- **Government ID** — do *not* build this. Integrate a provider (Smile ID or Dojah, both strong on NIN/BVN/Nigerian docs). Never store the document image; store only the provider reference and result.
- **Business registration** — CAC number check via Dojah, or manual review queue for V1.

Badges derive from this table, and `publicUser()` returns a `trust` object instead of a lone boolean.

### Reputation on people, not just communities
```sql
CREATE TABLE user_ratings (
  id TEXT PRIMARY KEY, rater_id TEXT, rated_id TEXT,
  context_type TEXT, context_id TEXT,      -- the job/agreement it came from
  reliability INTEGER, communication INTEGER, quality INTEGER,
  review TEXT, created_at INTEGER
);
```
Ratings are only creatable from a **completed interaction** (a job marked done, an event attended). Unearned reviews are the failure mode of every marketplace; gate it at the API, not the UI. Extend the existing `Rating.jsx` component — the three-axis version of what it already renders.

### Privacy controls
`users.privacy` currently only governs location. Split into a `privacy_settings` row: who can DM you (anyone / verified only / connections), contact visibility, searchability, profile-facet visibility (already on the facet). Enforce in `POST /api/messages/:userId` — right now anyone can DM anyone.

### Blocking + moderation upgrades
- `blocks` table; filter blocked users out of search, DMs, comments, job interest lists.
- Spam heuristics before the LLM: rate limits per user, duplicate-content detection, new-account link restrictions.
- **Claude as a triage layer** on the existing `reports` queue — classify severity, cluster repeat offenders, draft the mod note. Humans still decide. `Moderation.jsx` and the reports table already exist; this is an upgrade, not a rebuild.
- Suspension state on users (`suspended_until`, `ban_reason`) enforced in `attachUser`.

**Done when:** a badge means something, a rating traces to a real transaction, and a user can block someone.

---

## Phase 4 — The interaction loop: requests, offers, agreements

Jobs today are post → express interest → nothing. Close the loop, because ratings depend on it.

- Generalize `jobs` into **listings** with `kind`: `request` (I need something), `offer` (I provide something), `opportunity` (job/gig/grant), `resource` (thing to share/lend).
- Add `agreements`: a listing + two parties + status (`proposed → accepted → in_progress → completed → disputed`). Completion unlocks the mutual rating from Phase 3.
- Thread each agreement into the existing DM system so negotiation has a home.
- Notifications table + in-app bell. Nothing above works without it; people will not return to check.

**Done when:** a request can go from posted to completed to rated without leaving the app.

---

## Phase 5 — Communities, events, live *(make the shells real)*

- **Community creation** by users, with the Charter/rules flow the companion already describes as "simulated" in `src/ai.js`.
- **Events** get the full lifecycle from Phase 0's tables: create, RSVP, reminders, post-event ratings.
- **Realtime:** chats and DMs currently poll. Move to SSE (`GET /api/stream`) — simpler than WebSockets and enough for messages, notifications, and live viewer counts.
- **Live streaming:** the honest options are (a) cut it from V1, or (b) integrate LiveKit/Daily and keep `live_streams` as the metadata layer it already is. Do not hand-roll WebRTC. My recommendation is to cut it from V1 — it is the highest-cost, lowest-differentiation feature on this list, and text/async is where the community value is.

---

## Phase 6 — Payments & escrow

Only after Phase 4's agreements exist, because escrow attaches to an agreement.

- **Paystack** for Nigeria (cards, bank transfer, USSD) — the default choice over Stripe here.
- Ads: replace the `POST /api/ads/:id/pay` stub with a real charge + webhook activation.
- Escrow: fund on `accepted`, release on `completed`, hold on `disputed`. This makes you a money-transmitter-adjacent business — get the CBN/PSSP position reviewed before writing the code, and consider launching with Paystack's split payments (no custody) rather than true escrow.
- Dispute resolution queue reusing the moderation infrastructure.

---

## Phase 7 — Production

- **Database:** migrate SQLite → **Postgres**. `better-sqlite3` is synchronous and single-file; it will not survive concurrent users or a horizontally scaled deploy. Do this before launch, not after. Keep SQLite for local dev via a thin query layer, or just run Postgres in dev too (simpler).
- **Media:** avatars are currently a hex color. Add image upload (S3/R2 + signed URLs) for avatars, community banners, listing photos, portfolio items. The Identity Builder is much weaker without it.
- **Security:** rate limiting (`express-rate-limit`), Helmet, CSRF on cookie-auth mutations, Zod validation on every endpoint (currently mostly unvalidated), secrets management, `JWT_SECRET` required in production rather than defaulted.
- **Ops:** structured logging, Sentry, health checks, automated backups, staging environment.
- **Legal:** Terms, Privacy Policy, NDPR compliance (Nigeria's data protection regime — relevant the moment you touch government IDs), community guidelines, data deletion flow.
- **Deploy:** Fly.io or Railway for the API + Postgres; the Vite build to Cloudflare Pages or the same box. Both are cheap at this stage.
- **Accessibility & mobile:** the app is desktop-shaped today. Nigeria is mobile-first — audit every page at 375px before launch. This is not a polish item; it is the majority of your traffic.

---

## Sequencing

```
Phase 0  ██████                                    foundation — blocks everything
Phase 1      ████████████                          Identity Builder — the product
Phase 2              ██████                        unified search
Phase 3                  ██████████                trust & safety
Phase 4                          ████████          the interaction loop
Phase 5                                  ██████    communities/events real
Phase 6                                      ████  payments
Phase 7          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  hardening (continuous, then launch)
```

**If you want something demoable fastest:** Phases 0 + 1 + 2. That is the story — *AI builds your identity, then that identity is searchable by everyone who needs what you have.* Phase 3 is what makes it defensible; Phases 4–6 are what make it a business.

**What I'd cut from V1:** live streaming, true escrow (use split payments), business-registration verification (manual review instead), and the six separate profile *templates* — build the facet system, let real usage tell you which facets people actually create.

---

## Three decisions worth making before Phase 1

1. **Does the AI interview replace onboarding entirely, or supplement a form?** I'd go all-in on the AI with a "skip to form" escape hatch — the conversational build *is* the differentiator, but some people hate chat.
2. **Postgres now or at Phase 7?** Moving at Phase 0 costs about a day. Moving at Phase 7 means rewriting every query in `db.js` under launch pressure. I'd move now.
3. **Which market first?** The seed data and the companion prompt both hardcode Lagos. Deliberate single-city launch is right — but the schema should not assume it. `city` is already a column; make sure Phase 2's search treats it as a first-class filter rather than a display string.
