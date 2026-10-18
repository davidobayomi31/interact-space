// ── Interact Space API server ────────────────────────────────────────
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import q, {
  init, selfUser, publicUser, getUserByEmail, getUserById,
  serializeCommunity, serializePost, threadForPost,
  serializeJob, serializeChat, serializeChatMessage, serializeDm,
  serializeAd, serializeLive, serializeEvent, parseJson, mediaLabel,
  ROLE_RANK, STAFF_SQL, isStaff, readSettings, DEFAULT_SETTINGS, transaction,
} from './db.js'
import { seedIfEmpty, seedExtras } from './seed.js'
import { hashPassword, checkPassword, issueSession, clearSession, attachUser, requireAuth } from './auth.js'
import { companionReply } from './companion.js'

const app = express()
// Photos, voice notes and short videos travel inline in JSON for now, so
// the body limit sits above the default (see cleanMedia below).
app.use(express.json({ limit: '25mb' }))
app.use(cookieParser())

// Creating the schema and seeding used to happen once at startup, when the
// server was a long-lived process. A serverless function has no startup —
// it is created and destroyed around requests — so it happens on the first
// request of each cold start instead. Every caller awaits the same promise,
// so concurrent first requests don't each try to seed.
let bootstrap = null
function ready() {
  if (!bootstrap) {
    bootstrap = (async () => {
      await init()
      await seedIfEmpty()
      await seedExtras()
    })().catch((e) => {
      bootstrap = null // let the next request retry rather than wedging forever
      throw e
    })
  }
  return bootstrap
}

app.use(async (_req, _res, next) => {
  try { await ready(); next() } catch (e) { next(e) }
})
app.use(attachUser)

// Presence. Any signed-in request counts as being around; the write is
// skipped if we already noted them in the last minute.
const SEEN_EVERY_MS = 60 * 1000
app.use(async (req, _res, next) => {
  const row = req.userRow
  if (row && (!row.last_seen_at || Date.now() - row.last_seen_at > SEEN_EVERY_MS)) {
    row.last_seen_at = Date.now()
    await q.run('UPDATE users SET last_seen_at = ? WHERE id = ?', row.last_seen_at, row.id).catch(() => {})
  }
  next()
})

const uid = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`
const now = () => Date.now()
const NEW_USER_COLORS = ['#D8A63A', '#4A90E8', '#27AE60', '#9B59B6', '#E8734A', '#4AE8D4', '#E84A8A']

const err = (res, code, msg) => res.status(code).json({ error: msg })

// ── Media attachments ────────────────────────────────────────────────
// Photos (compressed in the browser), short camera videos and voice
// messages. Placeholder storage: they are kept inline as data URLs until
// real object storage (and automated scanning for moderation) exists;
// until then attachments are covered by the normal report flow.
const MEDIA_MAX = 10
const MEDIA_TYPES = {
  image: /^image\/(jpeg|png|webp)$/,
  video: /^video\/(webm|mp4)$/,
  audio: /^audio\/(webm|ogg|mp4|mpeg)$/,
}
const MEDIA_BYTES = { image: 3 * 1024 * 1024, video: 12 * 1024 * 1024, audio: 3 * 1024 * 1024 }
function cleanMedia(list) {
  if (list == null) return []
  if (!Array.isArray(list)) throw new Error('Attachments are not in a format we understand.')
  if (list.length > MEDIA_MAX) throw new Error(`Up to ${MEDIA_MAX} attachments at a time.`)
  return list.map((m) => {
    const kind = m?.kind
    const type = String(m?.type || '').split(';')[0]
    const src = String(m?.src || '')
    if (!MEDIA_TYPES[kind]?.test(type) || !src.startsWith(`data:${type}`)) throw new Error('That file type isn’t supported.')
    if (src.length * 0.75 > MEDIA_BYTES[kind]) throw new Error('One of the attachments is too large.')
    const out = { kind, type, src }
    if (m.width) out.width = Math.round(Number(m.width)) || undefined
    if (m.height) out.height = Math.round(Number(m.height)) || undefined
    if (m.duration) out.duration = Math.round(Number(m.duration)) || undefined
    return out
  })
}

// ── Roles + moderation history ───────────────────────────────────────
const roleIn = async (userId, communityId) =>
  (await q.get('SELECT role FROM memberships WHERE user_id = ? AND community_id = ?', userId, communityId))?.role ?? null

// Write one line to a community's moderation history.
async function logAction(communityId, actorId, action, { targetType = null, targetId = null, targetUserId = null, summary = '' } = {}) {
  await q.run(`INSERT INTO mod_log (id, community_id, actor_id, action, target_type, target_id, target_user_id, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, uid('log'), communityId, actorId, action, targetType, targetId, targetUserId, String(summary).slice(0, 240), now())
}

