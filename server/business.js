// ── Business on VOIDAJ ───────────────────────────────────────────────
// Nuel's "Business on VOIDAJ — Simplified" mockup (Nov 8): "This is my
// vision… so you can design around it."
//
//   Create Identity → Post & Share → Promote (optional) → Get Discovered → Connect
//
// A business has a profile (name, category, description, location, logo,
// cover), listings (properties, services, products or offers, each with a
// price), followers and reviews. Owners can promote a listing; promoted
// listings show first on Explore Businesses and My City. People enquire
// through Chat, and the owner sees views, enquiries and followers.
//
// Payments aren't live, so promotions run free while VOIDAJ is in beta,
// and the app says so. Verification is a flag set by an admin for now.
import crypto from 'crypto'
import q, { publicUser, getUserById } from './db.js'
import { requireAuth } from './auth.js'
import { cleanCover } from './storage.js'

const uid = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`
const now = () => Date.now()
const DAY = 24 * 3600 * 1000
const err = (res, code, msg) => res.status(code).json({ error: msg })
const clip = (v, n) => String(v ?? '').trim().slice(0, n)

// The category chips on Explore Businesses, and what each one's listings
// are called on its page (an estate agent lists properties, a mechanic
// services, a shop products).
export const CATEGORIES = [
  { id: 'real-estate', label: 'Real Estate', icon: 'home', listings: ['property', 'service', 'offer'] },
  { id: 'auto', label: 'Auto & Repairs', icon: 'car', listings: ['service', 'product', 'offer'] },
  { id: 'food', label: 'Food & Drinks', icon: 'flame', listings: ['product', 'service', 'offer'] },
  { id: 'fashion', label: 'Fashion', icon: 'tag', listings: ['product', 'service', 'offer'] },
  { id: 'tech', label: 'Tech', icon: 'code', listings: ['service', 'product', 'offer'] },
  { id: 'beauty', label: 'Beauty & Wellness', icon: 'sparkle', listings: ['service', 'product', 'offer'] },
  { id: 'health', label: 'Health', icon: 'heart', listings: ['service', 'product', 'offer'] },
  { id: 'education', label: 'Education', icon: 'book', listings: ['service', 'offer'] },
  { id: 'events', label: 'Events & Venues', icon: 'calendar', listings: ['service', 'offer'] },
  { id: 'home-services', label: 'Home Services', icon: 'wrench', listings: ['service', 'offer'] },
  { id: 'other', label: 'Other', icon: 'store', listings: ['product', 'service', 'offer'] },
]
const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
export const LISTING_KINDS = ['property', 'service', 'product', 'offer']
const LISTING_STATUS = ['', 'for-sale', 'for-rent', 'available', 'sold']

// Promote Post: what you want, who should see it, for how long, for how much.
export const PROMOTION = {
  goals: [
    { id: 'enquiries', label: 'Get more views and enquiries' },
    { id: 'followers', label: 'Get more followers' },
    { id: 'visits', label: 'Get people to visit' },
  ],
  audiences: [
    { id: 'city', label: 'Your city' },
    { id: 'nearby', label: 'Your city and nearby areas' },
    { id: 'nigeria', label: 'All of Nigeria' },
  ],
  days: [3, 7, 14],
  budgets: [5000, 15000, 30000],
}
// A rough estimate of how many people a promotion reaches. It's shown as a
// range, not a promise: ₦15,000 for 7 days in Lagos and nearby ≈ 8,000–25,000.
export function estimateReach({ budget, days, audience }) {
  const spread = { city: 0.8, nearby: 1, nigeria: 1.6 }[audience] ?? 1
  const round = (n) => Math.max(500, Math.round(n / 500) * 500)
  const low = round((budget * 0.5 + days * 100) * spread)
  return { low, high: round(low * 3.1) }
}

// The tables (businesses, business_listings, business_follows,
// business_reviews, business_promotions) are in db.js's SCHEMA.

// ── Shapes sent to the app ───────────────────────────────────────────
// Photos kept inline (local development) are fine on the business's own
// page but too heavy for lists, so lists get links only.
const listImage = (s) => (String(s || '').startsWith('data:') ? '' : s || '')

async function liveListingIds(businessIds) {
  if (!businessIds.length) return new Set()
  const rows = await q.all(`SELECT listing_id FROM business_promotions WHERE ends_at > ? AND business_id = ANY(?)`, now(), businessIds)
  return new Set(rows.map((r) => r.listing_id))
}

function serializeListing(row, promoted, { inline = true } = {}) {
  return {
    id: row.id, businessId: row.business_id, kind: row.kind, title: row.title, description: row.description,
    price: row.price ?? null, status: row.status || '', image: inline ? row.image || '' : listImage(row.image),
    area: row.area || '', views: row.views || 0, enquiries: row.enquiries || 0,
    promoted: promoted.has(row.id), createdAt: row.created_at,
  }
}

async function serializeBusiness(row, viewerId, { full = false } = {}) {
  const [followers, rating, listings, following] = await Promise.all([
    q.get('SELECT COUNT(*) AS n FROM business_follows WHERE business_id = ?', row.id),
    q.get('SELECT COUNT(*) AS n, AVG(stars) AS avg FROM business_reviews WHERE business_id = ?', row.id),
    q.all('SELECT * FROM business_listings WHERE business_id = ? ORDER BY created_at DESC', row.id),
    viewerId ? q.get('SELECT 1 FROM business_follows WHERE business_id = ? AND user_id = ?', row.id, viewerId) : null,
  ])
  const promoted = await liveListingIds([row.id])
  const cat = CATEGORIES.find((c) => c.id === row.category) ?? CATEGORIES.at(-1)
  const out = {
    id: row.id, name: row.name, category: cat.id, categoryLabel: cat.label, listingKinds: cat.listings,
    description: row.description || '', city: row.city || '', area: row.area || '',
    logo: full ? row.logo || '' : listImage(row.logo), cover: full ? row.cover || '' : listImage(row.cover),
    verified: !!row.verified, ownerId: row.owner_id, isOwner: viewerId === row.owner_id,
    followers: followers?.n || 0, isFollowing: !!following,
    rating: { count: rating?.n || 0, avg: rating?.avg ? Math.round(rating.avg * 10) / 10 : null },
    listingsCount: listings.length, promoted: promoted.size > 0, createdAt: row.created_at,
    // The first few listings, for cards in lists.
    preview: listings.slice(0, 3).map((l) => serializeListing(l, promoted, { inline: false })),
  }
  if (full) {
    Object.assign(out, {
      phone: row.phone || '', website: row.website || '', hours: row.hours || '',
      listings: listings.map((l) => serializeListing(l, promoted)),
      owner: publicUser(await getUserById(row.owner_id)),
    })
    if (out.isOwner) out.stats = { views: row.views || 0, enquiries: row.enquiries || 0, followers: out.followers }
  }
  return out
}

// What a business may be given: trimmed text, known category, safe photos.
function cleanBusiness(b, { partial = false } = {}) {
  const out = {}
  const text = (k, n) => { if (b[k] != null) out[k] = clip(b[k], n) }
  if (!partial || b.name != null) {
    out.name = clip(b.name, 80)
    if (!out.name) throw new Error('Give your business a name.')
  }
  if (b.category != null || !partial) {
    out.category = CATEGORY_IDS.includes(b.category) ? b.category : null
    if (!out.category) throw new Error('Pick a category.')
  }
  text('description', 600); text('city', 40); text('area', 60); text('phone', 30); text('hours', 120)
  if (b.website != null) {
    const w = clip(b.website, 200)
    if (w && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(w) && !/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(w)) throw new Error('That website doesn’t look right.')
    out.website = w && !/^https?:\/\//i.test(w) ? `https://${w}` : w
  }
  for (const k of ['logo', 'cover']) {
    if (b[k] == null) continue
    const v = cleanCover(b[k])
    if (v === null) throw new Error('That photo link isn’t one we stored.')
    out[k] = v
  }
  return out
}

