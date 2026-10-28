// ── The AI Companion engine ──────────────────────────────────────────
// Rule-based "recommendation brain" over the seed data. Every result it
// returns carries a `because` trace tying it to something the user said
// or something on their profile — recommendations are never unexplained.

import { COMMUNITIES, USERS, EVENTS, POSTS, OPPORTUNITIES, TAGS } from './data/seed.js'

// Keyword → tag vocabulary. Maps natural phrasing to profile tags.
const KEYWORD_TAGS = {
  farm: ['farming', 'agriculture', 'urban-farming'],
  farming: ['farming', 'agriculture', 'urban-farming'],
  agriculture: ['agriculture', 'farming'],
  crop: ['farming', 'agriculture'],
  garden: ['urban-farming', 'farming', 'sustainability'],
  sustainab: ['sustainability', 'renewable-energy', 'urban-farming'],
  green: ['sustainability', 'renewable-energy'],
  climate: ['sustainability', 'renewable-energy'],
  solar: ['renewable-energy', 'sustainability'],
  'renewable energy': ['renewable-energy', 'sustainability'],
  energy: ['renewable-energy'],
  business: ['business', 'entrepreneurship', 'small-business'],
  entrepreneur: ['entrepreneurship', 'business', 'startups'],
  startup: ['startups', 'entrepreneurship', 'tech'],
  invest: ['finance', 'startups'],
  finance: ['finance'],
  fund: ['finance', 'startups'],
  market: ['marketplace', 'small-business', 'marketing'],
  marketing: ['marketing'],
  sell: ['marketplace', 'small-business'],
  shop: ['marketplace', 'small-business'],
  code: ['coding', 'web-development', 'tech'],
  coding: ['coding', 'web-development', 'learning'],
  program: ['coding', 'tech'],
  software: ['coding', 'web-development', 'tech'],
  developer: ['coding', 'web-development'],
  tech: ['tech', 'coding', 'startups'],
  data: ['data', 'coding'],
  design: ['design', 'tech'],
  photo: ['photography', 'art'],
  photography: ['photography', 'art'],
  camera: ['photography'],
  film: ['photography', 'art'],
  art: ['art', 'photography'],
  music: ['music', 'art'],
  fashion: ['fashion', 'small-business'],
  tailor: ['fashion', 'small-business'],
  food: ['food', 'small-business'],
  cook: ['food'],
  bak: ['food', 'small-business'],
  cater: ['food', 'small-business'],
  learn: ['learning', 'mentorship'],
  study: ['learning', 'coding'],
  mentor: ['mentorship', 'learning'],
  teach: ['mentorship', 'learning'],
  health: ['fitness', 'community'],
  fitness: ['fitness'],
  writ: ['writing'],
  network: ['networking', 'community'],
  volunteer: ['community', 'sustainability'],
  speak: ['learning', 'mentorship'],
  speech: ['learning', 'mentorship'],
  presentation: ['learning', 'mentorship'],
  present: ['learning', 'mentorship'],
  pitch: ['entrepreneurship', 'startups', 'learning'],
  communicat: ['learning', 'mentorship'],
  confidence: ['learning', 'mentorship'],
  debate: ['learning', 'writing'],
  storytell: ['writing', 'learning'],
  leadership: ['mentorship', 'community'],
  interview: ['learning', 'mentorship'],
}

// Words shorter than this aren't worth spell-correcting — too many collisions.
const FUZZY_MIN = 5

// Levenshtein distance with adjacent transposition ("leanr" → "learn"),
// abandoned as soon as it exceeds `max` so this stays cheap.
function editDistance(a, b, max = 1) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2 = null
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prev2[j - 2] + 1) // swapped pair counts as one slip
      }
      row.push(d)
    }
    if (Math.min(...row) > max) return max + 1
    prev2 = prev
    prev = row
  }
  return prev[b.length]
}

export function extractTags(text) {
  const lower = text.toLowerCase()
  const found = new Set()
  const vocab = Object.entries(KEYWORD_TAGS)
  for (const [kw, tags] of vocab) {
    if (lower.includes(kw)) tags.forEach((t) => found.add(t))
  }
  // Second pass: people mistype ("arming" for farming). Any word that matched
  // nothing literally gets one spell-correction attempt against the vocabulary,
  // so a single slipped letter doesn't silently erase what someone told us.
  for (const word of lower.split(/[^a-z]+/)) {
    if (word.length < FUZZY_MIN) continue
    if (vocab.some(([kw]) => word.includes(kw))) continue // already understood
    for (const [kw, tags] of vocab) {
      if (kw.length < FUZZY_MIN || kw.includes(' ')) continue
      if (editDistance(word, kw) <= 1) tags.forEach((t) => found.add(t))
    }
  }
  return [...found]
}

export const tagLabel = (t) => TAGS[t]?.label ?? t

function overlap(a = [], b = []) {
  const setB = new Set(b)
  return a.filter((x) => setB.has(x))
}

