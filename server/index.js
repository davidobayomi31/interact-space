// ── Interact Space API server ────────────────────────────────────────
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import db, {
  selfUser, publicUser, getUserByEmail, getUserById,
  serializeCommunity, serializePost, threadForPost,
} from './db.js'
import { seedIfEmpty } from './seed.js'
import { hashPassword, checkPassword, issueSession, clearSession, attachUser, requireAuth } from './auth.js'
import { companionReply } from './companion.js'

seedIfEmpty()

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(attachUser)

const uid = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`
const now = () => Date.now()
const NEW_USER_COLORS = ['#D8A63A', '#4A90E8', '#27AE60', '#9B59B6', '#E8734A', '#4AE8D4', '#E84A8A']

const err = (res, code, msg) => res.status(code).json({ error: msg })

// ── Auth ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body || {}
  if (!name?.trim()) return err(res, 400, 'Please enter your name.')
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return err(res, 400, 'Enter a valid email address.')
  if (!password || password.length < 6) return err(res, 400, 'Password must be at least 6 characters.')
  if (getUserByEmail(email)) return err(res, 409, 'An account with that email already exists.')

  const id = uid('u')
  const color = NEW_USER_COLORS[Math.floor(Math.random() * NEW_USER_COLORS.length)]
  const handle = '@' + name.trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '')
  db.prepare(`INSERT INTO users (id, email, password_hash, name, handle, title, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, email.toLowerCase(), hashPassword(password), name.trim(), handle, 'New citizen of Interact Space', color, now())
  issueSession(res, id)
  res.json({ user: selfUser(getUserById(id)) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  const row = getUserByEmail(email || '')
  if (!row || row.is_seed || !checkPassword(password || '', row.password_hash)) {
    return err(res, 401, 'Wrong email or password.')
  }
  issueSession(res, row.id)
  res.json({ user: selfUser(row) })
})

app.post('/api/auth/logout', (req, res) => { clearSession(res); res.json({ ok: true }) })

app.get('/api/auth/me', (req, res) => res.json({ user: req.userId ? selfUser(req.userRow) : null }))

app.patch('/api/auth/me', requireAuth, (req, res) => {
  const b = req.body || {}
  const cur = req.userRow
  const arr = (v, fallbackJson) => JSON.stringify(Array.isArray(v) ? v : JSON.parse(fallbackJson))
  db.prepare(`UPDATE users SET name=?, title=?, area=?, bio=?, privacy=?, interests=?, goals=?, skills=?, onboarded=? WHERE id=?`)
    .run(
      b.name?.trim() || cur.name,
      b.title ?? cur.title,
      b.area ?? cur.area,
      b.bio ?? cur.bio,
      b.privacy ?? cur.privacy,
      arr(b.interests, cur.interests),
      arr(b.goals, cur.goals),
      arr(b.skills, cur.skills),
      b.onboarded != null ? (b.onboarded ? 1 : 0) : cur.onboarded,
      cur.id,
    )
  res.json({ user: selfUser(getUserById(cur.id)) })
})

// ── Communities ──────────────────────────────────────────────────────
app.get('/api/communities', (req, res) => {
  const rows = db.prepare('SELECT * FROM communities').all()
  res.json({ communities: rows.map((c) => serializeCommunity(c, req.userId)) })
})

app.get('/api/communities/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id)
  if (!row) return err(res, 404, 'Community not found.')
  res.json({ community: serializeCommunity(row, req.userId) })
})

app.post('/api/communities/:id/join', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id)
  if (!row) return err(res, 404, 'Community not found.')
  // Demo rule: the first community you join, you also get to moderate — so
  // the moderation tools are reachable. Later joins are normal membership.
  const modCount = db.prepare("SELECT COUNT(*) AS n FROM memberships WHERE user_id = ? AND role = 'moderator'").get(req.userId).n
  const existing = db.prepare('SELECT role FROM memberships WHERE user_id = ? AND community_id = ?').get(req.userId, row.id)
  if (!existing) {
    const role = modCount === 0 ? 'moderator' : 'member'
    db.prepare('INSERT INTO memberships (user_id, community_id, role, created_at) VALUES (?, ?, ?, ?)')
      .run(req.userId, row.id, role, now())
    db.prepare('UPDATE communities SET member_count = member_count + 1 WHERE id = ?').run(row.id)
  }
  res.json({ community: serializeCommunity(row, req.userId), user: selfUser(req.userRow) })
})

