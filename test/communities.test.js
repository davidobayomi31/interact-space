import { describe, it, expect } from 'vitest'
import { signUp, createCommunity, createPost } from './helpers.js'

describe('communities and membership', () => {
  it('makes the creator the owner with one member', async () => {
    const { agent } = await signUp('Owner')
    const community = await createCommunity(agent)
    expect(community).toMatchObject({ joined: true, role: 'owner', memberCount: 1 })
    expect(community.rules.some((r) => /charter/i.test(r))).toBe(true)
  })

  it('rejects a community name shorter than 3 letters', async () => {
    const { agent } = await signUp()
    const res = await agent.post('/api/communities').send({ name: 'ab' })
    expect(res.status).toBe(400)
  })

  it('counts a member once even if they join twice', async () => {
    const { agent: owner } = await signUp('Owner')
    const { agent: member } = await signUp('Member')
    const community = await createCommunity(owner)

    await member.post(`/api/communities/${community.id}/join`)
    const second = await member.post(`/api/communities/${community.id}/join`)
    expect(second.body.community).toMatchObject({ joined: true, role: 'member', memberCount: 2 })
  })

  it('decrements the count on leave, and the owner cannot leave', async () => {
    const { agent: owner } = await signUp('Owner')
    const { agent: member } = await signUp('Member')
    const community = await createCommunity(owner)
    await member.post(`/api/communities/${community.id}/join`)

    const left = await member.post(`/api/communities/${community.id}/leave`)
    expect(left.body.community).toMatchObject({ joined: false, memberCount: 1 })

    const ownerLeaves = await owner.post(`/api/communities/${community.id}/leave`)
    expect(ownerLeaves.status).toBe(400)
  })

  it('only lets members post in a community', async () => {
    const { agent: owner } = await signUp('Owner')
    const { agent: outsider } = await signUp('Outsider')
    const community = await createCommunity(owner)

    const blocked = await outsider.post('/api/posts').send({ communityId: community.id, title: 'Hi' })
    expect(blocked.status).toBe(403)

    await outsider.post(`/api/communities/${community.id}/join`)
    const post = await createPost(outsider, community.id, 'Now I can post')
    expect(post).toMatchObject({ title: 'Now I can post', communityId: community.id, score: 0 })
  })

  // Idea #1
  it('rejects a rating outside 1-5 stars', async () => {
    const { agent } = await signUp()
    const community = await createCommunity(agent)
    const res = await agent.post(`/api/communities/${community.id}/rate`).send({ stars: 9 })
    expect(res.status).toBe(400)
  })

  // Idea #2
  it('records a valid rating and replaces it when rated again', async () => {
    const { agent } = await signUp()
    const community = await createCommunity(agent)

    let res = await agent.post(`/api/communities/${community.id}/rate`).send({ stars: 4 })
    expect(res.body.community.rating).toMatchObject({ mine: 4, avg: 4, count: 1 })

    res = await agent.post(`/api/communities/${community.id}/rate`).send({ stars: 2 })
    expect(res.body.community.rating).toMatchObject({ mine: 2, avg: 2, count: 1 })
  })

  // Idea #7
  it('does not let a regular member promote someone', async () => {
    const { agent: owner } = await signUp('Owner')
    const { agent: memberA } = await signUp('Member A')
    const { agent: memberB, user: b } = await signUp('Member B')
    const community = await createCommunity(owner)
    await memberA.post(`/api/communities/${community.id}/join`)
    await memberB.post(`/api/communities/${community.id}/join`)

    const res = await memberA.post(`/api/communities/${community.id}/roles`).send({ userId: b.id, role: 'moderator' })
    expect(res.status).toBe(403)
  })

  // Idea #8
  it('lets the owner make a member a moderator, who can then resolve reports', async () => {
    const { agent: owner } = await signUp('Owner')
    const { agent: mod, user: modUser } = await signUp('Future Mod')
    const { agent: poster } = await signUp('Poster')
    const community = await createCommunity(owner)
    await mod.post(`/api/communities/${community.id}/join`)
    await poster.post(`/api/communities/${community.id}/join`)

    const promote = await owner.post(`/api/communities/${community.id}/roles`).send({ userId: modUser.id, role: 'moderator' })
    expect(promote.body).toMatchObject({ ok: true, role: 'moderator' })

    const post = await createPost(poster, community.id, 'Spammy post')
    await poster.post('/api/reports').send({ targetType: 'post', targetId: post.id, reason: 'Spam' })
    const queue = (await mod.get('/api/mod/reports')).body.reports
    const report = queue.find((r) => r.targetId === post.id)
    expect(report).toBeDefined()

    const resolve = await mod.post(`/api/reports/${report.id}/resolve`).send({ action: 'remove' })
    expect(resolve.status).toBe(200)
    expect((await poster.get(`/api/posts/${post.id}`)).status).toBe(404)
  })

  it('returns 404 for a community that does not exist', async () => {
    const { agent } = await signUp()
    const res = await agent.post('/api/communities/does-not-exist/join')
    expect(res.status).toBe(404)
  })
})
