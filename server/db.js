// ── Interact Space database ──────────────────────────────────────────
// A real SQLite database (single file, interact.db) replacing the old
// localStorage-only demo state. Owns everything dynamic: accounts,
// membership, posts, threaded comments, votes, connections and reports.
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const dir = path.dirname(fileURLToPath(import.meta.url))
// DB_PATH lets a host mount a persistent volume somewhere else (e.g. /data/interact.db).
// Locally it stays right here next to the server code.
const dbFile = process.env.DB_PATH || path.join(dir, 'interact.db')
const db = new Database(dbFile)
db.pragma('journal_mode = WAL')

db.exec(`
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
  created_at INTEGER,
  id_verified INTEGER DEFAULT 0,
  verified_at INTEGER,
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
  created_at INTEGER,
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
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_id TEXT,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  hidden INTEGER DEFAULT 0,
  base_score INTEGER DEFAULT 0,
  created_at INTEGER
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
  created_at INTEGER,
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
  created_at INTEGER,
  resolved_at INTEGER,
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
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS job_interests (
  job_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER,
  PRIMARY KEY (job_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER,
  read INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  community_id TEXT,
  creator_id TEXT NOT NULL,
  accent TEXT DEFAULT '#4A90E8',
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS ratings (
  user_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  review TEXT DEFAULT '',
  created_at INTEGER,
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
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS live_streams (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at INTEGER,
  ended_at INTEGER,
  viewer_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(from_id, to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
`)

// Migration: existing DBs created before these columns existed.
const userCols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name)
if (!userCols.includes('id_verified')) db.exec('ALTER TABLE users ADD COLUMN id_verified INTEGER DEFAULT 0')
if (!userCols.includes('verified_at')) db.exec('ALTER TABLE users ADD COLUMN verified_at INTEGER')
if (!userCols.includes('job_skills')) db.exec("ALTER TABLE users ADD COLUMN job_skills TEXT DEFAULT '[]'")

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
export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id, name: row.name, handle: row.handle, title: row.title,
    city: row.city, area: row.area, color: row.color, bio: row.bio,
    interests: json(row.interests), goals: json(row.goals), skills: json(row.skills),
    idVerified: !!row.id_verified,
  }
}

// The full "me" object the frontend keeps as the current user.
export function selfUser(row) {
  if (!row) return null
  const communities = db.prepare('SELECT community_id AS id, role FROM memberships WHERE user_id = ?').all(row.id)
  const connections = db.prepare('SELECT other_id FROM connections WHERE user_id = ?').all(row.id).map((r) => r.other_id)
  return {
    ...publicUser(row),
    privacy: row.privacy,
    onboarded: !!row.onboarded,
    communities: communities.map((c) => c.id),
    moderatorOf: communities.filter((c) => c.role === 'moderator').map((c) => c.id),
    connections,
    jobSkills: json(row.job_skills),
  }
}

export const getUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
export const getUserByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase())

// ── Post / comment serialization with live scores ────────────────────
const voteValue = db.prepare('SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?')
const scoreOf = db.prepare("SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = ? AND target_id = ?")

function myVote(viewerId, type, id) {
  if (!viewerId) return 0
  return voteValue.get(viewerId, type, id)?.value ?? 0
}

export function serializePost(row, viewerId) {
  const author = publicUser(getUserById(row.author_id)) || { id: row.author_id, name: 'Unknown', color: '#888' }
  const commentCount = db.prepare('SELECT COUNT(*) AS n FROM comments WHERE post_id = ? AND hidden = 0').get(row.id).n
  return {
    id: row.id, communityId: row.community_id, title: row.title, body: row.body,
    pinned: !!row.pinned, hidden: !!row.hidden, author,
    score: row.base_score + scoreOf.get('post', row.id).s,
    myVote: myVote(viewerId, 'post', row.id),
    commentCount, createdAt: row.created_at, ago: timeAgo(row.created_at),
  }
}

export function serializeComment(row, viewerId) {
  const author = publicUser(getUserById(row.author_id)) || { id: row.author_id, name: 'Unknown', color: '#888' }
  return {
    id: row.id, postId: row.post_id, parentId: row.parent_id, body: row.body,
    hidden: !!row.hidden, author,
    score: row.base_score + scoreOf.get('comment', row.id).s,
    myVote: myVote(viewerId, 'comment', row.id),
    createdAt: row.created_at, ago: timeAgo(row.created_at), replies: [],
  }
}