// ── Auth ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!name?.trim()) return err(res, 400, 'Please enter your name.')
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return err(res, 400, 'Enter a valid email address.')
  if (!password || password.length < 6) return err(res, 400, 'Password must be at least 6 characters.')
  if (await getUserByEmail(email)) return err(res, 409, 'An account with that email already exists.')

  const id = uid('u')
  const color = NEW_USER_COLORS[Math.floor(Math.random() * NEW_USER_COLORS.length)]
  const handle = '@' + name.trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '')
  await q.run(`INSERT INTO users (id, email, password_hash, name, handle, title, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, id, email.toLowerCase(), hashPassword(password), name.trim(), handle, 'New citizen of Interact Space', color, now())
  issueSession(res, id)
  await recordLogin(req, id)
  res.json({ user: await selfUser(await getUserById(id)) })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const row = await getUserByEmail(email || '')
  if (!row || row.is_seed || row.deleted_at || !checkPassword(password || '', row.password_hash)) {
    return err(res, 401, 'Wrong email or password.')
  }
  issueSession(res, row.id, row.token_version)
  await recordLogin(req, row.id)
  res.json({ user: await selfUser(row) })
})

app.post('/api/auth/logout', async (req, res) => { clearSession(res); res.json({ ok: true }) })

app.get('/api/auth/me', async (req, res) => res.json({ user: req.userId ? await selfUser(req.userRow) : null }))

const PRIVACY_LEVELS = ['exact', 'city-only', 'hidden']
const MESSAGE_LEVELS = ['everyone', 'connections', 'nobody']

async function recordLogin(req, userId) {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
  await q.run('INSERT INTO login_events (id, user_id, at, user_agent, ip) VALUES (?, ?, ?, ?, ?)',
    uid('login'), userId, now(), String(req.headers['user-agent'] || '').slice(0, 300), ip.slice(0, 64)).catch(() => {})
}

// Only known preference keys, with the right types, are ever stored.
function cleanSettings(input, current) {
  if (!input || typeof input !== 'object') return null
  const next = { ...current, notify: { ...current.notify } }
  if (MESSAGE_LEVELS.includes(input.messages)) next.messages = input.messages
  for (const k of ['reduceMotion', 'largeText']) if (typeof input[k] === 'boolean') next[k] = input[k]
  if (typeof input.language === 'string' && /^[a-z]{2}$/.test(input.language)) next.language = input.language
  for (const k of Object.keys(DEFAULT_SETTINGS.notify)) {
    if (typeof input.notify?.[k] === 'boolean') next.notify[k] = input.notify[k]
  }
  return next
}

// Portfolio pieces: capped, trimmed, and only http(s) links survive.
function cleanPortfolio(v) {
  if (!Array.isArray(v)) return null
  return v.slice(0, 12).map((p) => {
    const link = String(p?.link || '').trim()
    return {
      title: String(p?.title || '').trim().slice(0, 80),
      description: String(p?.description || '').trim().slice(0, 280),
      link: /^https?:\/\//i.test(link) ? link.slice(0, 300) : '',
    }
  }).filter((p) => p.title)
}

// Social links. Platforms take a handle (a pasted https link to the
// profile also works); website and other take a full https link, so
// nothing but an ordinary web address can end up behind a profile link.
const SOCIAL_KINDS = ['instagram', 'x', 'tiktok', 'linkedin', 'youtube', 'facebook', 'whatsapp', 'snapchat', 'website', 'other']
function cleanSocials(v) {
  if (!Array.isArray(v)) return null
  return v.slice(0, 12).map((s) => {
    const kind = SOCIAL_KINDS.includes(s?.kind) ? s.kind : null
    let value = String(s?.value || '').trim().slice(0, 300)
    if (!kind || !value) return null
    if (/^https?:\/\//i.test(value)) return { kind, value }
    if (kind === 'website' || kind === 'other') return null
    if (kind === 'whatsapp') value = value.replace(/[^0-9+]/g, '')
    else value = value.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '')
    return value ? { kind, value } : null
  }).filter(Boolean)
}

app.patch('/api/auth/me', requireAuth, async (req, res) => {
  const b = req.body || {}
  const cur = req.userRow
  if (b.privacy != null && !PRIVACY_LEVELS.includes(b.privacy)) return err(res, 400, 'Unknown privacy setting.')
  const portfolio = cleanPortfolio(b.portfolio)
  const socials = cleanSocials(b.socials)
  const arr = (v, fallbackJson) => JSON.stringify(Array.isArray(v) ? v : JSON.parse(fallbackJson))

  // Usernames are how people find and mention you, so they must be unique.
  let handle = cur.handle
  if (b.handle != null) {
    const h = String(b.handle).trim().replace(/^@/, '').toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(h)) return err(res, 400, 'Usernames are 3–20 letters, numbers or underscores.')
    const taken = await q.get('SELECT id FROM users WHERE LOWER(handle) = ? AND id <> ?', '@' + h, cur.id)
    if (taken) return err(res, 409, `@${h} is already taken.`)
    handle = '@' + h
  }
  let phone = cur.phone || ''
  if (b.phone != null) {
    phone = String(b.phone).trim()
    if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) return err(res, 400, 'Enter a valid phone number.')
  }
  const settings = cleanSettings(b.settings, readSettings(cur))
  const city = b.city != null ? (String(b.city).trim().slice(0, 60) || cur.city) : cur.city

  await q.run(`UPDATE users SET handle=?, phone=?, settings=?, city=?, socials=? WHERE id=?`,
    handle, phone, JSON.stringify(settings ?? readSettings(cur)), city,
    socials ? JSON.stringify(socials) : (cur.socials || '[]'), cur.id)
  await q.run(`UPDATE users SET portfolio=?, name=?, title=?, area=?, bio=?, privacy=?, interests=?, goals=?, skills=?, job_skills=?, onboarded=? WHERE id=?`,
      portfolio ? JSON.stringify(portfolio) : (cur.portfolio || '[]'),
      b.name?.trim() || cur.name,
      b.title ?? cur.title,
      b.area ?? cur.area,
      b.bio ?? cur.bio,
      b.privacy ?? cur.privacy,
      arr(b.interests, cur.interests),
      arr(b.goals, cur.goals),
      arr(b.skills, cur.skills),
      arr(b.jobSkills, cur.job_skills),
      b.onboarded != null ? (b.onboarded ? 1 : 0) : cur.onboarded,
      cur.id,)
  res.json({ user: await selfUser(await getUserById(cur.id)) })
})

// ── Settings: account, security, data (VOIDAJ-Blueprint.md §10) ─────
// Changing how you sign in always asks for the current password.
app.post('/api/auth/email', requireAuth, async (req, res) => {
  const { email, password } = req.body || {}
  if (!checkPassword(password || '', req.userRow.password_hash)) return err(res, 401, 'That password isn’t right.')
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return err(res, 400, 'Enter a valid email address.')
  const other = await getUserByEmail(email)
  if (other && other.id !== req.userId) return err(res, 409, 'Another account already uses that email.')
  await q.run('UPDATE users SET email = ? WHERE id = ?', email.toLowerCase(), req.userId)
  res.json({ user: await selfUser(await getUserById(req.userId)) })
})

app.post('/api/auth/password', requireAuth, async (req, res) => {
  const { current, next } = req.body || {}
  if (!checkPassword(current || '', req.userRow.password_hash)) return err(res, 401, 'Your current password isn’t right.')
  if (!next || next.length < 6) return err(res, 400, 'New password must be at least 6 characters.')
  // A new password signs out every other session; this one gets a fresh token.
  const version = (req.userRow.token_version || 0) + 1
  await q.run('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?', hashPassword(next), version, req.userId)
  issueSession(res, req.userId, version)
  res.json({ ok: true })
})

app.get('/api/auth/sessions', requireAuth, async (req, res) => {
  const rows = await q.all('SELECT * FROM login_events WHERE user_id = ? ORDER BY at DESC LIMIT 15', req.userId)
  res.json({ logins: rows.map((r) => ({ id: r.id, at: Number(r.at), userAgent: r.user_agent, ip: r.ip })) })
})

app.post('/api/auth/logout-others', requireAuth, async (req, res) => {
  const version = (req.userRow.token_version || 0) + 1
  await q.run('UPDATE users SET token_version = ? WHERE id = ?', version, req.userId)
  issueSession(res, req.userId, version)
  res.json({ ok: true })
})

// Everything Voidaj holds about you, as one JSON file.
app.get('/api/me/export', requireAuth, async (req, res) => {
  const id = req.userId
  const [memberships, connections, posts, comments, messages, jobs, applications, voices, events, ratings, logins] = await Promise.all([
    q.all('SELECT community_id, role, created_at FROM memberships WHERE user_id = ?', id),
    q.all('SELECT other_id, created_at FROM connections WHERE user_id = ?', id),
    q.all('SELECT id, community_id, title, body, created_at FROM posts WHERE author_id = ?', id),
    q.all('SELECT id, post_id, body, created_at FROM comments WHERE author_id = ?', id),
    q.all('SELECT from_id, to_id, body, created_at FROM dm_messages WHERE from_id = ? OR to_id = ? ORDER BY created_at', id, id),
    q.all('SELECT * FROM jobs WHERE poster_id = ?', id),
    q.all('SELECT job_id, status, note, created_at FROM job_interests WHERE user_id = ?', id),
    q.all('SELECT name, handle, headline, sections, content, created_at FROM voices WHERE user_id = ?', id),
    q.all('SELECT * FROM events WHERE creator_id = ?', id),
    q.all('SELECT community_id, stars, review FROM ratings WHERE user_id = ?', id),
    q.all('SELECT at, user_agent, ip FROM login_events WHERE user_id = ? ORDER BY at DESC', id),
  ])
  const { password_hash, token_version, ...account } = req.userRow
  res.setHeader('Content-Disposition', `attachment; filename="voidaj-data-${new Date().toISOString().slice(0, 10)}.json"`)
  res.json({ exportedAt: new Date().toISOString(), account, memberships, connections, posts, comments, messages, jobs, applications, voices, events, ratings, logins })
})

// Deleting an account removes the person: their sign-in, profile, private
// messages, memberships and votes. What they wrote in public threads stays,
// credited to "Former member", so other people's conversations still read.
app.delete('/api/auth/me', requireAuth, async (req, res) => {
  const { password } = req.body || {}
  if (!checkPassword(password || '', req.userRow.password_hash)) return err(res, 401, 'That password isn’t right.')
  const id = req.userId
  const owned = await q.all("SELECT community_id FROM memberships WHERE user_id = ? AND role = 'owner'", id)
  await transaction(async (t) => {
    // A community shouldn't lose its owner: hand it to the most senior,
    // longest-standing person left.
    for (const { community_id: cid } of owned) {
      const heir = await t.get(`SELECT user_id FROM memberships WHERE community_id = ? AND user_id <> ?
        ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, created_at LIMIT 1`, cid, id)
      if (heir) {
        await t.run("UPDATE memberships SET role = 'owner', role_set_at = ? WHERE community_id = ? AND user_id = ?", now(), cid, heir.user_id)
        await t.run(`INSERT INTO mod_log (id, community_id, actor_id, action, target_user_id, summary, created_at)
          VALUES (?, ?, ?, 'owner.left', ?, '', ?)`, uid('log'), cid, id, heir.user_id, now())
      }
    }
    for (const sql of [
      'DELETE FROM memberships WHERE user_id = ?',
      'DELETE FROM connections WHERE user_id = ? OR other_id = ?',
      'DELETE FROM dm_messages WHERE from_id = ? OR to_id = ?',
      'DELETE FROM chat_members WHERE user_id = ?',
      'DELETE FROM job_interests WHERE user_id = ?',
      'DELETE FROM voices WHERE user_id = ?',
      'DELETE FROM votes WHERE user_id = ?',
      'DELETE FROM ratings WHERE user_id = ?',
      'DELETE FROM login_events WHERE user_id = ?',
    ]) await t.run(sql, ...Array((sql.match(/\?/g) || []).length).fill(id))
    await t.run("UPDATE jobs SET status = 'closed' WHERE poster_id = ?", id)
    await t.run(`UPDATE users SET email = NULL, password_hash = NULL, name = 'Former member', handle = NULL,
      title = '', bio = '', area = NULL, phone = '', interests = '[]', goals = '[]', skills = '[]',
      job_skills = '[]', portfolio = '[]', socials = '[]', settings = '{}', id_verified = 0,
      token_version = COALESCE(token_version, 0) + 1, deleted_at = ? WHERE id = ?`, now(), id)
  })
  clearSession(res)
  res.json({ ok: true })
})

app.post('/api/support', async (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (body.length < 5) return err(res, 400, 'Tell us a little more about what happened.')
  const kind = ['problem', 'question', 'idea'].includes(req.body?.kind) ? req.body.kind : 'problem'
  await q.run('INSERT INTO support_requests (id, user_id, kind, body, page, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    uid('sup'), req.userId, kind, body.slice(0, 4000), String(req.body?.page || '').slice(0, 200), now())
  res.json({ ok: true })
})

// Simulated ID verification — instant demo "badge", no real KYC provider.
app.post('/api/auth/verify-id', requireAuth, async (req, res) => {
  const { idNumber } = req.body || {}
  if (!idNumber || String(idNumber).trim().length < 6) return err(res, 400, 'Enter a valid ID number.')
  await q.run('UPDATE users SET id_verified = 1, verified_at = ? WHERE id = ?', now(), req.userId)
  res.json({ user: await selfUser(await getUserById(req.userId)) })
})

// ── Communities ──────────────────────────────────────────────────────
app.get('/api/communities', async (req, res) => {
  const rows = await q.all('SELECT * FROM communities')
  res.json({ communities: await Promise.all(rows.map((c) => serializeCommunity(c, req.userId))) })
})

app.get('/api/communities/:id', async (req, res) => {
  const row = await q.get('SELECT * FROM communities WHERE id = ?', req.params.id)
  if (!row) return err(res, 404, 'Community not found.')
  res.json({ community: await serializeCommunity(row, req.userId) })
})

// Start a community. Whoever starts it moderates it.
const COMMUNITY_ICONS = ['community', 'users', 'briefcase', 'camera', 'code', 'store', 'leaf', 'book', 'megaphone', 'heart', 'globe', 'star', 'wrench', 'smile']
const COMMUNITY_ACCENTS = ['#C0342A', '#1F5FA8', '#1B7F3B', '#6B3FA0', '#B45309', '#0F6E6E', '#8A5D0B', '#A8306A']
const cleanList = (v, max, len) => (Array.isArray(v) ? v : [])
  .map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max)

app.post('/api/communities', requireAuth, async (req, res) => {
  const b = req.body || {}
  const name = String(b.name || '').trim().slice(0, 60)
  if (name.length < 3) return err(res, 400, 'Give the community a name (at least 3 letters).')
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'community'
  const id = `${slug}-${crypto.randomUUID().slice(0, 4)}`
  const scope = b.scope === 'global' ? 'global' : 'local'
  const city = scope === 'global' ? 'Global' : (String(b.city || req.userRow.city || 'Lagos').trim().slice(0, 40) || 'Lagos')
  const accent = COMMUNITY_ACCENTS.includes(b.accent) ? b.accent : COMMUNITY_ACCENTS[0]
  const icon = COMMUNITY_ICONS.includes(b.icon) ? b.icon : 'community'
  const tags = cleanList(b.tags, 6, 24).map((t) => t.toLowerCase())
  const rules = cleanList(b.rules, 8, 160)
  if (!rules.some((r) => /charter/i.test(r))) rules.push('Follow the Interact Space Charter at all times.')
  await q.run(`INSERT INTO communities (id, name, tagline, description, scope, city, accent, icon, tags, rules, member_count, trending, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    id, name, String(b.tagline || '').trim().slice(0, 120), String(b.description || '').trim().slice(0, 1000),
    scope, city, accent, icon, JSON.stringify(tags), JSON.stringify(rules), req.userId, now())
  await q.run("INSERT INTO memberships (user_id, community_id, role, created_at) VALUES (?, ?, 'owner', ?)", req.userId, id, now())
  await logAction(id, req.userId, 'community.created', { summary: name })
  const row = await q.get('SELECT * FROM communities WHERE id = ?', id)
  res.json({ community: await serializeCommunity(row, req.userId), user: await selfUser(await getUserById(req.userId)) })
})

