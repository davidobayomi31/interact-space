// Job applications (interest and the applicant's tracker), 24-hour
// statuses, badges and ads. Each block checks the happy path and the
// ownership rule: you can only change your own things.
import { describe, expect, it } from 'vitest'
import { app, request, signUp, createCommunity } from './helpers.js'

const postJob = async (agent, extra = {}) =>
  (await agent.post('/api/jobs').send({ title: 'Carry boxes', category: 'Moving', ...extra })).body.job

describe('job interest and applications', () => {
  it('toggles interest on and off and counts it', async () => {
    const poster = await signUp()
    const worker = await signUp()
    const job = await postJob(poster.agent)
    const on = (await worker.agent.post(`/api/jobs/${job.id}/interest`)).body.job
    expect(on).toMatchObject({ iInterested: true, interested: 1 })
    const off = (await worker.agent.post(`/api/jobs/${job.id}/interest`)).body.job
    expect(off).toMatchObject({ iInterested: false, interested: 0 })
  })

  it('will not let you apply to your own job', async () => {
    const poster = await signUp()
    const job = await postJob(poster.agent)
    expect((await poster.agent.post(`/api/jobs/${job.id}/interest`)).status).toBe(400)
  })

  it('needs ID verification for verified-only jobs', async () => {
    const poster = await signUp()
    const worker = await signUp()
    const job = await postJob(poster.agent, { verifiedOnly: true })
    expect((await worker.agent.post(`/api/jobs/${job.id}/interest`)).status).toBe(403)
  })

  it('lets an applicant track their status, and only known statuses', async () => {
    const poster = await signUp()
    const worker = await signUp()
    const job = await postJob(poster.agent)
    await worker.agent.post(`/api/jobs/${job.id}/interest`)

    let mine = (await worker.agent.get('/api/me/jobs')).body
    expect(mine.applied.find((a) => a.job.id === job.id)).toMatchObject({ status: 'applied' })

    expect((await worker.agent.patch(`/api/jobs/${job.id}/application`).send({ status: 'talking', note: 'Call on Monday' })).status).toBe(200)
    mine = (await worker.agent.get('/api/me/jobs')).body
    expect(mine.applied.find((a) => a.job.id === job.id)).toMatchObject({ status: 'talking', note: 'Call on Monday' })

    expect((await worker.agent.patch(`/api/jobs/${job.id}/application`).send({ status: 'promoted-to-ceo' })).status).toBe(400)
    const stranger = await signUp()
    expect((await stranger.agent.patch(`/api/jobs/${job.id}/application`).send({ status: 'hired' })).status).toBe(404)
  })

  it('lists the jobs you posted', async () => {
    const poster = await signUp()
    const job = await postJob(poster.agent)
    const mine = (await poster.agent.get('/api/me/jobs')).body
    expect(mine.posted.map((j) => j.id)).toContain(job.id)
  })
})

describe('statuses', () => {
  it('posts a text status, groups it under you, and tracks views', async () => {
    const me = await signUp('Status Poster')
    const viewer = await signUp('Status Viewer')
    const posted = await me.agent.post('/api/statuses').send({ text: 'Good morning Lagos', bg: '#111' })
    expect(posted.status).toBe(200)

    const mine = (await me.agent.get('/api/statuses')).body.groups.find((g) => g.mine)
    expect(mine.statuses.map((s) => s.text)).toContain('Good morning Lagos')

    let theirs = (await viewer.agent.get('/api/statuses')).body.groups.find((g) => g.user.id === me.user.id)
    expect(theirs.seen).toBe(false)
    await viewer.agent.post(`/api/statuses/${posted.body.id}/view`)
    await viewer.agent.post(`/api/statuses/${posted.body.id}/view`) // twice is fine
    theirs = (await viewer.agent.get('/api/statuses')).body.groups.find((g) => g.user.id === me.user.id)
    expect(theirs.seen).toBe(true)
  })

  it('needs a photo or some text, and caps the text', async () => {
    const me = await signUp()
    expect((await me.agent.post('/api/statuses').send({ text: '   ' })).status).toBe(400)
    const long = await me.agent.post('/api/statuses').send({ text: 'x'.repeat(1000) })
    expect(long.status).toBe(200)
    const group = (await me.agent.get('/api/statuses')).body.groups.find((g) => g.mine)
    expect(group.statuses.at(-1).text.length).toBe(240)
  })

  it('only the owner can delete a status', async () => {
    const me = await signUp()
    const other = await signUp()
    const { id } = (await me.agent.post('/api/statuses').send({ text: 'mine' })).body
    expect((await other.agent.delete(`/api/statuses/${id}`)).status).toBe(404)
    expect((await me.agent.delete(`/api/statuses/${id}`)).status).toBe(200)
  })
})