function cleanListing(b) {
  const title = clip(b.title, 100)
  if (!title) throw new Error('Give it a title.')
  const kind = LISTING_KINDS.includes(b.kind) ? b.kind : null
  if (!kind) throw new Error('Pick what kind of listing this is.')
  let price = null
  if (b.price !== '' && b.price != null) {
    price = Math.round(Number(String(b.price).replace(/[₦,\s]/g, '')))
    if (!Number.isFinite(price) || price < 0 || price > 1e13) throw new Error('Enter the price as a number of naira.')
  }
  const status = LISTING_STATUS.includes(b.status) ? b.status : ''
  const image = b.image ? cleanCover(b.image) : ''
  if (image === null) throw new Error('That photo link isn’t one we stored.')
  return { title, kind, price, status, image, description: clip(b.description, 600), area: clip(b.area, 60) }
}

// ── Routes ───────────────────────────────────────────────────────────
export function businessRoutes(app) {
  const owned = async (req, res) => {
    const row = await q.get('SELECT * FROM businesses WHERE id = ?', req.params.id)
    if (!row) { err(res, 404, 'Business not found.'); return null }
    if (row.owner_id !== req.userId) { err(res, 403, 'Only the business owner can do that.'); return null }
    return row
  }

  app.get('/api/business-meta', (_req, res) => res.json({ categories: CATEGORIES, listingKinds: LISTING_KINDS, promotion: PROMOTION }))

  // Explore Businesses: ?q= searches name and description, ?category= and
  // ?city= filter. Businesses with a live promotion come first.
  app.get('/api/businesses', async (req, res) => {
    const { category, city } = req.query
    const needle = clip(req.query.q, 60).toLowerCase()
    const where = []; const args = []
    if (CATEGORY_IDS.includes(category)) { where.push('category = ?'); args.push(category) }
    if (city) { where.push('LOWER(city) = LOWER(?)'); args.push(clip(city, 40)) }
    if (needle) { where.push("(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)"); args.push(`%${needle}%`, `%${needle}%`) }
    const rows = await q.all(`SELECT * FROM businesses ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 60`, ...args)
    const list = await Promise.all(rows.map((r) => serializeBusiness(r, req.userId)))
    list.sort((a, b) => Number(b.promoted) - Number(a.promoted))
    res.json({ businesses: list })
  })

  app.get('/api/businesses/mine', requireAuth, async (req, res) => {
    const rows = await q.all('SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at DESC', req.userId)
    res.json({ businesses: await Promise.all(rows.map((r) => serializeBusiness(r, req.userId))) })
  })

  // Promoted listings for the Home feed and My City, newest promotion first.
  app.get('/api/businesses/promoted', async (req, res) => {
    const rows = await q.all(`SELECT l.*, b.name AS biz_name, b.logo AS biz_logo, b.city AS biz_city, b.verified AS biz_verified, b.category AS biz_category
      FROM business_promotions p JOIN business_listings l ON l.id = p.listing_id JOIN businesses b ON b.id = p.business_id
      WHERE p.ends_at > ? ${req.query.city ? 'AND (p.audience = \'nigeria\' OR LOWER(b.city) = LOWER(?))' : ''}
      ORDER BY p.starts_at DESC LIMIT 8`, now(), ...(req.query.city ? [clip(req.query.city, 40)] : []))
    const seen = new Set()
    res.json({
      listings: rows.filter((r) => !seen.has(r.id) && seen.add(r.id)).map((r) => ({
        ...serializeListing(r, new Set([r.id]), { inline: false }),
        business: { id: r.business_id, name: r.biz_name, logo: listImage(r.biz_logo), city: r.biz_city, verified: !!r.biz_verified, categoryLabel: CATEGORIES.find((c) => c.id === r.biz_category)?.label },
      })),
    })
  })

  app.post('/api/businesses', requireAuth, async (req, res) => {
    let b
    try { b = cleanBusiness(req.body || {}) } catch (e) { return err(res, 400, e.message) }
    const count = await q.get('SELECT COUNT(*) AS n FROM businesses WHERE owner_id = ?', req.userId)
    if ((count?.n || 0) >= 5) return err(res, 400, 'You can run up to five businesses on one account.')
    const id = uid('biz')
    await q.run(`INSERT INTO businesses (id, owner_id, name, category, description, city, area, logo, cover, phone, website, hours, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, req.userId, b.name, b.category, b.description || '',
      b.city || req.userRow.city || 'Lagos', b.area || '', b.logo || '', b.cover || '', b.phone || '', b.website || '', b.hours || '', now())
    res.json({ business: await serializeBusiness(await q.get('SELECT * FROM businesses WHERE id = ?', id), req.userId, { full: true }) })
  })

  app.get('/api/businesses/:id', async (req, res, next) => {
    if (['mine', 'promoted'].includes(req.params.id)) return next()
    const row = await q.get('SELECT * FROM businesses WHERE id = ?', req.params.id)
    if (!row) return err(res, 404, 'Business not found.')
    // Every open by someone other than the owner counts as a view.
    if (row.owner_id !== req.userId) await q.run('UPDATE businesses SET views = views + 1 WHERE id = ?', row.id)
    res.json({ business: await serializeBusiness(row, req.userId, { full: true }) })
  })

  app.patch('/api/businesses/:id', requireAuth, async (req, res) => {
    const row = await owned(req, res); if (!row) return
    let b
    try { b = cleanBusiness(req.body || {}, { partial: true }) } catch (e) { return err(res, 400, e.message) }
    const keys = Object.keys(b)
    if (keys.length) await q.run(`UPDATE businesses SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => b[k]), row.id)
    res.json({ business: await serializeBusiness(await q.get('SELECT * FROM businesses WHERE id = ?', row.id), req.userId, { full: true }) })
  })

  app.delete('/api/businesses/:id', requireAuth, async (req, res) => {
    const row = await owned(req, res); if (!row) return
    for (const t of ['business_listings', 'business_follows', 'business_reviews', 'business_promotions']) await q.run(`DELETE FROM ${t} WHERE business_id = ?`, row.id)
    await q.run('DELETE FROM businesses WHERE id = ?', row.id)
    res.json({ ok: true })
  })

  app.post('/api/businesses/:id/follow', requireAuth, async (req, res) => {
    const row = await q.get('SELECT id, owner_id FROM businesses WHERE id = ?', req.params.id)
    if (!row) return err(res, 404, 'Business not found.')
    if (row.owner_id === req.userId) return err(res, 400, 'You can’t follow your own business.')
    if (req.body?.follow === false) await q.run('DELETE FROM business_follows WHERE business_id = ? AND user_id = ?', row.id, req.userId)
    else await q.run('INSERT INTO business_follows (business_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', row.id, req.userId, now())
    const n = await q.get('SELECT COUNT(*) AS n FROM business_follows WHERE business_id = ?', row.id)
    res.json({ following: req.body?.follow !== false, followers: n?.n || 0 })
  })

  // Listings: properties, services, products and offers.
  app.post('/api/businesses/:id/listings', requireAuth, async (req, res) => {
    const row = await owned(req, res); if (!row) return
    let l
    try { l = cleanListing(req.body || {}) } catch (e) { return err(res, 400, e.message) }
    const id = uid('lst')
    await q.run(`INSERT INTO business_listings (id, business_id, kind, title, description, price, status, image, area, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, row.id, l.kind, l.title, l.description, l.price, l.status, l.image, l.area, now())
    res.json({ listing: serializeListing(await q.get('SELECT * FROM business_listings WHERE id = ?', id), new Set()) })
  })

  app.delete('/api/businesses/:id/listings/:listingId', requireAuth, async (req, res) => {
    const row = await owned(req, res); if (!row) return
    await q.run('DELETE FROM business_promotions WHERE listing_id = ? AND business_id = ?', req.params.listingId, row.id)
    const r = await q.run('DELETE FROM business_listings WHERE id = ? AND business_id = ?', req.params.listingId, row.id)
    if (!r.changes) return err(res, 404, 'Listing not found.')
    res.json({ ok: true })
  })

  // Opening a listing counts a view of it.
  app.post('/api/businesses/:id/listings/:listingId/view', async (req, res) => {
    const biz = await q.get('SELECT owner_id FROM businesses WHERE id = ?', req.params.id)
    if (biz && biz.owner_id !== req.userId) await q.run('UPDATE business_listings SET views = views + 1 WHERE id = ? AND business_id = ?', req.params.listingId, req.params.id)
    res.json({ ok: true })
  })

  // Reviews: one per person, not by the owner.
  app.get('/api/businesses/:id/reviews', async (req, res) => {
    const rows = await q.all('SELECT * FROM business_reviews WHERE business_id = ? ORDER BY created_at DESC LIMIT 50', req.params.id)
    const reviews = await Promise.all(rows.map(async (r) => ({
      user: publicUser(await getUserById(r.user_id)), stars: r.stars, body: r.body, createdAt: r.created_at, mine: r.user_id === req.userId,
    })))
    res.json({ reviews: reviews.filter((r) => r.user) })
  })

  app.post('/api/businesses/:id/reviews', requireAuth, async (req, res) => {
    const row = await q.get('SELECT id, owner_id FROM businesses WHERE id = ?', req.params.id)
    if (!row) return err(res, 404, 'Business not found.')
    if (row.owner_id === req.userId) return err(res, 400, 'You can’t review your own business.')
    const stars = Math.round(Number(req.body?.stars))
    if (!(stars >= 1 && stars <= 5)) return err(res, 400, 'Pick from one to five stars.')
    await q.run(`INSERT INTO business_reviews (business_id, user_id, stars, body, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (business_id, user_id) DO UPDATE SET stars = excluded.stars, body = excluded.body, created_at = excluded.created_at`,
    row.id, req.userId, stars, clip(req.body?.body, 600), now())
    res.json({ ok: true })
  })

  // Promote Post. Free during beta (no payments yet); the estimate is what
  // the screen shows before you confirm.
  app.post('/api/businesses/:id/promote', requireAuth, async (req, res) => {
    const row = await owned(req, res); if (!row) return
    const b = req.body || {}
    const listing = await q.get('SELECT * FROM business_listings WHERE id = ? AND business_id = ?', b.listingId, row.id)
    if (!listing) return err(res, 400, 'Pick one of your listings to promote.')
    if (!PROMOTION.goals.some((g) => g.id === b.goal)) return err(res, 400, 'Pick a goal.')
    if (!PROMOTION.audiences.some((a) => a.id === b.audience)) return err(res, 400, 'Pick who should see it.')
    const days = Number(b.days), budget = Number(b.budget)
    if (!PROMOTION.days.includes(days)) return err(res, 400, 'Pick how long it runs.')
    if (!PROMOTION.budgets.includes(budget)) return err(res, 400, 'Pick a budget.')
    const reach = estimateReach({ budget, days, audience: b.audience })
    const live = await q.get('SELECT id FROM business_promotions WHERE listing_id = ? AND ends_at > ?', listing.id, now())
    if (live) return err(res, 409, 'That listing is already being promoted.')
    const id = uid('promo')
    await q.run(`INSERT INTO business_promotions (id, business_id, listing_id, goal, audience, days, budget, reach_low, reach_high, views_at_start, enquiries_at_start, starts_at, ends_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, row.id, listing.id, b.goal, b.audience, days, budget, reach.low, reach.high,
    listing.views || 0, listing.enquiries || 0, now(), now() + days * DAY)
    res.json({ promotion: await serializePromotion(await q.get('SELECT * FROM business_promotions WHERE id = ?', id)) })
  })

  app.get('/api/businesses/:id/promotions', requireAuth, async (req, res) => {
    const row = await owned(req, res); if (!row) return
    const rows = await q.all('SELECT * FROM business_promotions WHERE business_id = ? ORDER BY starts_at DESC', row.id)
    res.json({ promotions: await Promise.all(rows.map(serializePromotion)) })
  })
}

// How a promotion is doing: views and enquiries on the listing since it
// started.
async function serializePromotion(p) {
  const l = await q.get('SELECT * FROM business_listings WHERE id = ?', p.listing_id)
  return {
    id: p.id, businessId: p.business_id, listingId: p.listing_id, goal: p.goal, audience: p.audience,
    days: p.days, budget: p.budget, reach: { low: p.reach_low, high: p.reach_high },
    startsAt: p.starts_at, endsAt: p.ends_at, live: p.ends_at > now(),
    listing: l ? serializeListing(l, new Set([l.id]), { inline: false }) : null,
    views: Math.max(0, (l?.views || 0) - (p.views_at_start || 0)),
    enquiries: Math.max(0, (l?.enquiries || 0) - (p.enquiries_at_start || 0)),
  }
}

// For Chat: a conversation started from a business or one of its listings.
// Recording it counts an enquiry for the business (and the listing).
export async function businessContext(raw, other) {
  const biz = await q.get('SELECT id, name, logo, owner_id, city FROM businesses WHERE id = ?', clip(raw?.id, 80))
  if (!biz || biz.owner_id !== other.id) return null
  const listing = raw?.listing ? await q.get('SELECT id, title, image, price FROM business_listings WHERE id = ? AND business_id = ?', clip(raw.listing, 80), biz.id) : null
  const price = listing?.price != null ? `₦${Number(listing.price).toLocaleString('en-NG')}` : ''
  return {
    kind: 'business', id: biz.id, listing: listing?.id || undefined,
    title: listing ? listing.title : biz.name,
    sub: listing ? [biz.name, price].filter(Boolean).join(' · ') : ['Business', biz.city].filter(Boolean).join(' · '),
    image: listImage(listing?.image) || listImage(biz.logo),
    link: `/business/${biz.id}${listing ? `?listing=${listing.id}` : ''}`,
  }
}
export async function countEnquiry(context) {
  if (context?.kind !== 'business') return
  await q.run('UPDATE businesses SET enquiries = enquiries + 1 WHERE id = ?', context.id)
  if (context.listing) await q.run('UPDATE business_listings SET enquiries = enquiries + 1 WHERE id = ?', context.listing)
}
