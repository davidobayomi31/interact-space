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

  it('returns 404 for a community that does not exist', async () => {
    const { agent } = await signUp()
    const res = await agent.post('/api/communities/does-not-exist/join')
    expect(res.status).toBe(404)
  })
})
