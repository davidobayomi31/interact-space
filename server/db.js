// ── Interact Space database ──────────────────────────────────────────
// Postgres. Owns everything dynamic: accounts, membership, posts,
// threaded comments, votes, connections, reports, jobs, chats and ads.
//
// This replaced a single-file SQLite database. Serverless hosts give a
// function no persistent disk, so the data had to move somewhere that
// outlives a single request. Every read below is therefore async.
import pg from 'pg'
import { SUPABASE_ROOT_CA } from './supabase-ca.js'

// pg hands back BIGINT and NUMERIC as strings, to protect values too large
// for a JS number. Here they are only millisecond timestamps, counts and a
// star average — all of which the app does arithmetic on — so parse them.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))) // int8
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))) // numeric

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database ' +
    '(locally: postgres://postgres@127.0.0.1:5432/interact).',
  )
}

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])/.test(url)
const isSupabase = /@[^/@]*\.supabase\.(com|co)[:/]/.test(url)

// Managed Postgres requires TLS; a local cluster has none. Supabase signs its
// certificates with a private root, so Node needs that root handed to it or
// the connection dies with SELF_SIGNED_CERT_IN_CHAIN — supplying it keeps
// full verification on, which turning verification off would not.
const sslOptions = () => {
  if (isLocal) return false
  if (process.env.PGSSL_NO_VERIFY === '1') return { rejectUnauthorized: false }
  if (isSupabase) return { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true }
  return { rejectUnauthorized: true }
}

export const pool = new pg.Pool({
  connectionString: url,
  // See sslOptions above. PGSSL_NO_VERIFY=1 remains the escape hatch for a
  // host whose chain Node still doesn't recognise — it keeps the connection
  // encrypted but stops verifying who is on the other end.
  ssl: sslOptions(),
  // Serverless functions come and go; don't hold a large idle pool open.
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000,
})

// The queries below are written with SQLite-style "?" placeholders because
// that is how they were first written and they read better; Postgres wants
// $1, $2… so translate on the way through. No query here contains a literal
// "?" inside a string, which is what would make this unsafe.
const toPg = (sql) => {
  let n = 0
  return sql.replace(/\?/g, () => `$${++n}`)
}

// The query surface the rest of the server uses. `get` returns one row or
// undefined, `all` returns an array, `run` reports how many rows changed.
export const q = {
  get: async (sql, ...args) => (await pool.query(toPg(sql), args)).rows[0],
  all: async (sql, ...args) => (await pool.query(toPg(sql), args)).rows,
  run: async (sql, ...args) => ({ changes: (await pool.query(toPg(sql), args)).rowCount }),
}

// ── Schema ───────────────────────────────────────────────────────────
// Booleans stay INTEGER 0/1 rather than becoming Postgres BOOLEAN: the
// whole app already reads them as `!!row.x` and writes 0/1, and changing
// that would have meant touching every route for no behavioural gain.
// Timestamps are BIGINT because they are Date.now() milliseconds.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  handle TEXT,
  title TEXT,
  city TEXT DEFAULT 'Lagos',
  area TEXT,
  color TEXT DEFAULT '#D8A63A',
  bio TEXT DEFAULT '',
  interests TEXT DEFAULT '[]',
  goals TEXT DEFAULT '[]',
  skills TEXT DEFAULT '[]',
  privacy TEXT DEFAULT 'neighborhood',
  onboarded INTEGER DEFAULT 0,
  is_seed INTEGER DEFAULT 0,
  created_at BIGINT,
  id_verified INTEGER DEFAULT 0,
  verified_at BIGINT,
  job_skills TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  scope TEXT,
  city TEXT,
  accent TEXT,
  icon TEXT,
  tags TEXT DEFAULT '[]',
  rules TEXT DEFAULT '[]',
  member_count INTEGER DEFAULT 0,
  trending INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  created_at BIGINT,
  PRIMARY KEY (user_id, community_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  pinned INTEGER DEFAULT 0,
  hidden INTEGER DEFAULT 0,
  base_score INTEGER DEFAULT 0,
  created_at BIGINT
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_id TEXT,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  hidden INTEGER DEFAULT 0,
  base_score INTEGER DEFAULT 0,
  created_at BIGINT
);

