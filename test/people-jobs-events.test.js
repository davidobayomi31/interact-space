import { describe, it, expect } from 'vitest'
import { signUp } from './helpers.js'

describe('connections', () => {
  // Idea #3
  it('does not let you connect to yourself', async () => {
    const { agent, user } = await signUp()
    const res = await agent.post(`/api/users/${user.id}/connect`)
    expect(res.status).toBe(400)
  })

  it('connects to someone else, and tapping again removes the connection', async () => {
    const { agent } = await signUp('Me')
    const { user: other } = await signUp('Other')

    let res = await agent.post(`/api/users/${other.id}/connect`)
    expect(res.body.user.connections).toContain(other.id)
    res = await agent.post(`/api/users/${other.id}/connect`)
    expect(res.body.user.connections).not.toContain(other.id)
  })
})

describe('quick jobs', () => {
  // Idea #9
  it('only shows the list of offers to the person who posted the job', async () => {
    const { agent: poster } = await signUp('Poster')
    const { agent: worker } = await signUp('Worker')
    const { agent: stranger } = await signUp('Stranger')

    const job = (await poster.post('/api/jobs').send({ title: 'Fix my sink', category: 'Plumbing' })).body.job
    const offer = await worker.post(`/api/jobs/${job.id}/offer`).send({ offer: '15000', note: 'Can come today' })
    expect(offer.body.job.myOffer).toBe('15000')

    const seenBy = async (agent) => (await agent.get('/api/jobs')).body.jobs.find((j) => j.id === job.id)
    const posterView = await seenBy(poster)
    expect(posterView.offers).toHaveLength(1)
    expect(posterView.offers[0]).toMatchObject({ offer: '15000', note: 'Can come today' })

    // Everyone else sees only the count, never who offered or how much.
    const strangerView = await seenBy(stranger)
    expect(strangerView.offers).toBeUndefined()
    expect(strangerView.offerCount).toBe(1)
  })

  it('does not let you make an offer on your own job', async () => {
    const { agent: poster } = await signUp('Poster')
    const job = (await poster.post('/api/jobs').send({ title: 'Paint a wall', category: 'Painting' })).body.job
    const res = await poster.post(`/api/jobs/${job.id}/offer`).send({ offer: '5000' })
    expect(res.status).toBe(400)
  })
})

describe('events', () => {
  // Idea #10
  it('lists you as going after you RSVP, and removes you when you RSVP again', async () => {
    const { agent: host } = await signUp('Host')
    const { agent: guest, user: guestUser } = await signUp('Guest')
    const event = (await host.post('/api/events').send({ title: 'Lagos Tech Meetup', date: '2027-01-15' })).body.event

    const going = async () => (await guest.get(`/api/events/${event.id}/people`)).body.going.map((u) => u.id)

    expect((await guest.post(`/api/events/${event.id}/rsvp`)).body.going).toBe(true)
    expect(await going()).toContain(guestUser.id)

    expect((await guest.post(`/api/events/${event.id}/rsvp`)).body.going).toBe(false)
    expect(await going()).not.toContain(guestUser.id)
  })

  it('rejects an event without a valid date', async () => {
    const { agent } = await signUp()
    const res = await agent.post('/api/events').send({ title: 'No date party', date: 'next friday' })
    expect(res.status).toBe(400)
  })
})
