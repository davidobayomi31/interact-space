// ── Interact Space database ──────────────────────────────────────────
// A real SQLite database (single file, interact.db) replacing the old
// localStorage-only demo state. Owns everything dynamic: accounts,
// membership, posts, threaded comments, votes, connections and reports.
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(dir, 'interact.db'))
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
  created_at INTEGER
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

CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON memberships(user_id);
`)

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

export function serializeCommunity(row, viewerId) {
  const membership = viewerId
    ? db.prepare('SELECT role FROM memberships WHERE user_id = ? AND community_id = ?').get(viewerId, row.id)
    : null
  return {
    id: row.id, name: row.name, tagline: row.tagline, description: row.description,
    scope: row.scope, city: row.city, accent: row.accent, icon: row.icon,
    tags: json(row.tags), rules: json(row.rules), memberCount: row.member_count,
    trending: !!row.trending,
    joined: !!membership, role: membership?.role ?? null,
  }
}

export const parseJson = json
export default db