describe('badges', () => {
  it('makes, hides and deletes your own badges, up to 12', async () => {
    const me = await signUp()
    const made = (await me.agent.post('/api/badges').send({ name: 'Night Owl', style: 'not-a-style' })).body
    const badge = made.custom.find((b) => b.name === 'Night Owl')
    expect(badge.style).toBe('violet')

    const hidden = (await me.agent.post(`/api/badges/${badge.id}/visibility`).send({ hidden: true })).body
    expect(hidden.custom.find((b) => b.id === badge.id).hidden).toBe(true)

    const gone = (await me.agent.delete(`/api/badges/${badge.id}`)).body
    expect(gone.custom.find((b) => b.id === badge.id)).toBeUndefined()

    expect((await me.agent.post('/api/badges').send({ name: 'x' })).status).toBe(400)
    for (let i = 0; i < 12; i++) await me.agent.post('/api/badges').send({ name: `Badge ${i}` })
    expect((await me.agent.post('/api/badges').send({ name: 'One too many' })).status).toBe(400)
  })

  it('you cannot delete someone else’s badge', async () => {
    const owner = await signUp()
    const other = await signUp()
    const badge = (await owner.agent.post('/api/badges').send({ name: 'Keep Me' })).body.custom[0]
    await other.agent.delete(`/api/badges/${badge.id}`)
    const still = (await owner.agent.get(`/api/users/${owner.user.id}/journey`)).body
    expect(still.custom.map((b) => b.id)).toContain(badge.id)
  })
})

describe('ads', () => {
  it('creates an ad for a city and only its owner can activate it', async () => {
    const owner = await signUp()
    const other = await signUp()
    const ad = (await owner.agent.post('/api/ads').send({ businessName: 'Kola Test Foods', city: 'Ibadan' })).body.ad
    expect(ad.businessName ?? ad.business_name).toBe('Kola Test Foods')
    expect((await other.agent.post(`/api/ads/${ad.id}/pay`)).status).toBe(403)
    expect((await owner.agent.post(`/api/ads/${ad.id}/pay`)).status).toBe(200)

    const local = (await request(app).get('/api/ads?city=ibadan')).body.ads.map((a) => a.id)
    expect(local).toContain(ad.id)
    const mine = (await owner.agent.get('/api/ads/mine')).body.ads.map((a) => a.id)
    expect(mine).toContain(ad.id)
  })

  it('needs a business name', async () => {
    const owner = await signUp()
    expect((await owner.agent.post('/api/ads').send({ businessName: ' ' })).status).toBe(400)
  })
})

describe('community membership edge cases', () => {
  it('two quick joins count you once and neither errors', async () => {
    const owner = await signUp()
    const community = await createCommunity(owner.agent)
    const joiner = await signUp()
    const [a, b] = await Promise.all([
      joiner.agent.post(`/api/communities/${community.id}/join`),
      joiner.agent.post(`/api/communities/${community.id}/join`),
    ])
    expect([a.status, b.status]).toEqual([200, 200])
    const after = (await joiner.agent.get(`/api/communities/${community.id}`)).body.community
    expect(after.memberCount).toBe(community.memberCount + 1)
  })

  it('an owner cannot leave their own community', async () => {
    const owner = await signUp()
    const community = await createCommunity(owner.agent)
    expect((await owner.agent.post(`/api/communities/${community.id}/leave`)).status).toBe(400)
  })
})
