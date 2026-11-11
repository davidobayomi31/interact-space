// Business on VOIDAJ (Nuel's mockup, Nov 8): create a business, list
// things, get followed and reviewed, promote a listing, get enquiries.
import { describe, expect, it } from 'vitest'
import { app, request, signUp } from './helpers.js'

async function makeBusiness(agent, body = {}) {
  const res = await agent.post('/api/businesses').send({ name: 'Akinyede Estates', category: 'real-estate', description: 'Real estate · property management', city: 'Lagos', ...body })
  expect(res.status).toBe(200)
  return res.body.business
}

describe('business on VOIDAJ', () => {
  it('needs a name and a known category', async () => {
    const { agent } = await signUp('Owner')
    expect((await agent.post('/api/businesses').send({ category: 'real-estate' })).status).toBe(400)
    expect((await agent.post('/api/businesses').send({ name: 'X', category: 'made-up' })).status).toBe(400)
    expect((await request(app).post('/api/businesses').send({ name: 'X', category: 'tech' })).status).toBe(401)
  })

  it('lets the owner add listings, and nobody else', async () => {
    const owner = await signUp('Owner')
    const other = await signUp('Other')
    const biz = await makeBusiness(owner.agent)
    expect(biz).toMatchObject({ name: 'Akinyede Estates', categoryLabel: 'Real Estate', isOwner: true, listingKinds: ['property', 'service', 'offer'] })

    const listing = await owner.agent.post(`/api/businesses/${biz.id}/listings`)
      .send({ kind: 'property', title: '4 Bedroom Duplex', price: '₦220,000,000', status: 'for-sale', area: 'Lekki, Lagos' })
    expect(listing.status).toBe(200)
    expect(listing.body.listing).toMatchObject({ price: 220000000, status: 'for-sale' })

    expect((await other.agent.post(`/api/businesses/${biz.id}/listings`).send({ kind: 'property', title: 'Not mine' })).status).toBe(403)
    expect((await other.agent.patch(`/api/businesses/${biz.id}`).send({ name: 'Hijacked' })).status).toBe(403)

    const page = (await other.agent.get(`/api/businesses/${biz.id}`)).body.business
    expect(page.listings).toHaveLength(1)
    expect(page.isOwner).toBe(false)
    expect(page.stats).toBeUndefined()
  })

  it('counts followers and keeps one review per person', async () => {
    const owner = await signUp('Owner')
    const fan = await signUp('Fan')
    const biz = await makeBusiness(owner.agent)

    expect((await owner.agent.post(`/api/businesses/${biz.id}/follow`)).status).toBe(400)
    expect((await fan.agent.post(`/api/businesses/${biz.id}/follow`)).body).toEqual({ following: true, followers: 1 })

    expect((await owner.agent.post(`/api/businesses/${biz.id}/reviews`).send({ stars: 5 })).status).toBe(400)
    await fan.agent.post(`/api/businesses/${biz.id}/reviews`).send({ stars: 3, body: 'Fine' })
    await fan.agent.post(`/api/businesses/${biz.id}/reviews`).send({ stars: 5, body: 'Great after all' })
    const page = (await fan.agent.get(`/api/businesses/${biz.id}`)).body.business
    expect(page).toMatchObject({ followers: 1, isFollowing: true, rating: { count: 1, avg: 5 } })
  })

  it('promotes a listing, shows it first, and counts enquiries from Chat', async () => {
    const owner = await signUp('Owner')
    const buyer = await signUp('Buyer')
    const quiet = await makeBusiness(owner.agent, { name: 'Quiet Shop', category: 'fashion' })
    const biz = await makeBusiness(owner.agent)
    const { listing } = (await owner.agent.post(`/api/businesses/${biz.id}/listings`).send({ kind: 'property', title: 'Duplex', price: 1000 })).body

    const promo = await owner.agent.post(`/api/businesses/${biz.id}/promote`)
      .send({ listingId: listing.id, goal: 'enquiries', audience: 'nearby', days: 7, budget: 15000 })
    expect(promo.status).toBe(200)
    expect(promo.body.promotion).toMatchObject({ live: true, reach: { low: 8000, high: 25000 } })
    expect((await owner.agent.post(`/api/businesses/${biz.id}/promote`).send({ listingId: listing.id, goal: 'enquiries', audience: 'nearby', days: 7, budget: 15000 })).status).toBe(409)

    const list = (await request(app).get('/api/businesses?city=Lagos')).body.businesses.filter((b) => [biz.id, quiet.id].includes(b.id))
    expect(list.map((b) => b.id)).toEqual([biz.id, quiet.id])
    expect((await request(app).get('/api/businesses/promoted')).body.listings.some((l) => l.id === listing.id)).toBe(true)

    // An enquiry goes through even though the owner only takes messages from connections.
    await owner.agent.patch('/api/auth/me').send({ settings: { messages: 'connections' } })
    const sent = await buyer.agent.post(`/api/messages/${owner.user.id}`)
      .send({ body: 'Is it still available?', context: { kind: 'business', id: biz.id, listing: listing.id } })
    expect(sent.status).toBe(200)
    expect(sent.body.message.context).toMatchObject({ kind: 'business', title: 'Duplex', link: `/business/${biz.id}?listing=${listing.id}` })

    const promos = (await owner.agent.get(`/api/businesses/${biz.id}/promotions`)).body.promotions
    expect(promos[0]).toMatchObject({ enquiries: 1 })
    const mine = (await owner.agent.get(`/api/businesses/${biz.id}`)).body.business
    expect(mine.stats.enquiries).toBe(1)
  })
})
