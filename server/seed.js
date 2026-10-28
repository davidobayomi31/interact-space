// ── Seed the database from the existing Lagos demo data ──────────────
// Runs once, only if the DB is empty. Communities, persona accounts,
// memberships, posts, real threaded comments + seed vote weight, and a
// couple of open reports so the moderation queue isn't empty.
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import q, { transaction } from './db.js'
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

export async function seedIfEmpty() {
  const count = (await q.get('SELECT COUNT(*) AS n FROM communities')).n
  if (count > 0) return { seeded: false }

  // ON CONFLICT DO NOTHING throughout: two cold starts can race to seed an
  // empty database, and neither should fail or duplicate rows.
  await transaction(async (t) => {
    // Communities
    const COMMUNITY_SQL = `INSERT INTO communities
      (id, name, tagline, description, scope, city, accent, icon, tags, rules, member_count, trending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`
    for (const c of COMMUNITIES) {
      await t.run(COMMUNITY_SQL,
        c.id, c.name, c.tagline, c.description, c.scope, c.city, c.accent, c.icon,
        JSON.stringify(c.tags), JSON.stringify(c.rules), c.memberCount, c.trending ? 1 : 0)
    }

    // Persona accounts (authors + members). Not login-able: random hash.
    const USER_SQL = `INSERT INTO users
      (id, email, password_hash, name, handle, title, city, area, color, bio, interests, goals, skills, onboarded, is_seed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?) ON CONFLICT DO NOTHING`
    const randomHash = bcrypt.hashSync(crypto.randomUUID(), 8)
    for (const u of USERS) {
      await t.run(USER_SQL,
        u.id, `${u.handle.replace('@', '')}@seed.interact.local`, randomHash,
        u.name, u.handle, u.title, u.city, u.area, u.color, u.bio,
        JSON.stringify(u.interests || []), JSON.stringify(u.goals || []),
        JSON.stringify(u.skills || []), now - 30 * DAY)
    }

    // Memberships (moderator role wins over member)
    const MEMBER_SQL = `INSERT INTO memberships (user_id, community_id, role, created_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, community_id) DO UPDATE SET role = excluded.role`
    for (const c of COMMUNITIES) {
      for (const m of c.memberIds) await t.run(MEMBER_SQL, m, c.id, 'member', now - 20 * DAY)
      // Moderators are applied second so the upsert promotes them over 'member'.
      for (const m of c.moderators) await t.run(MEMBER_SQL, m, c.id, 'moderator', now - 25 * DAY)
    }

    // Posts
    const POST_SQL = `INSERT INTO posts
      (id, community_id, author_id, title, body, pinned, base_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`
    for (const p of POSTS) {
      await t.run(POST_SQL, p.id, p.communityId, p.authorId, p.title, p.body,
        p.pinned ? 1 : 0, p.likes ?? 0, agoToTs(p.ago))
    }

    // Threaded comments
    const COMMENT_SQL = `INSERT INTO comments
      (id, post_id, parent_id, author_id, body, base_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`
    const seededComments = {}
    let tick = 0
    const addComment = async (postId, parentId, c) => {
      const id = uid('c')
      await t.run(COMMENT_SQL, id, postId, parentId, c.by, c.body,
        c.score ?? 0, now - (DAY - tick++ * 90 * 1000))
      seededComments[postId] = seededComments[postId] || []
      seededComments[postId].push(id)
      // Sequential, not parallel: a reply's parent row must exist first.
      for (const r of c.replies || []) await addComment(postId, id, r)
      return id
    }
    for (const [postId, comments] of Object.entries(COMMENT_SEED)) {
      for (const c of comments) await addComment(postId, null, c)
    }

    // Open reports so the moderation queue is demonstrable in whichever
    // community the new user ends up moderating: one per community on its
    // first post, plus one flagged comment in Naija Devs.
    const REPORT_SQL = `INSERT INTO reports
      (id, reporter_id, target_type, target_id, community_id, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?) ON CONFLICT DO NOTHING`
    for (const c of COMMUNITIES) {
      const post = POSTS.find((p) => p.communityId === c.id)
      if (!post) continue
      const reporter = c.memberIds.find((m) => m !== post.authorId) || c.memberIds[0]
      await t.run(REPORT_SQL, uid('r'), reporter, 'post', post.id, c.id,
        'Flagged for moderator review (demo)', now - 6 * HOUR)
    }
    if (seededComments.p8?.[1]) {
      await t.run(REPORT_SQL, uid('r'), 'u-obi', 'comment', seededComments.p8[1],
        'naija-devs', 'Off-topic self-promotion', now - 3 * HOUR)
    }
  })

  return { seeded: true }
}