// Moderators can add rules of their own. They sit beside the community's
// standing rules rather than replacing them.
app.put('/api/communities/:id/mod-rules', requireAuth, async (req, res) => {
  const row = await q.get('SELECT * FROM communities WHERE id = ?', req.params.id)
  if (!row) return err(res, 404, 'Community not found.')
  if (!isStaff(await roleIn(req.userId, row.id))) return err(res, 403, 'Only moderators can change the rules.')
  const rules = cleanList(req.body?.rules, 10, 160)
  await q.run('UPDATE communities SET mod_rules = ? WHERE id = ?', JSON.stringify(rules), row.id)
  await logAction(row.id, req.userId, 'rules.updated', { summary: rules.length ? rules.join(' · ') : 'Cleared the moderators’ rules' })
  res.json({ community: await serializeCommunity(await q.get('SELECT * FROM communities WHERE id = ?', row.id), req.userId) })
})

// ── Events ───────────────────────────────────────────────────────────
app.get('/api/events', async (req, res) => {
  const { community } = req.query
  const rows = community
    ? await q.all('SELECT * FROM events WHERE community_id = ? ORDER BY date, created_at', community)
    : await q.all('SELECT * FROM events ORDER BY date, created_at LIMIT 50')
  res.json({ events: rows.map(serializeEvent) })
})

