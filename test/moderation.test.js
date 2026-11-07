import { describe, it, expect, beforeAll } from 'vitest'
import { signUp, createCommunity, createPost } from './helpers.js'

describe('reporting and moderation', () => {
  let owner, member, community

  beforeAll(async () => {
    owner = (await signUp('Owner')).agent
    member = (await signUp('Member')).agent
    community = await createCommunity(owner)
    await member.post(`/api/communities/${community.id}/join`)
  })

  const report = (agent, postId) =>
    agent.post('/api/reports').send({ targetType: 'post', targetId: postId, reason: 'Spam' })

  async function reportIdFor(postId) {
    const queue = (await owner.get('/api/mod/reports')).body.reports
    return queue.find((r) => r.targetId === postId)?.id
  }

  it('shows a report in the owner\'s queue but not in a regular member\'s', async () => {
    const post = await createPost(member, community.id, 'Buy cheap stuff')
    expect((await report(member, post.id)).status).toBe(200)

    expect(await reportIdFor(post.id)).toBeDefined()
    const memberQueue = (await member.get('/api/mod/reports')).body
    expect(memberQueue.reports).toEqual([])
  })

  it('does not let a regular member resolve a report', async () => {
    const post = await createPost(member, community.id, 'Another one')
    await report(member, post.id)
    const id = await reportIdFor(post.id)

    const res = await member.post(`/api/reports/${id}/resolve`).send({ action: 'remove' })
    expect(res.status).toBe(403)
    expect((await member.get(`/api/posts/${post.id}`)).status).toBe(200)
  })

  it('hides a post when a moderator removes it, and logs the action', async () => {
    const post = await createPost(member, community.id, 'Remove me')
    await report(member, post.id)
    const id = await reportIdFor(post.id)

    expect((await owner.post(`/api/reports/${id}/resolve`).send({ action: 'remove' })).status).toBe(200)
    expect((await member.get(`/api/posts/${post.id}`)).status).toBe(404)

    const listing = (await member.get(`/api/posts?community=${community.id}`)).body.posts
    expect(listing.some((p) => p.id === post.id)).toBe(false)

    const { q } = await import('../server/db.js')
    const log = await q.get("SELECT * FROM mod_log WHERE target_id = ? AND action = 'content.removed'", post.id)
    expect(log).toBeDefined()
  })

  it('keeps a post visible when the report is dismissed', async () => {
    const post = await createPost(member, community.id, 'Actually fine')
    await report(member, post.id)
    const id = await reportIdFor(post.id)

    await owner.post(`/api/reports/${id}/resolve`).send({ action: 'dismiss' })
    expect((await member.get(`/api/posts/${post.id}`)).status).toBe(200)
  })
})