// Seeds for the newer feature areas — kept separate from seedIfEmpty()
// (and gated per-table) so it also backfills a DB that was already
// seeded before these tables existed, without ever duplicating rows.
export async function seedExtras() {
  const uid2 = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`

  if ((await q.get('SELECT COUNT(*) AS n FROM jobs')).n === 0) {
    const JOB_SQL = `INSERT INTO jobs (id, poster_id, title, category, description, area, city, budget, verified_only, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Lagos', ?, ?, ?) ON CONFLICT DO NOTHING`
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
    for (const j of JOBS) {
      await q.run(JOB_SQL, uid2('j'), j.poster_id, j.title, j.category, j.description,
        j.area, j.budget, j.verified_only, now - Math.floor(Math.random() * 4) * HOUR)
    }
  }

  // Demo verified jobs: until there is a real way to verify a job, the
  // seeded "verified pros only" jobs stand in as checked ones.
  if (!(await q.get('SELECT 1 FROM jobs WHERE verified = 1 LIMIT 1'))) {
    await q.run(`UPDATE jobs SET verified = 1 WHERE verified_only = 1 AND poster_id IN (SELECT id FROM users WHERE COALESCE(is_seed, 0) = 1)`)
  }

  if ((await q.get('SELECT COUNT(*) AS n FROM ads')).n === 0) {
    const AD_SQL = `INSERT INTO ads (id, owner_id, business_name, tagline, cta_label, accent, emoji, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT DO NOTHING`
    const ADS = [
      { owner_id: 'u-adaeze', business_name: 'Kola Foods', tagline: 'Snacks made from grandma’s recipes', cta_label: 'Order now', accent: '#E8734A', emoji: '🥟' },
      { owner_id: 'u-funke', business_name: 'Adire by Funke', tagline: 'Modern cuts, hand-dyed textiles', cta_label: 'Shop the drop', accent: '#E84A8A', emoji: '🧵' },
      { owner_id: 'u-emeka', business_name: 'SunHome Solar', tagline: 'Off the generator in 3 weeks', cta_label: 'Get a quote', accent: '#F2C94C', emoji: '☀️' },
      { owner_id: 'u-folake', business_name: 'Folake Bakes', tagline: 'Small-chops for every occasion', cta_label: 'See menu', accent: '#E8A24A', emoji: '🧁' },
    ]
    for (const a of ADS) {
      await q.run(AD_SQL, uid2('ad'), a.owner_id, a.business_name, a.tagline,
        a.cta_label, a.accent, a.emoji, now - DAY)
    }
  }

  // Ads outside Lagos and ones that run everywhere, so tapping another
  // city on the map, or switching the rail to Universal, shows something.
  if (!(await q.get(`SELECT 1 FROM ads WHERE reach = 'universal' LIMIT 1`))) {
    const AD2_SQL = `INSERT INTO ads (id, owner_id, business_name, tagline, cta_label, accent, emoji, city, reach, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT DO NOTHING`
    const MORE_ADS = [
      ['u-tunde', 'AfroRoam Travel', 'Group trips across West Africa', 'Plan a trip', '#3B82F6', '✈️', 'Lagos', 'universal'],
      ['u-obi', 'CodeBridge Africa', 'Remote dev jobs, paid in dollars', 'Apply now', '#7C3AED', '💻', 'Lagos', 'universal'],
      ['u-ngozi', 'Pure Water Co.', 'Clean water delivered, any city', 'Order', '#00C896', '💧', 'Lagos', 'universal'],
      ['u-amina', 'Arewa Threads', 'Northern fabrics, tailored in Abuja', 'Shop', '#EC4899', '🧵', 'Abuja', 'local'],
      ['u-david', 'Capital Fitness', 'Gyms in Wuse and Garki', 'Join', '#F97316', '💪', 'Abuja', 'local'],
      ['u-emeka', 'Garden City Grills', 'Port Harcourt’s best suya', 'Order now', '#EF4444', '🍢', 'Port Harcourt', 'local'],
      ['u-halima', 'Kano Spice House', 'Spices from Kurmi market', 'See spices', '#FBBF24', '🌶️', 'Kano', 'local'],
      ['u-seun', 'Ibadan Print Hub', 'Flyers and banners in 24h', 'Get a quote', '#2563EB', '🖨️', 'Ibadan', 'local'],
    ]
    for (const [owner, name, tagline, cta, accent, emoji, city, reach] of MORE_ADS) {
      await q.run(AD2_SQL, uid2('ad'), owner, name, tagline, cta, accent, emoji, city, reach, now - DAY)
    }
  }

  // A few jobs outside Lagos, so tapping another city on the My City map
  // shows that city's work.
  if (!(await q.get(`SELECT 1 FROM jobs WHERE city <> 'Lagos' LIMIT 1`))) {
    const JOB2_SQL = `INSERT INTO jobs (id, poster_id, title, category, description, area, city, budget, verified_only, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?) ON CONFLICT DO NOTHING`
    const MORE_JOBS = [
      ['u-amina', 'Set up Wi-Fi for a small office', 'tech-support', 'Router, two access points, and a printer on the network.', 'Wuse 2', 'Abuja', '₦30,000'],
      ['u-david', 'Driver for an airport pickup', 'delivery', 'Nnamdi Azikiwe airport to Garki, Friday evening.', 'Garki', 'Abuja', '₦15,000'],
      ['u-emeka', 'Fix a generator that won’t start', 'appliance-repair', '5kVA petrol generator, stopped after the rain.', 'GRA', 'Port Harcourt', '₦18,000'],
      ['u-seun', 'Paint a shop front', 'painting', 'Small shop, one coat over the old paint.', 'Bodija', 'Ibadan', '₦20,000'],
      ['u-halima', 'Carry goods from Kurmi market', 'moving', 'About 20 bags, short distance, Saturday morning.', 'Kurmi', 'Kano', '₦9,000'],
      ['u-chidi', 'Math lessons for JSS3', 'tutoring', 'Twice a week after school.', 'Independence Layout', 'Enugu', '₦8,000/session'],
    ]
    for (const [poster, title, category, description, area, city, budget] of MORE_JOBS) {
      await q.run(JOB2_SQL, uid2('j'), poster, title, category, description, area, city, budget, now - 3 * HOUR)
    }
  }

  // Sample people follow each other, so Following and follower counts
  // have something in them.
  if (!(await q.get('SELECT 1 FROM follows LIMIT 1'))) {
    const seedIds = (await q.all('SELECT id FROM users WHERE COALESCE(is_seed, 0) = 1 ORDER BY id')).map((r) => r.id)
    for (const [i, a] of seedIds.entries()) {
      for (const [j, b] of seedIds.entries()) {
        if (a !== b && (i * 7 + j * 3) % 4 !== 0) {
          await q.run('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', a, b, now - (i + j) * HOUR)
        }
      }
    }
  }

  // Posts to everyone and to the city — the Home feed (Nuel: "people can
  // either post public or post city").
  if (!(await q.get(`SELECT 1 FROM posts WHERE audience IN ('public', 'city') LIMIT 1`))) {
    const img = (src) => JSON.stringify([{ kind: 'image', type: 'image/jpeg', src }])
    const FEED = [
      ['u-kunle', 'public', '', 'Golden hour over Makoko never gets old. Who’s coming on Saturday’s photo walk? 📸', img('/images/events/ev-photo-walk.jpg'), 2],
      ['u-tunde', 'city', 'Lagos', 'Third Mainland traffic was light this morning for once. Anyone else notice? Lagos is changing 🙌', img('/images/city/lagos.jpg'), 4],
      ['u-ngozi', 'city', 'Lagos', 'Our balcony tomatoes are finally ripe! Small space, big harvest. Happy to share seedlings with anyone in Yaba 🍅', img('/images/events/ev-balcony-farm.jpg'), 7],
      ['u-obi', 'public', '', 'Shipped my first open-source library this week. If you’re learning JavaScript, come to the study group — we all started somewhere 💻', img('/images/events/ev-js-study.jpg'), 10],
      ['u-halima', 'city', 'Lagos', 'Balogun is packed today. If you need fabric for December, come early 😅', img('/images/events/ev-market-popup.jpg'), 15],
      ['u-emeka', 'public', '', 'Six months off the generator. Solar paid for itself faster than I thought. Ask me anything ☀️', img('/images/events/ev-solar-workshop.jpg'), 20],
      ['u-amina', 'public', '', 'Pitch night was electric. So many founders building for Africa, by Africa. Proud of everyone who stood up there 🚀', img('/images/events/ev-pitch-night.jpg'), 26],
      ['u-bisi', 'city', 'Lagos', 'Looking for a good tailor around Surulere who can do a rush job by Friday. Recommendations?', '[]', 30],
    ]
    for (const [author, audience, city, body, media, hoursAgo] of FEED) {
      await q.run(`INSERT INTO posts (id, community_id, author_id, title, body, media, audience, city, base_score, created_at)
        VALUES (?, NULL, ?, '', ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`, uid2('p'), author, body, media, audience, city, 20 + ((hoursAgo * 13) % 90), now - hoursAgo * HOUR)
    }
  }

  await keepDemoStatuses()

  if ((await q.get('SELECT COUNT(*) AS n FROM ratings')).n === 0) {
    const RATING_SQL = 'INSERT INTO ratings (user_id, community_id, stars, review, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
    const RATINGS = [
      ['u-tunde', 'lagos-entrepreneurs', 5], ['u-bisi', 'lagos-entrepreneurs', 5], ['u-seun', 'lagos-entrepreneurs', 4],
      ['u-david', 'african-startup-network', 5], ['u-amina', 'african-startup-network', 4], ['u-yemi', 'african-startup-network', 5],
      ['u-kunle', 'lagos-lens-collective', 5], ['u-obi', 'naija-devs', 5], ['u-seun', 'naija-devs', 4],
      ['u-halima', 'balogun-market-hub', 4], ['u-adaeze', 'balogun-market-hub', 5],
      ['u-ngozi', 'green-lagos', 5], ['u-emeka', 'green-lagos', 5], ['u-rekia', 'green-lagos', 4],
    ]
    for (const [user_id, community_id, stars] of RATINGS) {
      await q.run(RATING_SQL, user_id, community_id, stars, '', now - 5 * DAY)
    }
  }

  if ((await q.get('SELECT COUNT(*) AS n FROM live_streams')).n === 0) {
    await q.run('INSERT INTO live_streams (id, community_id, host_id, title, started_at, viewer_count) VALUES (?, ?, ?, ?, ?, ?)',
      uid2('live'), 'naija-devs', 'u-tunde', 'Live code review: your PRs, roasted kindly', now - 8 * 60 * 1000, 34)
  }

  if ((await q.get('SELECT COUNT(*) AS n FROM chats')).n === 0) {
    const CHAT_SQL = 'INSERT INTO chats (id, name, description, community_id, creator_id, accent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
    const CHAT_MEMBER_SQL = 'INSERT INTO chat_members (chat_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
    const CHAT_MSG_SQL = 'INSERT INTO chat_messages (id, chat_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
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
      await q.run(CHAT_SQL, c.id, c.name, c.description, c.community_id, c.creator_id, c.accent, now - 6 * DAY)
      for (const m of c.members) await q.run(CHAT_MEMBER_SQL, c.id, m, now - 6 * DAY)
      for (const [i, [by, body]] of c.messages.entries()) {
        await q.run(CHAT_MSG_SQL, uid2('gm'), c.id, by, body, now - (2 * HOUR - i * 4 * 60 * 1000))
      }
    }
  }
}