app.post('/api/communities/:id/leave', requireAuth, (req, res) => {
  const existed = db.prepare('DELETE FROM memberships WHERE user_id = ? AND community_id = ?').run(req.userId, req.params.id)
  if (existed.changes) db.prepare('UPDATE communities SET member_count = MAX(0, member_count - 1) WHERE id = ?').run(req.params.id)
  const row = db.prepare('SELECT * FROM communities WHERE id = ?').get(req.params.id)
  res.json({ community: row ? serializeCommunity(row, req.userId) : null, user: selfUser(getUserById(req.userId)) })
})

// ── Connections ──────────────────────────────────────────────────────
app.post('/api/users/:id/connect', requireAuth, (req, res) => {
  const target = getUserById(req.params.id)
  if (!target) return err(res, 404, 'Person not found.')
  db.prepare('INSERT OR IGNORE INTO connections (user_id, other_id, created_at) VALUES (?, ?, ?)')
    .run(req.userId, target.id, now())
  res.json({ user: selfUser(getUserById(req.userId)) })
})

app.get('/api/users/:id', (req, res) => {
  const row = getUserById(req.params.id)
  if (!row) return err(res, 404, 'Person not found.')
  res.json({ user: publicUser(row) })
})

// ── Posts + comments ─────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  const { community, pinned, limit } = req.query
  let sql = 'SELECT * FROM posts WHERE hidden = 0'
  const args = []
  if (community) { sql += ' AND community_id = ?'; args.push(community) }
  if (pinned === '1') sql += ' AND pinned = 1'
  sql += ' ORDER BY pinned DESC, created_at DESC'
  if (limit) { sql += ' LIMIT ?'; args.push(Number(limit)) }
  const rows = db.prepare(sql).all(...args)
  res.json({ posts: rows.map((p) => serializePost(p, req.userId)) })
})

app.post('/api/posts', requireAuth, (req, res) => {
  const { communityId, title, body } = req.body || {}
  if (!title?.trim()) return err(res, 400, 'Give your post a title.')
  const community = db.prepare('SELECT id FROM communities WHERE id = ?').get(communityId)
  if (!community) return err(res, 404, 'Community not found.')
  const member = db.prepare('SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?').get(req.userId, communityId)
  if (!member) return err(res, 403, 'Join the community to post in it.')
  const id = uid('p')
  db.prepare('INSERT INTO posts (id, community_id, author_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, communityId, req.userId, title.trim(), (body || '').trim(), now())
  res.json({ post: serializePost(db.prepare('SELECT * FROM posts WHERE id = ?').get(id), req.userId) })
})

app.get('/api/posts/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)
  if (!row || row.hidden) return err(res, 404, 'Post not found.')
  res.json({ post: serializePost(row, req.userId), comments: threadForPost(row.id, req.userId) })
})

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)
  if (!post || post.hidden) return err(res, 404, 'Post not found.')
  const { body, parentId } = req.body || {}
  if (!body?.trim()) return err(res, 400, 'Write something first.')
  if (parentId) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?').get(parentId, post.id)
    if (!parent) return err(res, 400, 'That reply target no longer exists.')
  }
  const id = uid('c')
  db.prepare('INSERT INTO comments (id, post_id, parent_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, post.id, parentId || null, req.userId, body.trim(), now())
  res.json({ post: serializePost(post, req.userId), comments: threadForPost(post.id, req.userId) })
})

// ── Voting (quality signal, not feed fuel) ───────────────────────────
app.post('/api/vote', requireAuth, (req, res) => {
  const { targetType, targetId, value } = req.body || {}
  if (!['post', 'comment'].includes(targetType)) return err(res, 400, 'Bad target.')
  if (![1, -1, 0].includes(value)) return err(res, 400, 'Bad vote.')
  const table = targetType === 'post' ? 'posts' : 'comments'
  const target = db.prepare(`SELECT base_score FROM ${table} WHERE id = ?`).get(targetId)
  if (!target) return err(res, 404, 'Target not found.')

  const existing = db.prepare('SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?')
    .get(req.userId, targetType, targetId)
  // Clicking the same arrow again, or sending 0, clears the vote.
  if (value === 0 || (existing && existing.value === value)) {
    db.prepare('DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?').run(req.userId, targetType, targetId)
  } else {
    db.prepare(`INSERT INTO votes (user_id, target_type, target_id, value) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET value = excluded.value`)
      .run(req.userId, targetType, targetId, value)
  }
  const sum = db.prepare('SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = ? AND target_id = ?').get(targetType, targetId).s
  const myVote = db.prepare('SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?')
    .get(req.userId, targetType, targetId)?.value ?? 0
  res.json({ score: target.base_score + sum, myVote })
})

