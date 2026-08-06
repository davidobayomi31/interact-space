// ── Seed the database from the existing Lagos demo data ──────────────
// Runs once, only if the DB is empty. Communities, persona accounts,
// memberships, posts, real threaded comments + seed vote weight, and a
// couple of open reports so the moderation queue isn't empty.
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import db from './db.js'
import { COMMUNITIES, USERS, POSTS } from '../src/data/seed.js'

const uid = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`
const now = Date.now()
const HOUR = 3600 * 1000
const DAY = 24 * HOUR

// "2h" / "1d" / "3d" → absolute timestamp
function agoToTs(ago) {
  const m = /^(\d+)([hdmw])$/.exec(ago || '')
  if (!m) return now - HOUR
  const n = Number(m[1])
  const unit = { h: HOUR, d: DAY, w: 7 * DAY, m: 60 * 1000 }[m[2]] ?? HOUR
  return now - n * unit
}

// Realistic threaded replies for key posts. Each has a clear top answer
// (high score) so the companion's "here's the best answer" moment lands.
const COMMENT_SEED = {
  p1: [
    { by: 'u-yemi', score: 34, body: 'The packaging change doubling reorders is the real headline here. Distribution is a product problem, not a sales problem — most founders learn that far too late.' },
    { by: 'u-amina', score: 21, body: 'Which two chains ghosted you? Asking so the rest of us don’t waste three months on the same doors.',
      replies: [{ by: 'u-adaeze', score: 12, body: 'DMing you — don’t want to name them publicly, but I’ll save you the pain.' }] },
    { by: 'u-chidi', score: 8, body: 'Bookmarking this. Doing the same journey with packaged vegetables right now.' },
  ],
  p2: [
    { by: 'u-adaeze', score: 41, body: 'Mistake #1 killed my first raise. “1% of Africa” is a red flag to any investor who’s done this before — bottoms-up sizing or nothing.' },
    { by: 'u-amina', score: 16, body: 'Would love the other 4 in a follow-up post. This is the most useful thing I’ve read here all month.' },
  ],
  p5: [
    { by: 'u-david', score: 27, body: 'Agent networks over digital ads matches exactly what we saw in Accra. CAC on paid was 3x. Human distribution still wins in these markets.' },
    { by: 'u-yemi', score: 14, body: 'Curious how this holds as smartphone penetration climbs. Do you think the agent edge shrinks in 3 years?' },
  ],
  p8: [
    { by: 'u-bisi', score: 45, body: 'Best tip for getting a useful review: open your PR description with the ONE decision you’re unsure about. Reviewers give 10x better feedback when you point them at the doubt.' },
    { by: 'u-seun', score: 12, body: 'Dropping mine: a small dashboard in Python + SQL. Would love eyes on the query structure.' },
    { by: 'u-obi', score: 5, body: 'First time submitting. Nervous but here goes — link in my profile.',
      replies: [{ by: 'u-tunde', score: 9, body: 'That nervousness never fully goes away, and that’s a good thing. Reviewing yours first this weekend.' }] },
  ],
  p9: [
    { by: 'u-tunde', score: 22, body: 'The CORS meltdown is a rite of passage. Writing down what broke is exactly how you go from beginner to dangerous. Great post.' },
    { by: 'u-bisi', score: 7, body: 'Three rewrites is normal. The first version is you learning the problem, not solving it.' },
  ],
  p14: [
    { by: 'u-rekia', score: 31, body: 'This calculator should be pinned forever. I’ve had SMEs abandon generators purely because they finally saw the break-even month in writing.' },
    { by: 'u-ngozi', score: 9, body: 'Ran mine — 17 months. Sharing with the whole street association.' },
  ],
}

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM communities').get().n
  if (count > 0) return { seeded: false }

  const tx = db.transaction(() => {
    // Communities
    const insCommunity = db.prepare(`INSERT INTO communities
      (id, name, tagline, description, scope, city, accent, icon, tags, rules, member_count, trending)
      VALUES (@id, @name, @tagline, @description, @scope, @city, @accent, @icon, @tags, @rules, @member_count, @trending)`)
    for (const c of COMMUNITIES) {
      insCommunity.run({
        id: c.id, name: c.name, tagline: c.tagline, description: c.description,
        scope: c.scope, city: c.city, accent: c.accent, icon: c.icon,
        tags: JSON.stringify(c.tags), rules: JSON.stringify(c.rules),
        member_count: c.memberCount, trending: c.trending ? 1 : 0,
      })
    }

    // Persona accounts (authors + members). Not login-able: random hash.
    const insUser = db.prepare(`INSERT INTO users
      (id, email, password_hash, name, handle, title, city, area, color, bio, interests, goals, skills, onboarded, is_seed, created_at)
      VALUES (@id, @email, @password_hash, @name, @handle, @title, @city, @area, @color, @bio, @interests, @goals, @skills, 1, 1, @created_at)`)
    const randomHash = bcrypt.hashSync(crypto.randomUUID(), 8)
    for (const u of USERS) {
      insUser.run({
        id: u.id, email: `${u.handle.replace('@', '')}@seed.interact.local`,
        password_hash: randomHash, name: u.name, handle: u.handle, title: u.title,
        city: u.city, area: u.area, color: u.color, bio: u.bio,
        interests: JSON.stringify(u.interests || []),
        goals: JSON.stringify(u.goals || []),
        skills: JSON.stringify(u.skills || []),
        created_at: now - 30 * DAY,
      })
    }

    // Memberships (moderator role wins over member)
    const insMember = db.prepare('INSERT OR REPLACE INTO memberships (user_id, community_id, role, created_at) VALUES (?, ?, ?, ?)')
    for (const c of COMMUNITIES) {
      for (const m of c.memberIds) insMember.run(m, c.id, 'member', now - 20 * DAY)
      for (const m of c.moderators) insMember.run(m, c.id, 'moderator', now - 25 * DAY)
    }

    // Posts
    const insPost = db.prepare(`INSERT INTO posts
      (id, community_id, author_id, title, body, pinned, base_score, created_at)
      VALUES (@id, @community_id, @author_id, @title, @body, @pinned, @base_score, @created_at)`)
    for (const p of POSTS) {
      insPost.run({
        id: p.id, community_id: p.communityId, author_id: p.authorId,
        title: p.title, body: p.body, pinned: p.pinned ? 1 : 0,
        base_score: p.likes ?? 0, created_at: agoToTs(p.ago),
      })
    }

    // Threaded comments
    const insComment = db.prepare(`INSERT INTO comments
      (id, post_id, parent_id, author_id, body, base_score, created_at)
      VALUES (@id, @post_id, @parent_id, @author_id, @body, @base_score, @created_at)`)
    const seededComments = {}
    let tick = 0
    const addComment = (postId, parentId, c) => {
      const id = uid('c')
      insComment.run({
        id, post_id: postId, parent_id: parentId, author_id: c.by,
        body: c.body, base_score: c.score ?? 0, created_at: now - (DAY - tick++ * 90 * 1000),
      })
      seededComments[postId] = seededComments[postId] || []
      seededComments[postId].push(id)
      ;(c.replies || []).forEach((r) => addComment(postId, id, r))
      return id
    }
    for (const [postId, comments] of Object.entries(COMMENT_SEED)) {
      comments.forEach((c) => addComment(postId, null, c))
    }

    // Open reports so the moderation queue is demonstrable in whichever
    // community the new user ends up moderating: one per community on its
    // first post, plus one flagged comment in Naija Devs.
    const insReport = db.prepare(`INSERT INTO reports
      (id, reporter_id, target_type, target_id, community_id, reason, status, created_at)
      VALUES (@id, @reporter_id, @target_type, @target_id, @community_id, @reason, 'open', @created_at)`)
    for (const c of COMMUNITIES) {
      const post = POSTS.find((p) => p.communityId === c.id)
      if (!post) continue
      const reporter = c.memberIds.find((m) => m !== post.authorId) || c.memberIds[0]
      insReport.run({
        id: uid('r'), reporter_id: reporter, target_type: 'post',
        target_id: post.id, community_id: c.id,
        reason: 'Flagged for moderator review (demo)', created_at: now - 6 * HOUR,
      })
    }
    if (seededComments.p8?.[1]) {
      insReport.run({
        id: uid('r'), reporter_id: 'u-obi', target_type: 'comment',
        target_id: seededComments.p8[1], community_id: 'naija-devs',
        reason: 'Off-topic self-promotion', created_at: now - 3 * HOUR,
      })
    }
  })

  tx()
  return { seeded: true }
}

// Seeds for the newer feature areas — kept separate from seedIfEmpty()
// (and gated per-table) so it also backfills a DB that was already
// seeded before these tables existed, without ever duplicating rows.
export function seedExtras() {
  const uid2 = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`

  if (db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n === 0) {
    const insJob = db.prepare(`INSERT INTO jobs (id, poster_id, title, category, description, area, city, budget, verified_only, created_at)
      VALUES (@id, @poster_id, @title, @category, @description, @area, 'Lagos', @budget, @verified_only, @created_at)`)
    const JOBS = [
      { poster_id: 'u-adaeze', title: 'Fix a leaking kitchen pipe', category: 'plumbing', description: 'Pipe under the sink has been dripping for two days. Need someone today or tomorrow.', area: 'Lekki', budget: '₦12,000', verified_only: 1 },
      { poster_id: 'u-bisi', title: 'Install 3 ceiling fans', category: 'electrical', description: 'Fans are bought, just need wiring and mounting. Half-day job.', area: 'Victoria Island', budget: '₦25,000', verified_only: 0 },
      { poster_id: 'u-funke', title: 'Deep clean 2-bedroom flat before guests arrive', category: 'cleaning', description: 'Move-in ready clean, including windows and kitchen.', area: 'Surulere', budget: '₦18,000', verified_only: 0 },
      { poster_id: 'u-yemi', title: 'Help moving office furniture, 3rd floor', category: 'moving', description: 'Desks, chairs, a few filing cabinets. No lift, stairs only.', area: 'Ikoyi', budget: '₦20,000', verified_only: 0 },
      { poster_id: 'u-chidi', title: 'Repair a broken chest freezer', category: 'appliance-repair', description: 'Not cooling properly, might be the compressor. Farm depends on it.', area: 'Ikorodu', budget: '₦15,000', verified_only: 1 },
      { poster_id: 'u-halima', title: 'Weekly grocery delivery run, 6 stops', category: 'delivery', description: 'Recurring gig — same route every Saturday morning.', area: 'Badagry', budget: '₦8,000/run', verified_only: 0 },
      { poster_id: 'u-rekia', title: 'Repaint a small studio office', category: 'painting', description: 'Two coats, walls only, paint provided.', area: 'Ilupeju', budget: '₦22,000', verified_only: 0 },
      { poster_id: 'u-amina', title: 'Weekend math tutor for SS2 student', category: 'tutoring', description: 'Two hours every Saturday, WAEC prep.', area: 'Marina', budget: '₦10,000/session', verified_only: 1 },
    ]
    for (const j of JOBS) insJob.run({ id: uid2('j'), created_at: now - Math.floor(Math.random() * 4) * HOUR, ...j })
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM ads').get().n === 0) {
    const insAd = db.prepare(`INSERT INTO ads (id, owner_id, business_name, tagline, cta_label, accent, emoji, active, created_at)
      VALUES (@id, @owner_id, @business_name, @tagline, @cta_label, @accent, @emoji, 1, @created_at)`)
    const ADS = [
      { owner_id: 'u-adaeze', business_name: 'Kola Foods', tagline: 'Snacks made from grandma’s recipes', cta_label: 'Order now', accent: '#E8734A', emoji: '🥟' },
      { owner_id: 'u-funke', business_name: 'Adire by Funke', tagline: 'Modern cuts, hand-dyed textiles', cta_label: 'Shop the drop', accent: '#E84A8A', emoji: '🧵' },
      { owner_id: 'u-emeka', business_name: 'SunHome Solar', tagline: 'Off the generator in 3 weeks', cta_label: 'Get a quote', accent: '#F2C94C', emoji: '☀️' },
      { owner_id: 'u-folake', business_name: 'Folake Bakes', tagline: 'Small-chops for every occasion', cta_label: 'See menu', accent: '#E8A24A', emoji: '🧁' },
    ]
    for (const a of ADS) insAd.run({ id: uid2('ad'), created_at: now - DAY, ...a })
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM ratings').get().n === 0) {
    const insRating = db.prepare('INSERT INTO ratings (user_id, community_id, stars, review, created_at) VALUES (?, ?, ?, ?, ?)')
    const RATINGS = [
      ['u-tunde', 'lagos-entrepreneurs', 5], ['u-bisi', 'lagos-entrepreneurs', 5], ['u-seun', 'lagos-entrepreneurs', 4],
      ['u-david', 'african-startup-network', 5], ['u-amina', 'african-startup-network', 4], ['u-yemi', 'african-startup-network', 5],
      ['u-kunle', 'lagos-lens-collective', 5], ['u-obi', 'naija-devs', 5], ['u-seun', 'naija-devs', 4],
      ['u-halima', 'balogun-market-hub', 4], ['u-adaeze', 'balogun-market-hub', 5],
      ['u-ngozi', 'green-lagos', 5], ['u-emeka', 'green-lagos', 5], ['u-rekia', 'green-lagos', 4],
    ]
    for (const [user_id, community_id, stars] of RATINGS) insRating.run(user_id, community_id, stars, '', now - 5 * DAY)
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM live_streams').get().n === 0) {
    const insLive = db.prepare('INSERT INTO live_streams (id, community_id, host_id, title, started_at, viewer_count) VALUES (?, ?, ?, ?, ?, ?)')
    insLive.run(uid2('live'), 'naija-devs', 'u-tunde', 'Live code review: your PRs, roasted kindly', now - 8 * 60 * 1000, 34)
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM chats').get().n === 0) {
    const insChat = db.prepare('INSERT INTO chats (id, name, description, community_id, creator_id, accent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const insMember = db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id, created_at) VALUES (?, ?, ?)')
    const insMsg = db.prepare('INSERT INTO chat_messages (id, chat_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
    const CHATS = [
      { id: uid2('gc'), name: 'Pitch Night Organizers', description: 'Coordinating the next First-Cheque Pitch Night', community_id: 'lagos-entrepreneurs', creator_id: 'u-yemi', accent: '#E8B14A',
        members: ['u-yemi', 'u-adaeze', 'u-amina'],
        messages: [['u-yemi', 'Venue is confirmed for the 21st, Workbay again.'], ['u-adaeze', 'I can bring 2 extra chairs if needed.'], ['u-amina', 'I’ll handle the RSVP list this time.']] },
      { id: uid2('gc'), name: 'Green Lagos Volunteers', description: 'Saturday garden + health day planning', community_id: 'green-lagos', creator_id: 'u-rekia', accent: '#27AE60',
        members: ['u-rekia', 'u-ngozi', 'u-emeka', 'u-halima'],
        messages: [['u-ngozi', 'Still need 2 more volunteers for the blood pressure table.'], ['u-halima', 'I can bring seedlings for giveaway.']] },
      { id: uid2('gc'), name: 'Naija Devs Study Buddies', description: 'Small group working through the JS deep dive series', community_id: 'naija-devs', creator_id: 'u-obi', accent: '#4AE8D4',
        members: ['u-obi', 'u-seun', 'u-tunde'],
        messages: [['u-obi', 'Closures finally clicked for me, thanks to Tunde’s danfo analogy 😂'], ['u-seun', 'Same. Doing the exercises tonight.']] },
    ]
    for (const c of CHATS) {
      insChat.run(c.id, c.name, c.description, c.community_id, c.creator_id, c.accent, now - 6 * DAY)
      c.members.forEach((m) => insMember.run(c.id, m, now - 6 * DAY))
      c.messages.forEach(([by, body], i) => insMsg.run(uid2('gm'), c.id, by, body, now - (2 * HOUR - i * 4 * 60 * 1000)))
    }
  }
}