// Demo statuses stay on until David says to turn them off (Oct 28): each
// demo account always has a live status. Statuses last a day, so this
// tops up any that have expired. Called on start-up and every time
// statuses are listed, so a long-running server never runs out of them.
export const SHOW_DEMO_STATUSES = true
const DEMO_STATUSES = [
  ['u-kunle', '/images/communities/lagos-lens-collective.jpg', 'Out shooting in Lagos Island today', ''],
  ['u-ngozi', '/images/communities/green-lagos.jpg', '', ''],
  ['u-tunde', '', 'Big announcement coming Monday 👀', 'linear-gradient(135deg, #3B82F6, #8B5CF6)'],
  ['u-obi', '/images/communities/naija-devs.jpg', 'Hack night at the hub', ''],
  ['u-funke', '/images/events/ev-market-popup.jpg', 'New adire drop this weekend', ''],
  ['u-amina', '', 'Who’s going to Demo Day? 🎤', 'linear-gradient(135deg, #00C896, #3B82F6)'],
  ['u-halima', '/images/communities/balogun-market-hub.jpg', '', ''],
]
export async function keepDemoStatuses() {
  if (!SHOW_DEMO_STATUSES) return
  const t = Date.now()
  const live = new Set((await q.all('SELECT DISTINCT user_id FROM statuses WHERE expires_at > ?', t)).map((r) => r.user_id))
  for (const [i, [user, image, text, bg]] of DEMO_STATUSES.entries()) {
    if (live.has(user)) continue
    const at = t - (i + 1) * 45 * 60 * 1000
    await q.run('INSERT INTO statuses (id, user_id, image, text, bg, city, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      `st-${crypto.randomUUID().slice(0, 8)}`, user, image, text, bg, 'Lagos', at, at + 24 * HOUR)
  }
}