// Build a threaded comment tree, each level sorted best-voted first.
export function threadForPost(postId, viewerId) {
  const rows = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC').all(postId)
  const nodes = new Map()
  rows.forEach((r) => nodes.set(r.id, serializeComment(r, viewerId)))
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

const ratingAgg = db.prepare('SELECT COUNT(*) AS n, COALESCE(AVG(stars),0) AS avg FROM ratings WHERE community_id = ?')
const myRating = db.prepare('SELECT stars, review FROM ratings WHERE user_id = ? AND community_id = ?')

export function serializeCommunity(row, viewerId) {
  const membership = viewerId
    ? db.prepare('SELECT role FROM memberships WHERE user_id = ? AND community_id = ?').get(viewerId, row.id)
    : null
  const agg = ratingAgg.get(row.id)
  const live = db.prepare('SELECT COUNT(*) AS n FROM live_streams WHERE community_id = ? AND ended_at IS NULL').get(row.id).n
  return {
    id: row.id, name: row.name, tagline: row.tagline, description: row.description,
    scope: row.scope, city: row.city, accent: row.accent, icon: row.icon,
    tags: json(row.tags), rules: json(row.rules), memberCount: row.member_count,
    trending: !!row.trending,
    joined: !!membership, role: membership?.role ?? null,
    rating: { avg: Math.round(agg.avg * 10) / 10, count: agg.n, mine: viewerId ? (myRating.get(viewerId, row.id)?.stars ?? 0) : 0 },
    live: live > 0,
  }
}

// ── Jobs ─────────────────────────────────────────────────────────────
export function serializeJob(row, viewerId) {
  const poster = publicUser(getUserById(row.poster_id)) || { id: row.poster_id, name: 'Unknown', color: '#888' }
  const interested = db.prepare('SELECT COUNT(*) AS n FROM job_interests WHERE job_id = ?').get(row.id).n
  const mine = viewerId ? !!db.prepare('SELECT 1 FROM job_interests WHERE job_id = ? AND user_id = ?').get(row.id, viewerId) : false
  return {
    id: row.id, title: row.title, category: row.category, description: row.description,
    area: row.area, city: row.city, budget: row.budget, verifiedOnly: !!row.verified_only,
    status: row.status, poster, interested, iInterested: mine,
    createdAt: row.created_at, ago: timeAgo(row.created_at),
  }
}

// ── Chats (group chats, distinct from public Communities) ─────────────
export function serializeChat(row, viewerId) {
  const memberCount = db.prepare('SELECT COUNT(*) AS n FROM chat_members WHERE chat_id = ?').get(row.id).n
  const joined = viewerId ? !!db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(row.id, viewerId) : false
  const last = db.prepare('SELECT body, created_at FROM chat_messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1').get(row.id)
  return {
    id: row.id, name: row.name, description: row.description, communityId: row.community_id,
    accent: row.accent, memberCount, joined, createdAt: row.created_at,
    lastMessage: last?.body ?? null, lastAt: last?.created_at ?? row.created_at,
  }
}

export function serializeChatMessage(row) {
  const author = publicUser(getUserById(row.sender_id)) || { id: row.sender_id, name: 'Unknown', color: '#888' }
  return { id: row.id, chatId: row.chat_id, body: row.body, author, createdAt: row.created_at, ago: timeAgo(row.created_at) }
}

export function serializeDm(row) {
  return { id: row.id, fromId: row.from_id, toId: row.to_id, body: row.body, createdAt: row.created_at, ago: timeAgo(row.created_at), read: !!row.read }
}

// ── Ads ──────────────────────────────────────────────────────────────
export function serializeAd(row) {
  return {
    id: row.id, businessName: row.business_name, tagline: row.tagline,
    ctaLabel: row.cta_label, accent: row.accent, emoji: row.emoji,
    active: !!row.active, ownerId: row.owner_id, createdAt: row.created_at,
  }
}

// ── Live streams ─────────────────────────────────────────────────────
export function serializeLive(row) {
  const host = publicUser(getUserById(row.host_id)) || { id: row.host_id, name: 'Unknown', color: '#888' }
  const community = db.prepare('SELECT id, name, accent FROM communities WHERE id = ?').get(row.community_id)
  return {
    id: row.id, title: row.title, host, community,
    startedAt: row.started_at, viewerCount: row.viewer_count,
  }
}

export const parseJson = json
export default db