CREATE TABLE IF NOT EXISTS votes (
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS connections (
  user_id TEXT NOT NULL,
  other_id TEXT NOT NULL,
  created_at BIGINT,
  PRIMARY KEY (user_id, other_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  community_id TEXT,
  reason TEXT,
  status TEXT DEFAULT 'open',
  action TEXT,
  created_at BIGINT,
  resolved_at BIGINT,
  resolver_id TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  poster_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  area TEXT,
  city TEXT DEFAULT 'Lagos',
  budget TEXT,
  verified_only INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at BIGINT
);

CREATE TABLE IF NOT EXISTS job_interests (
  job_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at BIGINT,
  PRIMARY KEY (job_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT,
  read INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  community_id TEXT,
  creator_id TEXT NOT NULL,
  accent TEXT DEFAULT '#4A90E8',
  created_at BIGINT
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at BIGINT,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT
);

CREATE TABLE IF NOT EXISTS ratings (
  user_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  review TEXT DEFAULT '',
  created_at BIGINT,
  PRIMARY KEY (user_id, community_id)
);

CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  cta_label TEXT DEFAULT 'Learn more',
  accent TEXT DEFAULT '#D8A63A',
  emoji TEXT DEFAULT '✨',
  active INTEGER DEFAULT 0,
  created_at BIGINT
);

CREATE TABLE IF NOT EXISTS live_streams (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at BIGINT,
  ended_at BIGINT,
  viewer_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(from_id, to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);

-- Location privacy: 'exact' | 'city-only' | 'hidden'. 'neighborhood' is a
-- retired option; rows that still hold it are treated as 'exact'.
ALTER TABLE users ALTER COLUMN privacy SET DEFAULT 'city-only';

-- Public portfolio on the main profile.
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio TEXT DEFAULT '[]';

-- Applicants track where each application stands.
ALTER TABLE job_interests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'applied';
ALTER TABLE job_interests ADD COLUMN IF NOT EXISTS status_at BIGINT;
ALTER TABLE job_interests ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- Voices: extra, separately shareable versions of a member's profile
-- (a work voice, a creative voice...). The main profile is the first voice;
-- these rows are the additional ones.
CREATE TABLE IF NOT EXISTS voices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  headline TEXT DEFAULT '',
  sections TEXT DEFAULT '[]',
  content TEXT DEFAULT '{}',
  created_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_voices_user ON voices(user_id);

-- Presence: when a member last did anything, for the green "active" dot.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at BIGINT;

-- Members can start communities. Moderators can add rules of their own,
-- which sit beside the community's standing rules.
ALTER TABLE communities ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS created_at BIGINT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS mod_rules TEXT DEFAULT '[]';

-- Events members create inside a community. The seeded demo events still
-- live in the frontend catalog; these are the real ones.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  description TEXT DEFAULT '',
  attending INTEGER DEFAULT 1,
  created_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_events_community ON events(community_id);
`

// Run once per cold start, and only once even if several requests race to
// be first — every caller awaits the same promise.
let ready = null
export function init() {
  if (!ready) ready = pool.query(SCHEMA)
  return ready
}

// Run several writes as one unit on a single connection, so a failure
// half-way leaves nothing behind (used by the seeder).
export async function transaction(fn) {
  const client = await pool.connect()
  const runner = {
    get: async (sql, ...a) => (await client.query(toPg(sql), a)).rows[0],
    all: async (sql, ...a) => (await client.query(toPg(sql), a)).rows,
    run: async (sql, ...a) => ({ changes: (await client.query(toPg(sql), a)).rowCount }),
  }
  try {
    await client.query('BEGIN')
    const out = await fn(runner)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

const json = (v, fallback = []) => { try { return JSON.parse(v) } catch { return fallback } }

export function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  const w = Math.floor(d / 7); if (w < 5) return `${w}w`
  return `${Math.floor(d / 30)}mo`
}

// ── User serialization ───────────────────────────────────────────────
// What location a member has agreed to show others.
export function visibleLocation(row) {
  const privacy = row.privacy || 'city-only'
  if (privacy === 'hidden') return { city: null, area: null }
  if (privacy === 'city-only') return { city: row.city, area: null }
  return { city: row.city, area: row.area } // 'exact', and retired 'neighborhood'
}

// Someone who did anything in the last few minutes counts as active.
export const ACTIVE_WINDOW_MS = 5 * 60 * 1000
export const isActive = (row) => !!row?.last_seen_at && Date.now() - row.last_seen_at < ACTIVE_WINDOW_MS

// Pure — no database access — so it stays synchronous.
export function publicUser(row) {
  if (!row) return null
  return {
    active: isActive(row), lastSeenAt: row.last_seen_at ?? null,
    id: row.id, name: row.name, handle: row.handle, title: row.title,
    ...visibleLocation(row), color: row.color, bio: row.bio,
    interests: json(row.interests), goals: json(row.goals), skills: json(row.skills),
    portfolio: json(row.portfolio),
    idVerified: !!row.id_verified,
  }
}

// The full "me" object the frontend keeps as the current user.
export async function selfUser(row) {
  if (!row) return null
  const [communities, connections] = await Promise.all([
    q.all('SELECT community_id AS id, role FROM memberships WHERE user_id = ?', row.id),
    q.all('SELECT other_id FROM connections WHERE user_id = ?', row.id),
  ])
  return {
    ...publicUser(row),
    city: row.city, area: row.area,
    privacy: row.privacy === 'neighborhood' ? 'exact' : row.privacy,
    onboarded: !!row.onboarded,
    communities: communities.map((c) => c.id),
    moderatorOf: communities.filter((c) => c.role === 'moderator').map((c) => c.id),
    connections: connections.map((r) => r.other_id),
    jobSkills: json(row.job_skills),
  }
}

export const getUserById = (id) => q.get('SELECT * FROM users WHERE id = ?', id)
export const getUserByEmail = (email) => q.get('SELECT * FROM users WHERE email = ?', String(email).toLowerCase())

// ── Post / comment serialization with live scores ────────────────────
async function myVote(viewerId, type, id) {
  if (!viewerId) return 0
  const row = await q.get('SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?', viewerId, type, id)
  return row?.value ?? 0
}

const scoreOf = async (type, id) =>
  (await q.get('SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = ? AND target_id = ?', type, id)).s

export async function serializePost(row, viewerId) {
  const [authorRow, countRow, score, mine] = await Promise.all([
    getUserById(row.author_id),
    q.get('SELECT COUNT(*) AS n FROM comments WHERE post_id = ? AND hidden = 0', row.id),
    scoreOf('post', row.id),
    myVote(viewerId, 'post', row.id),
  ])
  const author = publicUser(authorRow) || { id: row.author_id, name: 'Unknown', color: '#888' }
  return {
    id: row.id, communityId: row.community_id, title: row.title, body: row.body,
    pinned: !!row.pinned, hidden: !!row.hidden, author,
    score: row.base_score + score,
    myVote: mine,
    commentCount: countRow.n, createdAt: row.created_at, ago: timeAgo(row.created_at),
  }
}

export async function serializeComment(row, viewerId) {
  const [authorRow, score, mine] = await Promise.all([
    getUserById(row.author_id),
    scoreOf('comment', row.id),
    myVote(viewerId, 'comment', row.id),
  ])
  const author = publicUser(authorRow) || { id: row.author_id, name: 'Unknown', color: '#888' }
  return {
    id: row.id, postId: row.post_id, parentId: row.parent_id, body: row.body,
    hidden: !!row.hidden, author,
    score: row.base_score + score,
    myVote: mine,
    createdAt: row.created_at, ago: timeAgo(row.created_at), replies: [],
  }
}

// Build a threaded comment tree, each level sorted best-voted first.
export async function threadForPost(postId, viewerId) {
  const rows = await q.all('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', postId)
  const serialized = await Promise.all(rows.map((r) => serializeComment(r, viewerId)))
  const nodes = new Map()
  rows.forEach((r, i) => nodes.set(r.id, serialized[i]))
  const roots = []
  rows.forEach((r) => {
    const node = nodes.get(r.id)
    if (r.parent_id && nodes.has(r.parent_id)) nodes.get(r.parent_id).replies.push(node)
    else roots.push(node)
  })
  const sortRec = (list) => {
    list.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    list.forEach((n) => sortRec(n.replies))
  }
  sortRec(roots)
  return roots
}

export async function serializeCommunity(row, viewerId) {
  const [membership, agg, liveRow, mine] = await Promise.all([
    viewerId
      ? q.get('SELECT role FROM memberships WHERE user_id = ? AND community_id = ?', viewerId, row.id)
      : Promise.resolve(null),
    q.get('SELECT COUNT(*) AS n, COALESCE(AVG(stars),0) AS avg FROM ratings WHERE community_id = ?', row.id),
    q.get('SELECT COUNT(*) AS n FROM live_streams WHERE community_id = ? AND ended_at IS NULL', row.id),
    viewerId
      ? q.get('SELECT stars, review FROM ratings WHERE user_id = ? AND community_id = ?', viewerId, row.id)
      : Promise.resolve(null),
  ])
  return {
    id: row.id, name: row.name, tagline: row.tagline, description: row.description,
    scope: row.scope, city: row.city, accent: row.accent, icon: row.icon,
    tags: json(row.tags), rules: json(row.rules), modRules: json(row.mod_rules), memberCount: row.member_count,
    createdBy: row.created_by ?? null,
    trending: !!row.trending,
    joined: !!membership, role: membership?.role ?? null,
    rating: { avg: Math.round(agg.avg * 10) / 10, count: agg.n, mine: mine?.stars ?? 0 },
    live: liveRow.n > 0,
  }
}

// ── Jobs ─────────────────────────────────────────────────────────────
export async function serializeJob(row, viewerId) {
  const [posterRow, countRow, mineRow] = await Promise.all([
    getUserById(row.poster_id),
    q.get('SELECT COUNT(*) AS n FROM job_interests WHERE job_id = ?', row.id),
    viewerId
      ? q.get('SELECT 1 FROM job_interests WHERE job_id = ? AND user_id = ?', row.id, viewerId)
      : Promise.resolve(null),
  ])
  const poster = publicUser(posterRow) || { id: row.poster_id, name: 'Unknown', color: '#888' }
  return {
    id: row.id, title: row.title, category: row.category, description: row.description,
    area: row.area, city: row.city, budget: row.budget, verifiedOnly: !!row.verified_only,
    status: row.status, poster, interested: countRow.n, iInterested: !!mineRow,
    createdAt: row.created_at, ago: timeAgo(row.created_at),
  }
}

// ── Chats (group chats, distinct from public Communities) ─────────────
export async function serializeChat(row, viewerId) {
  const [countRow, memberRow, last] = await Promise.all([
    q.get('SELECT COUNT(*) AS n FROM chat_members WHERE chat_id = ?', row.id),
    viewerId
      ? q.get('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?', row.id, viewerId)
      : Promise.resolve(null),
    q.get('SELECT body, created_at FROM chat_messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1', row.id),
  ])
  return {
    id: row.id, name: row.name, description: row.description, communityId: row.community_id,
    accent: row.accent, memberCount: countRow.n, joined: !!memberRow, createdAt: row.created_at,
    lastMessage: last?.body ?? null, lastAt: last?.created_at ?? row.created_at,
  }
}

export async function serializeChatMessage(row) {
  const author = publicUser(await getUserById(row.sender_id)) || { id: row.sender_id, name: 'Unknown', color: '#888' }
  return { id: row.id, chatId: row.chat_id, body: row.body, author, createdAt: row.created_at, ago: timeAgo(row.created_at) }
}

// Pure — no database access.
export function serializeDm(row) {
  return { id: row.id, fromId: row.from_id, toId: row.to_id, body: row.body, createdAt: row.created_at, ago: timeAgo(row.created_at), read: !!row.read }
}

// ── Ads ──────────────────────────────────────────────────────────────
// Pure — no database access.
export function serializeEvent(row) {
  return {
    id: row.id, communityId: row.community_id, creatorId: row.creator_id,
    title: row.title, date: row.date, time: row.time, venue: row.venue,
    description: row.description, attending: row.attending,
  }
}

export function serializeAd(row) {
  return {
    id: row.id, businessName: row.business_name, tagline: row.tagline,
    ctaLabel: row.cta_label, accent: row.accent, emoji: row.emoji,
    active: !!row.active, ownerId: row.owner_id, createdAt: row.created_at,
  }
}

// ── Live streams ─────────────────────────────────────────────────────
export async function serializeLive(row) {
  const [hostRow, community] = await Promise.all([
    getUserById(row.host_id),
    q.get('SELECT id, name, accent FROM communities WHERE id = ?', row.community_id),
  ])
  return {
    id: row.id, title: row.title,
    host: publicUser(hostRow) || { id: row.host_id, name: 'Unknown', color: '#888' },
    community,
    startedAt: row.started_at, viewerCount: row.viewer_count,
  }
}

export const parseJson = json
export default q
