// ── The AI Companion (real LLM, grounded, with rule-based fallback) ──
// Discovery layer for Interact Space. Reads the live catalog from the DB,
// asks Claude to select + explain the most relevant communities, people
// and discussions, then validates every id against the DB so the model
// can never invent a community or person. If no ANTHROPIC_API_KEY is set
// (or the call fails), it falls back to the keyword-ranking engine so the
// app always works out of the box.
import Anthropic from '@anthropic-ai/sdk'
import db, { selfUser, publicUser, serializeCommunity, serializePost, getUserById } from './db.js'
import { extractTags, tagLabel } from '../src/ai.js'

const MODEL = process.env.COMPANION_MODEL || 'claude-sonnet-5'
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

const SYSTEM = `You are the Interact Space Companion — a warm, concise guide across a connected network of local and global communities (currently one city: Lagos, Nigeria).

Your ONLY job is AI-guided discovery: connect a person to the right communities, people, and discussions. Core identity rules you must never break:
- You introduce people to each other and to communities. You never replace human connection, and you never mention follower counts.
- You are NOT a feed. Be selective and bounded: recommend at most 3 of each kind, and only ones that genuinely fit. Fewer is better than padding.
- Every recommendation must carry a short "because" that ties it to what the user said or to their profile.
- You may ONLY recommend items that appear in the provided catalog. Never invent an id, community, person, or post. Use the exact ids given.
- Warm, human, brief. Address the user by first name when you have it.

Respond with ONLY a JSON object, no prose around it, in this exact shape:
{
  "message": "1-2 sentence reply to the user",
  "communities": [{"id": "<catalog id>", "because": "<why, one sentence>"}],
  "people": [{"id": "<catalog id>", "because": "<why>"}],
  "posts": [{"id": "<catalog id>", "because": "<why>"}]
}
Any array may be empty. If nothing fits, return empty arrays and a helpful message inviting them to tell you more.`

function buildCatalog(viewerId) {
  const communities = db.prepare('SELECT * FROM communities').all().map((c) => ({
    id: c.id, name: c.name, scope: c.scope, city: c.city, tagline: c.tagline,
    tags: JSON.parse(c.tags),
  }))
  const people = db.prepare('SELECT * FROM users WHERE is_seed = 1').all()
    .filter((u) => u.id !== viewerId)
    .map((u) => ({ id: u.id, name: u.name, title: u.title, area: u.area, interests: JSON.parse(u.interests) }))
  const posts = db.prepare('SELECT * FROM posts WHERE hidden = 0 ORDER BY created_at DESC LIMIT 20').all()
    .map((p) => ({ id: p.id, communityId: p.community_id, title: p.title, snippet: p.body.slice(0, 120) }))
  return { communities, people, posts }
}

const firstName = (name) => (name || 'there').split(' ')[0]

// Resolve validated ids from the model into full card items + reason.
function resolve(kind, picks, viewerId) {
  const out = []
  for (const pick of picks || []) {
    if (kind === 'communities') {
      const row = db.prepare('SELECT * FROM communities WHERE id = ?').get(pick.id)
      if (row) out.push({ item: serializeCommunity(row, viewerId), because: pick.because })
    } else if (kind === 'people') {
      const row = getUserById(pick.id)
      if (row && row.is_seed) out.push({ item: publicUser(row), because: pick.because })
    } else if (kind === 'posts') {
      const row = db.prepare('SELECT * FROM posts WHERE id = ? AND hidden = 0').get(pick.id)
      if (row) out.push({ item: serializePost(row, viewerId), because: pick.because })
    }
    if (out.length >= 3) break
  }
  return out
}

function toSections(parsed, viewerId) {
  const sections = []
  const push = (kind, label) => {
    const results = resolve(kind, parsed[kind], viewerId)
    if (results.length) sections.push({ kind, label, results })
  }
  push('communities', 'Communities')
  push('people', 'People to meet')
  push('posts', 'Discussions worth reading')
  return sections
}

// ── Rule-based fallback (no API key or LLM error) ────────────────────
function ruleFallback(message, self, viewerId) {
  const typed = extractTags(message)
  const tags = typed.length ? typed : (self.interests || [])
  const name = firstName(self.name)

  const rank = (rows, getTags) => rows
    .map((r) => ({ r, shared: getTags(r).filter((t) => tags.includes(t)) }))
    .filter((x) => x.shared.length)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, 3)

  const becauseOf = (shared) => `Matches your interest in ${shared.map(tagLabel).join(', ')}`

  const commRows = db.prepare('SELECT * FROM communities').all()
    .filter((c) => !self.communities.includes(c.id))
  const communities = rank(commRows, (c) => JSON.parse(c.tags))
    .map(({ r, shared }) => ({ item: serializeCommunity(r, viewerId), because: becauseOf(shared) }))

  const peopleRows = db.prepare('SELECT * FROM users WHERE is_seed = 1').all()
    .filter((u) => u.id !== viewerId && !self.connections.includes(u.id))
  const people = rank(peopleRows, (u) => JSON.parse(u.interests))
    .map(({ r, shared }) => ({ item: publicUser(r), because: becauseOf(shared) }))

  const commTags = Object.fromEntries(commRows.map((c) => [c.id, JSON.parse(c.tags)]))
  const postRows = db.prepare('SELECT * FROM posts WHERE hidden = 0').all()
  const posts = rank(postRows, (p) => commTags[p.community_id] || [])
    .map(({ r, shared }) => ({ item: serializePost(r, viewerId), because: becauseOf(shared) }))

  const sections = []
  if (communities.length) sections.push({ kind: 'communities', label: 'Communities', results: communities })
  if (people.length) sections.push({ kind: 'people', label: 'People to meet', results: people })
  if (posts.length) sections.push({ kind: 'posts', label: 'Discussions worth reading', results: posts })

  const reply = sections.length
    ? `Based on that, here's where I'd start, ${name}:`
    : `Tell me a bit more about what you're into, ${name} — an interest, a skill, or a goal — and I'll map you to the right corners of the city.`
  return { reply, sections, learnedTags: typed, source: 'rules' }
}

export async function companionReply(message, userRow) {
  const self = selfUser(userRow) || { name: 'there', interests: [], communities: [], connections: [] }
  const viewerId = userRow?.id ?? null
  const learnedTags = extractTags(message)

  if (!client) return ruleFallback(message, self, viewerId)

  try {
    const catalog = buildCatalog(viewerId)
    const context = {
      user: { firstName: firstName(self.name), interests: self.interests, goals: self.goals, memberOf: self.communities },
      catalog,
      message,
    }
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(context) }],
    })
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    const parsed = JSON.parse(json)
    return {
      reply: parsed.message || `Here's what I found, ${firstName(self.name)}:`,
      sections: toSections(parsed, viewerId),
      learnedTags,
      source: 'llm',
    }
  } catch (err) {
    console.warn('[companion] LLM call failed, falling back to rules:', err.message)
    return ruleFallback(message, self, viewerId)
  }
}