// Score items against a tag list; return sorted matches with the
// overlapping tags preserved as the explanation trace.
function rank(items, tags, getTags, limit = 3) {
  return items
    .map((item) => {
      const shared = overlap(getTags(item), tags)
      return { item, shared, score: shared.length }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function matchCommunities(tags, profile, limit = 3) {
  const pool = COMMUNITIES.filter((c) => !profile?.communities?.includes(c.id))
  return rank(pool, tags, (c) => c.tags, limit)
}

export function matchPeople(tags, profile, limit = 3) {
  const pool = USERS.filter((u) => !profile?.connections?.includes(u.id))
  return rank(pool, tags, (u) => u.interests, limit)
}

export function matchEvents(tags, _profile, limit = 3) {
  return rank(EVENTS, tags, (e) => e.tags, limit)
}

export function matchOpportunities(tags, _profile, limit = 3) {
  return rank(OPPORTUNITIES, tags, (o) => o.tags, limit)
}

export function matchPosts(tags, _profile, limit = 3) {
  return rank(POSTS, tags, (p) => {
    const c = COMMUNITIES.find((x) => x.id === p.communityId)
    return c ? c.tags : []
  }, limit)
}

// ── Intent detection for the assistant chat ──────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase()
  if (/(summar|missed|catch me up|what.s new|update me)/.test(t)) return 'summarize'
  if (/(create|start|make).*(community|group)/.test(t)) return 'create-community'
  if (/(event|happening|attend|meetup|workshop)/.test(t)) return 'events'
  if (/(people|person|meet|friend|connect|who)/.test(t)) return 'people'
  if (/(opportunit|job|gig|grant|work|hire|intern)/.test(t)) return 'opportunities'
  if (/(communit|group|join|club|circle|network near)/.test(t)) return 'communities'
  if (/(help|what can you|how do)/.test(t)) return 'help'
  return 'general'
}

// Compose an assistant reply: { text, sections: [{kind, results}], learnedTags }
export function askCompanion(text, profile) {
  const typedTags = extractTags(text)
  const profileTags = [...(profile.interests || []), ...(profile.skillsTags || [])]
  const tags = typedTags.length ? typedTags : profileTags
  const intent = detectIntent(text)
  const name = profile.name?.split(' ')[0] || 'friend'

  const traceSource = typedTags.length
    ? { kind: 'said', tags: typedTags }
    : { kind: 'profile', tags: profileTags }

  const out = { text: '', sections: [], learnedTags: typedTags, traceSource }

  if (intent === 'summarize') {
    const joined = COMMUNITIES.filter((c) => profile.communities.includes(c.id))
    if (!joined.length) {
      out.text = `You haven’t joined any communities yet, ${name} — so nothing to catch up on. Want me to suggest a few based on your interests?`
      out.sections.push({ kind: 'communities', results: matchCommunities(tags, profile) })
      return out
    }
    out.text = `Here’s what you missed across your ${joined.length} ${joined.length === 1 ? 'community' : 'communities'}, ${name}:`
    joined.forEach((c) => {
      const posts = POSTS.filter((p) => p.communityId === c.id).slice(0, 2)
      out.sections.push({ kind: 'digest', community: c, results: posts.map((p) => ({ item: p, shared: [] })) })
    })
    const evs = EVENTS.filter((e) => profile.communities.includes(e.communityId)).slice(0, 3)
    if (evs.length) out.sections.push({ kind: 'events', title: 'Coming up in your communities', results: evs.map((e) => ({ item: e, shared: [] })) })
    return out
  }

  if (intent === 'create-community') {
    out.text = `Love that, ${name} — new communities are how the city grows. Here’s how it works on VOIDAJ: pick a name and a focus, agree to the shared Charter (safety, respect, privacy), and set your first three rules. In this demo the create flow is simulated, but here are similar communities worth studying first — joining one for a while is the best founder research:`
    out.sections.push({ kind: 'communities', results: matchCommunities(tags.length ? tags : ['community'], profile) })
    return out
  }

  if (intent === 'events') {
    const res = matchEvents(tags, profile)
    out.text = res.length
      ? `Here are events I think are worth your time, ${name}:`
      : `I couldn’t find events matching that yet — Lagos has more coming every week. Here’s what’s trending instead:`
    out.sections.push({ kind: 'events', results: res.length ? res : EVENTS.slice(0, 3).map((e) => ({ item: e, shared: [] })) })
    return out
  }

  if (intent === 'people') {
    const res = matchPeople(tags, profile)
    out.text = res.length
      ? `These are real people in the network you should meet, ${name} — I can only introduce, the conversation is yours to start:`
      : `No strong matches yet — tell me more about what you’re into and I’ll find your people.`
    if (res.length) out.sections.push({ kind: 'people', results: res })
    return out
  }

  if (intent === 'opportunities') {
    const res = matchOpportunities(tags, profile)
    out.text = res.length
      ? `Found these open opportunities for you, ${name}:`
      : `Nothing matching right now, but opportunities flow through communities — joining the right one is the best way to catch them early.`
    if (res.length) out.sections.push({ kind: 'opportunities', results: res })
    else out.sections.push({ kind: 'communities', results: matchCommunities(tags, profile) })
    return out
  }

  if (intent === 'help') {
    out.text = `I’m your guide to the whole network, ${name}. Try things like:\n• “Help me find a business community near me”\n• “Find people interested in renewable energy”\n• “What events are happening this week?”\n• “Summarize what I missed in my groups”\n• “Help me create a community”\n\nEverything I recommend is matched to what you tell me — never a random feed.`
    return out
  }

  // communities intent + general fallback
  const comms = matchCommunities(tags, profile)
  const people = matchPeople(tags, profile, 2)
  const events = matchEvents(tags, profile, 2)
  if (!tags.length) {
    out.text = `Tell me a bit about what you’re into, ${name} — interests, skills, or a goal — and I’ll map you to the right corners of the city.`
    return out
  }
  out.text = `Based on that, here’s where I’d start, ${name}:`
  if (comms.length) out.sections.push({ kind: 'communities', results: comms })
  if (people.length) out.sections.push({ kind: 'people', results: people })
  if (events.length) out.sections.push({ kind: 'events', results: events })
  if (!comms.length && !people.length && !events.length) {
    out.text = `I don’t have a strong match for that yet — this demo city is still growing. Try interests like farming, tech, photography, business, or energy.`
  }
  return out
}