app.post('/api/communities/:id/events', requireAuth, async (req, res) => {
  const community = await q.get('SELECT id FROM communities WHERE id = ?', req.params.id)
  if (!community) return err(res, 404, 'Community not found.')
  const member = await q.get('SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?', req.userId, community.id)
  if (!member) return err(res, 403, 'Join the community to create an event in it.')
  const b = req.body || {}
  const title = String(b.title || '').trim().slice(0, 100)
  if (title.length < 3) return err(res, 400, 'Give the event a title.')
  const date = String(b.date || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return err(res, 400, 'Pick a date for the event.')
  const id = uid('ev')
  await q.run(`INSERT INTO events (id, community_id, creator_id, title, date, time, venue, description, attending, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`, id, community.id, req.userId, title, date,
    String(b.time || '').trim().slice(0, 20), String(b.venue || '').trim().slice(0, 100), String(b.description || '').trim().slice(0, 600), now())
  res.json({ event: serializeEvent(await q.get('SELECT * FROM events WHERE id = ?', id)) })
})

app.post('/api/communities/:id/join', requireAuth, async (req, res) => {
  const row = await q.get('SELECT * FROM communities WHERE id = ?', req.params.id)
  if (!row) return err(res, 404, 'Community not found.')
  // Joining makes you a member. Staff roles are given by a community's
  // owner or admins (see /roles), or come from starting a community.
  const existing = await q.get('SELECT role FROM memberships WHERE user_id = ? AND community_id = ?', req.userId, row.id)
  if (!existing) {
    await q.run("INSERT INTO memberships (user_id, community_id, role, created_at) VALUES (?, ?, 'member', ?)", req.userId, row.id, now())
    await q.run('UPDATE communities SET member_count = member_count + 1 WHERE id = ?', row.id)
  }
  res.json({ community: await serializeCommunity(row, req.userId), user: await selfUser(req.userRow) })
})

app.post('/api/communities/:id/leave', requireAuth, async (req, res) => {
  // A community always needs its owner; handing ownership over comes later.
  if (await roleIn(req.userId, req.params.id) === 'owner') return err(res, 400, 'Owners can’t leave their own community.')
  const existed = await q.run('DELETE FROM memberships WHERE user_id = ? AND community_id = ?', req.userId, req.params.id)
  if (existed.changes) await q.run('UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = ?', req.params.id)
  const row = await q.get('SELECT * FROM communities WHERE id = ?', req.params.id)
  res.json({ community: row ? await serializeCommunity(row, req.userId) : null, user: await selfUser(await getUserById(req.userId)) })
})

// Community ratings — a light trust signal so members can vouch that a
// community is real and active, not just a claimed member count.
app.post('/api/communities/:id/rate', requireAuth, async (req, res) => {
  const community = await q.get('SELECT * FROM communities WHERE id = ?', req.params.id)
  if (!community) return err(res, 404, 'Community not found.')
  const stars = Number(req.body?.stars)
  if (![1, 2, 3, 4, 5].includes(stars)) return err(res, 400, 'Rating must be 1-5 stars.')
  await q.run(`INSERT INTO ratings (user_id, community_id, stars, review, created_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, community_id) DO UPDATE SET stars = excluded.stars, review = excluded.review`, req.userId, community.id, stars, (req.body?.review || '').trim(), now())
  res.json({ community: await serializeCommunity(community, req.userId) })
})

// ── Connections ──────────────────────────────────────────────────────
app.post('/api/users/:id/connect', requireAuth, async (req, res) => {
  const target = await getUserById(req.params.id)
  if (!target) return err(res, 404, 'Person not found.')
  await q.run('INSERT INTO connections (user_id, other_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', req.userId, target.id, now())
  res.json({ user: await selfUser(await getUserById(req.userId)) })
})

app.get('/api/users/:id', async (req, res) => {
  const row = await getUserById(req.params.id)
  if (!row) return err(res, 404, 'Person not found.')
  res.json({ user: publicUser(row) })
})

// ── Posts + comments ─────────────────────────────────────────────────
app.get('/api/posts', async (req, res) => {
  const { community, pinned, limit } = req.query
  let sql = 'SELECT * FROM posts WHERE hidden = 0'
  const args = []
  if (community) { sql += ' AND community_id = ?'; args.push(community) }
  if (pinned === '1') sql += ' AND pinned = 1'
  sql += ' ORDER BY pinned DESC, created_at DESC'
  if (limit) { sql += ' LIMIT ?'; args.push(Number(limit)) }
  const rows = await q.all(sql, ...args)
  res.json({ posts: await Promise.all(rows.map((p) => serializePost(p, req.userId))) })
})

app.post('/api/posts', requireAuth, async (req, res) => {
  const { communityId, title, body } = req.body || {}
  if (!title?.trim()) return err(res, 400, 'Give your post a title.')
  let media
  try { media = cleanMedia(req.body?.media) } catch (e) { return err(res, 400, e.message) }
  const community = await q.get('SELECT id FROM communities WHERE id = ?', communityId)
  if (!community) return err(res, 404, 'Community not found.')
  const member = await q.get('SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?', req.userId, communityId)
  if (!member) return err(res, 403, 'Join the community to post in it.')
  const id = uid('p')
  await q.run('INSERT INTO posts (id, community_id, author_id, title, body, media, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, communityId, req.userId, title.trim(), (body || '').trim(), JSON.stringify(media), now())
  res.json({ post: await serializePost(await q.get('SELECT * FROM posts WHERE id = ?', id), req.userId) })
})

app.get('/api/posts/:id', async (req, res) => {
  const row = await q.get('SELECT * FROM posts WHERE id = ?', req.params.id)
  if (!row || row.hidden) return err(res, 404, 'Post not found.')
  res.json({ post: await serializePost(row, req.userId), comments: await threadForPost(row.id, req.userId) })
})

app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  const post = await q.get('SELECT * FROM posts WHERE id = ?', req.params.id)
  if (!post || post.hidden) return err(res, 404, 'Post not found.')
  const { body, parentId } = req.body || {}
  if (!body?.trim()) return err(res, 400, 'Write something first.')
  if (parentId) {
    const parent = await q.get('SELECT id FROM comments WHERE id = ? AND post_id = ?', parentId, post.id)
    if (!parent) return err(res, 400, 'That reply target no longer exists.')
  }
  const id = uid('c')
  await q.run('INSERT INTO comments (id, post_id, parent_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, post.id, parentId || null, req.userId, body.trim(), now())
  res.json({ post: await serializePost(post, req.userId), comments: await threadForPost(post.id, req.userId) })
})

// ── Voting (quality signal, not feed fuel) ───────────────────────────
app.post('/api/vote', requireAuth, async (req, res) => {
  const { targetType, targetId, value } = req.body || {}
  if (!['post', 'comment'].includes(targetType)) return err(res, 400, 'Bad target.')
  if (![1, -1, 0].includes(value)) return err(res, 400, 'Bad vote.')
  const table = targetType === 'post' ? 'posts' : 'comments'
  const target = await q.get(`SELECT base_score FROM ${table} WHERE id = ?`, targetId)
  if (!target) return err(res, 404, 'Target not found.')

  const existing = await q.get('SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?', req.userId, targetType, targetId)
  // Clicking the same arrow again, or sending 0, clears the vote.
  if (value === 0 || (existing && existing.value === value)) {
    await q.run('DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?', req.userId, targetType, targetId)
  } else {
    await q.run(`INSERT INTO votes (user_id, target_type, target_id, value) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET value = excluded.value`, req.userId, targetType, targetId, value)
  }
  const sum = (await q.get('SELECT COALESCE(SUM(value),0) AS s FROM votes WHERE target_type = ? AND target_id = ?', targetType, targetId)).s
  const myVote = (await q.get('SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?', req.userId, targetType, targetId))?.value ?? 0
  res.json({ score: target.base_score + sum, myVote })
})

// ── Reporting + moderation ───────────────────────────────────────────
async function communityOfTarget(type, id) {
  if (type === 'post') return (await q.get('SELECT community_id FROM posts WHERE id = ?', id))?.community_id
  if (type === 'comment') {
    const c = await q.get('SELECT post_id FROM comments WHERE id = ?', id)
    return c ? (await q.get('SELECT community_id FROM posts WHERE id = ?', c.post_id))?.community_id : null
  }
  return null
}

app.post('/api/reports', requireAuth, async (req, res) => {
  const { targetType, targetId, reason } = req.body || {}
  if (!['post', 'comment'].includes(targetType)) return err(res, 400, 'Bad target.')
  const communityId = await communityOfTarget(targetType, targetId)
  if (!communityId) return err(res, 404, 'Target not found.')
  await q.run(`INSERT INTO reports (id, reporter_id, target_type, target_id, community_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`, uid('r'), req.userId, targetType, targetId, communityId, (reason || 'Reported').trim(), now())
  res.json({ ok: true })
})

app.get('/api/mod/reports', requireAuth, async (req, res) => {
  const mod = await q.all(`SELECT community_id FROM memberships WHERE user_id = ? AND role IN ${STAFF_SQL}`, req.userId)
  const ids = mod.map((m) => m.community_id)
  if (!ids.length) return res.json({ reports: [], communities: [] })
  const placeholders = ids.map(() => '?').join(',')
  const rows = await q.all(`SELECT * FROM reports WHERE community_id IN (${placeholders}) ORDER BY (status='open') DESC, created_at DESC`, ...ids)
  const reports = await Promise.all(rows.map(async (r) => {
    let preview = '', author = null
    if (r.target_type === 'post') {
      const p = await q.get('SELECT * FROM posts WHERE id = ?', r.target_id)
      if (p) { preview = p.title; author = publicUser(await getUserById(p.author_id)); }
    } else {
      const c = await q.get('SELECT * FROM comments WHERE id = ?', r.target_id)
      if (c) { preview = c.body; author = publicUser(await getUserById(c.author_id)); }
    }
    const comm = await q.get('SELECT name, accent FROM communities WHERE id = ?', r.community_id)
    return {
      id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason,
      status: r.status, action: r.action, createdAt: r.created_at,
      community: { id: r.community_id, name: comm?.name, accent: comm?.accent },
      reporter: publicUser(await getUserById(r.reporter_id)), preview, author,
    }
  }))
  res.json({ reports, communities: ids })
})

// Change someone's role in a community. Owners can make admins and
// moderators; admins can make moderators. Nobody changes their own role or
// the role of someone at or above their own rank, and ownership itself
// can't be handed over here.
app.post('/api/communities/:id/roles', requireAuth, async (req, res) => {
  const communityId = req.params.id
  const { userId, role } = req.body || {}
  if (!['admin', 'moderator', 'member'].includes(role)) return err(res, 400, 'Pick admin, moderator or member.')
  if (userId === req.userId) return err(res, 400, 'You can’t change your own role.')
  const mine = await roleIn(req.userId, communityId)
  const theirs = await roleIn(userId, communityId)
  if (!theirs) return err(res, 404, 'That person isn’t a member of this community.')
  const myRank = ROLE_RANK[mine] ?? 0
  if (myRank < ROLE_RANK.admin) return err(res, 403, 'Only owners and admins can change roles.')
  if (ROLE_RANK[theirs] >= myRank || ROLE_RANK[role] >= myRank) return err(res, 403, 'You can only manage roles below your own.')
  if (theirs === role) return res.json({ ok: true, role })
  await q.run('UPDATE memberships SET role = ?, role_set_at = ? WHERE user_id = ? AND community_id = ?', role, now(), userId, communityId)
  const target = await getUserById(userId)
  await logAction(communityId, req.userId, 'role.changed', { targetType: 'user', targetId: userId, targetUserId: userId, summary: `${theirs} → ${role}` })
  res.json({ ok: true, role, user: publicUser(target) })
})

// Moderation history for the communities you're staff in.
app.get('/api/mod/history', requireAuth, async (req, res) => {
  const staffIn = (await q.all(`SELECT community_id FROM memberships WHERE user_id = ? AND role IN ${STAFF_SQL}`, req.userId)).map((r) => r.community_id)
  const ids = req.query.community ? staffIn.filter((id) => id === req.query.community) : staffIn
  if (!ids.length) return res.json({ entries: [] })
  const rows = await q.all(`SELECT * FROM mod_log WHERE community_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT 100`, ...ids)
  const people = new Map()
  const person = async (id) => {
    if (!id) return null
    if (!people.has(id)) people.set(id, publicUser(await getUserById(id)))
    return people.get(id)
  }
  const entries = []
  for (const r of rows) {
    entries.push({
      id: r.id, communityId: r.community_id, action: r.action, at: r.created_at,
      targetType: r.target_type, targetId: r.target_id, summary: r.summary,
      actor: await person(r.actor_id), targetUser: await person(r.target_user_id),
    })
  }
  res.json({ entries })
})

// The moderator's home screen: every community you moderate with its
// numbers, the people in them, and what's been happening lately.
const WEEK_MS = 7 * 24 * 3600 * 1000
app.get('/api/mod/dashboard', requireAuth, async (req, res) => {
  const mine = await q.all(`SELECT community_id, created_at FROM memberships WHERE user_id = ? AND role IN ${STAFF_SQL}`, req.userId)
  const ids = mine.map((m) => m.community_id)
  if (!ids.length) return res.json({ communities: [], members: [], activity: [] })
  const inIds = ids.map(() => '?').join(',')
  const t = now(), week = t - WEEK_MS, activeSince = t - 5 * 60 * 1000

  const rows = await q.all(`SELECT * FROM communities WHERE id IN (${inIds})`, ...ids)
  const communities = await Promise.all(rows.map(async (c) => {
    const [joined, activeNow, activeWeek, newWeek, posts, postsWeek, openReports, resolvedWeek, events] = await Promise.all([
      q.get('SELECT COUNT(*) AS n FROM memberships WHERE community_id = ?', c.id),
      q.get('SELECT COUNT(*) AS n FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.community_id = ? AND u.last_seen_at > ?', c.id, activeSince),
      q.get('SELECT COUNT(*) AS n FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.community_id = ? AND u.last_seen_at > ?', c.id, week),
      q.get('SELECT COUNT(*) AS n FROM memberships WHERE community_id = ? AND created_at > ?', c.id, week),
      q.get('SELECT COUNT(*) AS n FROM posts WHERE community_id = ? AND hidden = 0', c.id),
      q.get('SELECT COUNT(*) AS n FROM posts WHERE community_id = ? AND hidden = 0 AND created_at > ?', c.id, week),
      q.get("SELECT COUNT(*) AS n FROM reports WHERE community_id = ? AND status = 'open'", c.id),
      q.get("SELECT COUNT(*) AS n FROM reports WHERE community_id = ? AND status <> 'open' AND resolved_at > ?", c.id, week),
      q.get('SELECT COUNT(*) AS n FROM events WHERE community_id = ? AND date >= ?', c.id, new Date(t).toISOString().slice(0, 10)),
    ])
    return {
      ...(await serializeCommunity(c, req.userId)),
      stats: {
        joined: joined.n, activeNow: activeNow.n, activeWeek: activeWeek.n, newWeek: newWeek.n,
        posts: posts.n, postsWeek: postsWeek.n, openReports: openReports.n, resolvedWeek: resolvedWeek.n,
        upcomingEvents: events.n,
      },
    }
  }))

  const memberRows = await q.all(`SELECT u.*, m.community_id, m.role, m.created_at AS joined_at
    FROM memberships m JOIN users u ON u.id = m.user_id
    WHERE m.community_id IN (${inIds}) ORDER BY u.last_seen_at DESC NULLS LAST, m.created_at DESC LIMIT 200`, ...ids)
  const members = memberRows.map((r) => ({ user: publicUser(r), communityId: r.community_id, role: r.role, joinedAt: r.joined_at }))

  // Recent activity: joins, posts, comments, events and reports, newest first.
  const [joins, posts, comments, events, reports] = await Promise.all([
    q.all(`SELECT u.*, m.community_id, m.created_at AS at FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.community_id IN (${inIds}) AND m.created_at IS NOT NULL ORDER BY m.created_at DESC LIMIT 15`, ...ids),
    q.all(`SELECT u.*, p.id AS post_id, p.title AS item_title, p.community_id, p.created_at AS at FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.community_id IN (${inIds}) AND p.hidden = 0 ORDER BY p.created_at DESC LIMIT 15`, ...ids),
    q.all(`SELECT u.*, c.body AS item_body, p.id AS post_id, p.title AS item_title, p.community_id, c.created_at AS at FROM comments c
      JOIN posts p ON p.id = c.post_id JOIN users u ON u.id = c.author_id
      WHERE p.community_id IN (${inIds}) AND c.hidden = 0 ORDER BY c.created_at DESC LIMIT 15`, ...ids),
    q.all(`SELECT u.*, e.id AS event_id, e.title AS item_title, e.community_id, e.created_at AS at FROM events e JOIN users u ON u.id = e.creator_id
      WHERE e.community_id IN (${inIds}) ORDER BY e.created_at DESC LIMIT 15`, ...ids),
    q.all(`SELECT u.*, r.reason, r.target_type, r.community_id, r.created_at AS at FROM reports r JOIN users u ON u.id = r.reporter_id
      WHERE r.community_id IN (${inIds}) ORDER BY r.created_at DESC LIMIT 15`, ...ids),
  ])
  const item = (type, r, extra) => ({ type, at: r.at, communityId: r.community_id, actor: publicUser(r), ...extra })
  const activity = [
    ...joins.map((r) => item('join', r, {})),
    ...posts.map((r) => item('post', r, { title: r.item_title, link: `/post/${r.post_id}` })),
    ...comments.map((r) => item('comment', r, { title: r.item_title, text: r.item_body.slice(0, 120), link: `/post/${r.post_id}` })),
    ...events.map((r) => item('event', r, { title: r.item_title, link: `/community/${r.community_id}?tab=events` })),
    ...reports.map((r) => item('report', r, { title: r.reason, text: r.target_type })),
  ].filter((a) => a.at).sort((a, b) => b.at - a.at).slice(0, 25)

  res.json({ communities, members, activity })
})

app.post('/api/reports/:id/resolve', requireAuth, async (req, res) => {
  const report = await q.get('SELECT * FROM reports WHERE id = ?', req.params.id)
  if (!report) return err(res, 404, 'Report not found.')
  if (!isStaff(await roleIn(req.userId, report.community_id))) return err(res, 403, 'You do not moderate that community.')
  const action = req.body?.action === 'remove' ? 'remove' : 'dismiss'
  const table = report.target_type === 'post' ? 'posts' : 'comments'
  const target = await q.get(`SELECT * FROM ${table} WHERE id = ?`, report.target_id)
  if (action === 'remove') await q.run(`UPDATE ${table} SET hidden = 1 WHERE id = ?`, report.target_id)
  await logAction(report.community_id, req.userId, action === 'remove' ? 'content.removed' : 'report.dismissed', {
    targetType: report.target_type, targetId: report.target_id, targetUserId: target?.author_id ?? null,
    summary: `${(target?.title || target?.body || '').slice(0, 120)} — reported for: ${report.reason}`,
  })
  await q.run("UPDATE reports SET status = ?, action = ?, resolved_at = ?, resolver_id = ? WHERE id = ?", action === 'remove' ? 'resolved' : 'dismissed', action, now(), req.userId, report.id)
  res.json({ ok: true })
})

// ── Quick Jobs ───────────────────────────────────────────────────────
// Local trade/gig work with an "ID verified" trust signal. Posting a job
// notifies (via poll) anyone whose job_skills include that category.
app.get('/api/jobs', async (req, res) => {
  const { category, matchMine } = req.query
  let rows
  if (matchMine === '1' && req.userId) {
    const mySkills = parseJson(req.userRow.job_skills)
    if (!mySkills.length) rows = []
    else {
      const placeholders = mySkills.map(() => '?').join(',')
      rows = await q.all(`SELECT * FROM jobs WHERE status = 'open' AND category IN (${placeholders}) ORDER BY created_at DESC`, ...mySkills)
    }
  } else if (category) {
    rows = await q.all("SELECT * FROM jobs WHERE status = 'open' AND category = ? ORDER BY created_at DESC", category)
  } else {
    rows = await q.all("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC")
  }
  res.json({ jobs: await Promise.all(rows.map((j) => serializeJob(j, req.userId))) })
})

app.post('/api/jobs', requireAuth, async (req, res) => {
  const { title, category, description, area, budget, verifiedOnly } = req.body || {}
  if (!title?.trim()) return err(res, 400, 'Give the job a title.')
  if (!category?.trim()) return err(res, 400, 'Pick a category.')
  const id = uid('j')
  await q.run(`INSERT INTO jobs (id, poster_id, title, category, description, area, city, budget, verified_only, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Lagos', ?, ?, ?)`, id, req.userId, title.trim(), category, (description || '').trim(), (area || '').trim(), (budget || '').trim(), verifiedOnly ? 1 : 0, now())
  res.json({ job: await serializeJob(await q.get('SELECT * FROM jobs WHERE id = ?', id), req.userId) })
})

app.post('/api/jobs/:id/interest', requireAuth, async (req, res) => {
  const job = await q.get('SELECT * FROM jobs WHERE id = ?', req.params.id)
  if (!job) return err(res, 404, 'Job not found.')
  if (job.verified_only && !req.userRow.id_verified) return err(res, 403, 'This job requires ID verification.')
  const existing = await q.get('SELECT 1 FROM job_interests WHERE job_id = ? AND user_id = ?', job.id, req.userId)
  if (existing) await q.run('DELETE FROM job_interests WHERE job_id = ? AND user_id = ?', job.id, req.userId)
  else await q.run('INSERT INTO job_interests (job_id, user_id, created_at) VALUES (?, ?, ?)', job.id, req.userId, now())
  res.json({ job: await serializeJob(job, req.userId) })
})

// ── Job history: an applicant's own tracker ─────────────────────────
// "applied" reads as "waiting to hear back" in the UI.
const APPLICATION_STATUSES = ['applied', 'talking', 'hired', 'declined', 'withdrawn']

// People who do work, for Quick Jobs → Find people: everyone who has listed
// the kinds of job they do, with how many jobs they've been hired for.
// Only what publicUser already shows (location follows their privacy).
app.get('/api/pros', async (req, res) => {
  const [rows, hired] = await Promise.all([
    q.all("SELECT * FROM users WHERE job_skills IS NOT NULL AND job_skills <> '[]' AND deleted_at IS NULL ORDER BY COALESCE(id_verified, 0) DESC, last_seen_at DESC NULLS LAST"),
    q.all("SELECT user_id, COUNT(*)::int AS n FROM job_interests WHERE status = 'hired' GROUP BY user_id"),
  ])
  const done = Object.fromEntries(hired.map((h) => [h.user_id, h.n]))
  res.json({ pros: rows.filter((r) => r.id !== req.userId).map((r) => ({ ...publicUser(r), jobSkills: parseJson(r.job_skills), jobsDone: done[r.id] || 0 })) })
})

app.get('/api/me/jobs', requireAuth, async (req, res) => {
  const [interests, postedRows] = await Promise.all([
    q.all('SELECT * FROM job_interests WHERE user_id = ? ORDER BY created_at DESC', req.userId),
    q.all('SELECT * FROM jobs WHERE poster_id = ? ORDER BY created_at DESC', req.userId),
  ])
  const applied = (await Promise.all(interests.map(async (i) => {
    const row = await q.get('SELECT * FROM jobs WHERE id = ?', i.job_id)
    if (!row) return null
    return {
      job: await serializeJob(row, req.userId),
      status: i.status || 'applied',
      appliedAt: i.created_at,
      statusAt: i.status_at || i.created_at,
      note: i.note || '',
    }
  }))).filter(Boolean)
  const posted = await Promise.all(postedRows.map((r) => serializeJob(r, req.userId)))
  res.json({ applied, posted })
})

app.patch('/api/jobs/:id/application', requireAuth, async (req, res) => {
  const { status, note } = req.body || {}
  if (status != null && !APPLICATION_STATUSES.includes(status)) return err(res, 400, 'Unknown status.')
  const cur = await q.get('SELECT * FROM job_interests WHERE job_id = ? AND user_id = ?', req.params.id, req.userId)
  if (!cur) return err(res, 404, 'You haven\u2019t applied to that job.')
  await q.run('UPDATE job_interests SET status = ?, status_at = ?, note = ? WHERE job_id = ? AND user_id = ?',
    status ?? cur.status, status && status !== cur.status ? now() : cur.status_at,
    note != null ? String(note).trim().slice(0, 280) : cur.note, req.params.id, req.userId)
  res.json({ ok: true })
})

// ── Voices: extra, separately shareable versions of a profile ──────────
// A member has their main profile plus up to three voices (four in all).
// Each voice has its own handle and shows only the sections picked for it;
// the public view never reveals which account it belongs to.
// Your main profile plus one VIS. Members who made more before the limit
// keep them; they just can't add another.
const MAX_PROFILES = 2
const VOICE_SECTIONS = ['about', 'interests', 'skills', 'work', 'communities', 'posts', 'offers', 'portfolio']
const HANDLE_RE = /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/

const text = (v, max) => String(v ?? '').trim().slice(0, max)
const tags = (v) => (Array.isArray(v) ? v : []).map((t) => text(t, 40)).filter(Boolean).slice(0, 20)
const items = (v, shape) => (Array.isArray(v) ? v : []).slice(0, 12)
  .map((it) => Object.fromEntries(Object.entries(shape).map(([k, max]) => [k, text(it?.[k], max)])))
  .filter((it) => Object.values(it).some(Boolean))

function cleanVoiceContent(sections, c = {}) {
  const out = {}
  if (sections.includes('about')) out.about = { text: text(c.about?.text, 600) }
  if (sections.includes('interests')) out.interests = { tags: tags(c.interests?.tags) }
  if (sections.includes('skills')) out.skills = { tags: tags(c.skills?.tags) }
  if (sections.includes('work')) out.work = { items: items(c.work?.items, { role: 80, org: 80, years: 40 }) }
  // Posts are drawn from the chosen communities, so keep the ids for either section.
  if (sections.includes('communities') || sections.includes('posts')) out.communities = { ids: tags(c.communities?.ids) }
  if (sections.includes('offers')) out.offers = { items: items(c.offers?.items, { title: 80, detail: 200, rate: 40 }) }
  if (sections.includes('portfolio')) {
    out.portfolio = { items: items(c.portfolio?.items, { title: 80, description: 280, link: 300 })
      .map((p) => ({ ...p, link: /^https?:\/\//i.test(p.link) ? p.link : '' })) }
  }
  return out
}

const voiceOut = (row) => ({
  id: row.id, name: row.name, handle: row.handle, headline: row.headline,
  sections: parseJson(row.sections), content: parseJson(row.content, {}), createdAt: row.created_at,
})

async function handleTaken(handle, exceptVoiceId) {
  const v = await q.get('SELECT id FROM voices WHERE handle = ?', handle)
  if (v && v.id !== exceptVoiceId) return true
  const u = await q.get("SELECT id FROM users WHERE LOWER(REPLACE(handle, '@', '')) = ?", handle)
  return !!u
}

async function readVoiceBody(req, res, existing) {
  const b = req.body || {}
  const name = text(b.name ?? existing?.name, 40)
  const handle = text(b.handle ?? existing?.handle, 30).toLowerCase().replace(/^@/, '')
  const sections = (Array.isArray(b.sections) ? b.sections : parseJson(existing?.sections))
    .filter((s, i, a) => VOICE_SECTIONS.includes(s) && a.indexOf(s) === i)
  if (!name) return err(res, 400, 'Give this profile a name, like \u201cWork\u201d.')
  if (!HANDLE_RE.test(handle)) return err(res, 400, 'Usernames are 3\u201330 characters: letters, numbers, dots or underscores.')
  if (!sections.length) return err(res, 400, 'Pick at least one section for people to see.')
  if (await handleTaken(handle, existing?.id)) return err(res, 409, `@${handle} is taken. Try another.`)
  // Communities can only be ones the member actually belongs to.
  const content = cleanVoiceContent(sections, b.content ?? parseJson(existing?.content, {}))
  if (content.communities) {
    const mine = new Set((await q.all('SELECT community_id FROM memberships WHERE user_id = ?', req.userId)).map((r) => r.community_id))
    content.communities.ids = content.communities.ids.filter((id) => mine.has(id))
  }
  return { name, handle, headline: text(b.headline ?? existing?.headline, 120), sections, content }
}

app.get('/api/voices', requireAuth, async (req, res) => {
  const rows = await q.all('SELECT * FROM voices WHERE user_id = ? ORDER BY created_at ASC', req.userId)
  res.json({ voices: rows.map(voiceOut), max: MAX_PROFILES })
})

app.post('/api/voices', requireAuth, async (req, res) => {
  const { n } = await q.get('SELECT COUNT(*)::int AS n FROM voices WHERE user_id = ?', req.userId)
  if (n + 1 >= MAX_PROFILES) return err(res, 400, 'You can have one VIS besides your main profile.')
  const v = await readVoiceBody(req, res)
  if (!v || res.headersSent) return
  const id = uid('v')
  await q.run('INSERT INTO voices (id, user_id, name, handle, headline, sections, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, req.userId, v.name, v.handle, v.headline, JSON.stringify(v.sections), JSON.stringify(v.content), now())
  res.json({ voice: voiceOut(await q.get('SELECT * FROM voices WHERE id = ?', id)) })
})

app.patch('/api/voices/:id', requireAuth, async (req, res) => {
  const existing = await q.get('SELECT * FROM voices WHERE id = ? AND user_id = ?', req.params.id, req.userId)
  if (!existing) return err(res, 404, 'Profile not found.')
  const v = await readVoiceBody(req, res, existing)
  if (!v || res.headersSent) return
  await q.run('UPDATE voices SET name = ?, handle = ?, headline = ?, sections = ?, content = ? WHERE id = ?',
    v.name, v.handle, v.headline, JSON.stringify(v.sections), JSON.stringify(v.content), existing.id)
  res.json({ voice: voiceOut(await q.get('SELECT * FROM voices WHERE id = ?', existing.id)) })
})

app.delete('/api/voices/:id', requireAuth, async (req, res) => {
  const { changes } = await q.run('DELETE FROM voices WHERE id = ? AND user_id = ?', req.params.id, req.userId)
  if (!changes) return err(res, 404, 'Profile not found.')
  res.json({ ok: true })
})

// Public view of one voice. Deliberately omits the owner's id, handle and
// main-profile link: a work voice shouldn't lead back to the personal one.
app.get('/api/v/:handle', async (req, res) => {
  const row = await q.get('SELECT * FROM voices WHERE handle = ?', String(req.params.handle).toLowerCase())
  if (!row) return err(res, 404, 'No profile with that username.')
  const owner = await getUserById(row.user_id)
  const voice = voiceOut(row)
  const resolved = { ...voice.content }
  if (voice.sections.includes('communities') || voice.sections.includes('posts')) {
    const ids = voice.content.communities?.ids || []
    const comms = ids.length
      ? await q.all(`SELECT id, name, tagline, accent FROM communities WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
      : []
    if (voice.sections.includes('communities')) resolved.communities = { list: comms }
    if (voice.sections.includes('posts')) {
      const postRows = ids.length
        ? await q.all(`SELECT * FROM posts WHERE author_id = ? AND hidden = 0 AND community_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT 5`, row.user_id, ...ids)
        : []
      resolved.posts = { list: await Promise.all(postRows.map((p) => serializePost(p, req.userId))) }
    }
  }
  res.json({
    voice: { ...voice, content: resolved },
    owner: owner ? { name: owner.name, color: owner.color, idVerified: !!owner.id_verified } : null,
  })
})

// ── Direct messages ──────────────────────────────────────────────────
app.get('/api/messages', requireAuth, async (req, res) => {
  const rows = await q.all(`
    SELECT other_id, MAX(created_at) AS last_at FROM (
      SELECT to_id AS other_id, created_at FROM dm_messages WHERE from_id = ?
      UNION ALL
      SELECT from_id AS other_id, created_at FROM dm_messages WHERE to_id = ?
    ) AS pairs GROUP BY other_id ORDER BY last_at DESC
  `, req.userId, req.userId)
  const conversations = (await Promise.all(rows.map(async (r) => {
    const other = publicUser(await getUserById(r.other_id))
    const last = await q.get(`SELECT body, media, created_at FROM dm_messages
      WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
      ORDER BY created_at DESC LIMIT 1`, req.userId, r.other_id, r.other_id, req.userId)
    const unread = (await q.get('SELECT COUNT(*) AS n FROM dm_messages WHERE from_id = ? AND to_id = ? AND read = 0', r.other_id, req.userId)).n
    return { other, lastMessage: last?.body || mediaLabel(last?.media), lastAt: last?.created_at ?? r.last_at, unread }
  }))).filter((c) => c.other)
  res.json({ conversations })
})

app.get('/api/messages/:userId', requireAuth, async (req, res) => {
  const other = await getUserById(req.params.userId)
  if (!other) return err(res, 404, 'Person not found.')
  await q.run('UPDATE dm_messages SET read = 1 WHERE from_id = ? AND to_id = ?', other.id, req.userId)
  const rows = await q.all(`SELECT * FROM dm_messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at ASC`, req.userId, other.id, other.id, req.userId)
  res.json({ other: publicUser(other), messages: rows.map(serializeDm) })
})

app.post('/api/messages/:userId', requireAuth, async (req, res) => {
  const other = await getUserById(req.params.userId)
  if (!other) return err(res, 404, 'Person not found.')
  const body = (req.body?.body || '').trim()
  let media
  try { media = cleanMedia(req.body?.media) } catch (e) { return err(res, 400, e.message) }
  if (!body && !media.length) return err(res, 400, 'Write something first.')
  // Respect who the recipient lets message them. A conversation they've
  // already had with you stays open either way.
  const allow = readSettings(other).messages
  if (allow !== 'everyone') {
    const talked = await q.get('SELECT 1 FROM dm_messages WHERE from_id = ? AND to_id = ? LIMIT 1', other.id, req.userId)
    const connected = await q.get('SELECT 1 FROM connections WHERE (user_id = ? AND other_id = ?) OR (user_id = ? AND other_id = ?) LIMIT 1',
      other.id, req.userId, req.userId, other.id)
    if (!talked && (allow === 'nobody' || !connected)) {
      return err(res, 403, allow === 'nobody'
        ? `${other.name} isn’t taking new messages right now.`
        : `${other.name} only takes messages from their connections.`)
    }
  }
  const id = uid('dm')
  await q.run('INSERT INTO dm_messages (id, from_id, to_id, body, media, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, req.userId, other.id, body, JSON.stringify(media), now())
  res.json({ message: serializeDm(await q.get('SELECT * FROM dm_messages WHERE id = ?', id)) })
})

// ── Group chats — private, real-time-style chat rooms. Structurally
// distinct from Communities: no posts/votes/threads, just a member list
// and a message stream. May be scoped to a community or standalone. ────
app.get('/api/chats', requireAuth, async (req, res) => {
  const rows = await q.all('SELECT * FROM chats ORDER BY created_at DESC')
  res.json({ chats: await Promise.all(rows.map((c) => serializeChat(c, req.userId))) })
})

app.post('/api/chats', requireAuth, async (req, res) => {
  const { name, description, communityId } = req.body || {}
  if (!name?.trim()) return err(res, 400, 'Give the group chat a name.')
  const id = uid('gc')
  await q.run('INSERT INTO chats (id, name, description, community_id, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, name.trim(), (description || '').trim(), communityId || null, req.userId, now())
  await q.run('INSERT INTO chat_members (chat_id, user_id, created_at) VALUES (?, ?, ?)', id, req.userId, now())
  res.json({ chat: await serializeChat(await q.get('SELECT * FROM chats WHERE id = ?', id), req.userId) })
})

app.post('/api/chats/:id/join', requireAuth, async (req, res) => {
  const chat = await q.get('SELECT * FROM chats WHERE id = ?', req.params.id)
  if (!chat) return err(res, 404, 'Group chat not found.')
  await q.run('INSERT INTO chat_members (chat_id, user_id, created_at) VALUES (?, ?, ?)', chat.id, req.userId, now())
  res.json({ chat: await serializeChat(chat, req.userId) })
})

app.get('/api/chats/:id/messages', requireAuth, async (req, res) => {
  const member = await q.get('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?', req.params.id, req.userId)
  if (!member) return err(res, 403, 'Join this group chat to read it.')
  const rows = await q.all('SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC', req.params.id)
  res.json({ messages: await Promise.all(rows.map(serializeChatMessage)) })
})

app.post('/api/chats/:id/messages', requireAuth, async (req, res) => {
  const member = await q.get('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?', req.params.id, req.userId)
  if (!member) return err(res, 403, 'Join this group chat to post in it.')
  const body = (req.body?.body || '').trim()
  let media
  try { media = cleanMedia(req.body?.media) } catch (e) { return err(res, 400, e.message) }
  if (!body && !media.length) return err(res, 400, 'Write something first.')
  const id = uid('gm')
  await q.run('INSERT INTO chat_messages (id, chat_id, sender_id, body, media, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, req.params.id, req.userId, body, JSON.stringify(media), now())
  res.json({ message: await serializeChatMessage(await q.get('SELECT * FROM chat_messages WHERE id = ?', id)) })
})

// ── Ads — businesses pay to post a rotating promo in the ads rail.
// Payment is simulated (no real processor wired up in this demo). ──────
app.get('/api/ads', async (_req, res) => {
  const rows = await q.all('SELECT * FROM ads WHERE active = 1 ORDER BY created_at DESC')
  res.json({ ads: rows.map(serializeAd) })
})

app.get('/api/ads/mine', requireAuth, async (req, res) => {
  const rows = await q.all('SELECT * FROM ads WHERE owner_id = ? ORDER BY created_at DESC', req.userId)
  res.json({ ads: rows.map(serializeAd) })
})

app.post('/api/ads', requireAuth, async (req, res) => {
  const { businessName, tagline, ctaLabel, accent, emoji } = req.body || {}
  if (!businessName?.trim()) return err(res, 400, 'Enter your business name.')
  const id = uid('ad')
  await q.run(`INSERT INTO ads (id, owner_id, business_name, tagline, cta_label, accent, emoji, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, id, req.userId, businessName.trim(), (tagline || '').trim(), (ctaLabel || 'Learn more').trim(), accent || '#D8A63A', emoji || '✨', now())
  res.json({ ad: serializeAd(await q.get('SELECT * FROM ads WHERE id = ?', id)) })
})

app.post('/api/ads/:id/pay', requireAuth, async (req, res) => {
  const ad = await q.get('SELECT * FROM ads WHERE id = ?', req.params.id)
  if (!ad) return err(res, 404, 'Community partner listing not found.')
  if (ad.owner_id !== req.userId) return err(res, 403, 'Not your listing.')
  await q.run('UPDATE ads SET active = 1 WHERE id = ?', ad.id)
  res.json({ ad: serializeAd(await q.get('SELECT * FROM ads WHERE id = ?', ad.id)) })
})

// ── Live streaming ───────────────────────────────────────────────────
// A real "who's live" signal backed by the DB. The video itself is a
// local camera self-preview in this demo — broadcasting to other viewers
// would need real media-server infrastructure, so viewer counts here are
// simulated for the walkthrough rather than pulled from real connections.
app.get('/api/live', async (_req, res) => {
  const rows = await q.all('SELECT * FROM live_streams WHERE ended_at IS NULL ORDER BY started_at DESC')
  res.json({ streams: await Promise.all(rows.map(serializeLive)) })
})

app.get('/api/communities/:id/live', async (req, res) => {
  const row = await q.get('SELECT * FROM live_streams WHERE community_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1', req.params.id)
  if (row) await q.run('UPDATE live_streams SET viewer_count = viewer_count + ? WHERE id = ?', Math.floor(Math.random() * 3), row.id)
  res.json({ stream: row ? await serializeLive(await q.get('SELECT * FROM live_streams WHERE id = ?', row.id)) : null })
})

app.post('/api/communities/:id/live/start', requireAuth, async (req, res) => {
  const community = await q.get('SELECT id FROM communities WHERE id = ?', req.params.id)
  if (!community) return err(res, 404, 'Community not found.')
  const member = await q.get('SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?', req.userId, community.id)
  if (!member) return err(res, 403, 'Join the community to go live in it.')
  await q.run('UPDATE live_streams SET ended_at = ? WHERE host_id = ? AND ended_at IS NULL', now(), req.userId)
  const id = uid('live')
  const title = (req.body?.title || '').trim() || 'Live now'
  await q.run('INSERT INTO live_streams (id, community_id, host_id, title, started_at, viewer_count) VALUES (?, ?, ?, ?, ?, ?)', id, community.id, req.userId, title, now(), Math.floor(Math.random() * 6) + 1)
  res.json({ stream: await serializeLive(await q.get('SELECT * FROM live_streams WHERE id = ?', id)) })
})

app.post('/api/live/:id/stop', requireAuth, async (req, res) => {
  const stream = await q.get('SELECT * FROM live_streams WHERE id = ?', req.params.id)
  if (!stream) return err(res, 404, 'Stream not found.')
  if (stream.host_id !== req.userId) return err(res, 403, 'Not your stream.')
  await q.run('UPDATE live_streams SET ended_at = ? WHERE id = ?', now(), stream.id)
  res.json({ ok: true })
})

// ── Companion ────────────────────────────────────────────────────────
app.post('/api/companion', async (req, res) => {
  const message = (req.body?.message || '').toString()
  if (!message.trim()) return err(res, 400, 'Ask me something.')
  const reply = await companionReply(message, req.userRow)
  res.json(reply)
})

app.get('/api/health', async (_req, res) => res.json({ ok: true, llm: !!process.env.ANTHROPIC_API_KEY }))

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

// Any route that throws (including a rejected promise from an async handler)
// lands here, so a database failure is a clean JSON error rather than a
// request that hangs until the platform times it out.
app.use((error, _req, res, _next) => {
  console.error('[api]', error)
  if (res.headersSent) return
  res.status(500).json({ error: 'Something went wrong on our end.' })
})

// On Vercel the app is imported by api/index.js and invoked per request —
// there is no port to listen on. Locally it is a normal server.
// API_PORT is separate from PORT so a harness-injected PORT (for Vite) can't
// steal it.
if (!process.env.VERCEL) {
  const PORT = process.env.API_PORT || 8787
  app.listen(PORT, () => {
    console.log(`Interact Space API on http://localhost:${PORT}  (companion: ${process.env.ANTHROPIC_API_KEY ? 'LLM' : 'rule-based fallback'})`)
  })
}

export default app