// ── Reporting + moderation ───────────────────────────────────────────
function communityOfTarget(type, id) {
  if (type === 'post') return db.prepare('SELECT community_id FROM posts WHERE id = ?').get(id)?.community_id
  if (type === 'comment') {
    const c = db.prepare('SELECT post_id FROM comments WHERE id = ?').get(id)
    return c ? db.prepare('SELECT community_id FROM posts WHERE id = ?').get(c.post_id)?.community_id : null
  }
  return null
}

app.post('/api/reports', requireAuth, (req, res) => {
  const { targetType, targetId, reason } = req.body || {}
  if (!['post', 'comment'].includes(targetType)) return err(res, 400, 'Bad target.')
  const communityId = communityOfTarget(targetType, targetId)
  if (!communityId) return err(res, 404, 'Target not found.')
  db.prepare(`INSERT INTO reports (id, reporter_id, target_type, target_id, community_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(uid('r'), req.userId, targetType, targetId, communityId, (reason || 'Reported').trim(), now())
  res.json({ ok: true })
})

app.get('/api/mod/reports', requireAuth, (req, res) => {
  const mod = db.prepare("SELECT community_id FROM memberships WHERE user_id = ? AND role = 'moderator'").all(req.userId)
  const ids = mod.map((m) => m.community_id)
  if (!ids.length) return res.json({ reports: [], communities: [] })
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`SELECT * FROM reports WHERE community_id IN (${placeholders}) ORDER BY (status='open') DESC, created_at DESC`).all(...ids)
  const reports = rows.map((r) => {
    let preview = '', author = null
    if (r.target_type === 'post') {
      const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(r.target_id)
      if (p) { preview = p.title; author = publicUser(getUserById(p.author_id)); }
    } else {
      const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(r.target_id)
      if (c) { preview = c.body; author = publicUser(getUserById(c.author_id)); }
    }
    const comm = db.prepare('SELECT name, accent FROM communities WHERE id = ?').get(r.community_id)
    return {
      id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason,
      status: r.status, action: r.action, createdAt: r.created_at,
      community: { id: r.community_id, name: comm?.name, accent: comm?.accent },
      reporter: publicUser(getUserById(r.reporter_id)), preview, author,
    }
  })
  res.json({ reports, communities: ids })
})

app.post('/api/reports/:id/resolve', requireAuth, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id)
  if (!report) return err(res, 404, 'Report not found.')
  const isMod = db.prepare("SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ? AND role = 'moderator'")
    .get(req.userId, report.community_id)
  if (!isMod) return err(res, 403, 'You do not moderate that community.')
  const action = req.body?.action === 'remove' ? 'remove' : 'dismiss'
  if (action === 'remove') {
    const table = report.target_type === 'post' ? 'posts' : 'comments'
    db.prepare(`UPDATE ${table} SET hidden = 1 WHERE id = ?`).run(report.target_id)
  }
  db.prepare("UPDATE reports SET status = ?, action = ?, resolved_at = ?, resolver_id = ? WHERE id = ?")
    .run(action === 'remove' ? 'resolved' : 'dismissed', action, now(), req.userId, report.id)
  res.json({ ok: true })
})

// ── Companion ────────────────────────────────────────────────────────
app.post('/api/companion', async (req, res) => {
  const message = (req.body?.message || '').toString()
  if (!message.trim()) return err(res, 400, 'Ask me something.')
  const reply = await companionReply(message, req.userRow)
  res.json(reply)
})

app.get('/api/health', (_req, res) => res.json({ ok: true, llm: !!process.env.ANTHROPIC_API_KEY }))

// Serve the built frontend (npm run build → dist/) when present, so the whole
// app is one origin on one port — ready for a tunnel (cloudflared/ngrok) or any
// host. In dev this folder doesn't exist and Vite serves the frontend instead.
const clientDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(clientDir, 'index.html'))
  })
}

// API uses its own port var so a harness-injected PORT (for Vite) can't steal it.
const PORT = process.env.API_PORT || 8787
app.listen(PORT, () => {
  console.log(`Interact Space API on http://localhost:${PORT}  (companion: ${process.env.ANTHROPIC_API_KEY ? 'LLM' : 'rule-based fallback'})`)
})
