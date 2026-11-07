import { describe, it, expect, beforeAll } from 'vitest'
import { signUp, createCommunity, createPost } from './helpers.js'

describe('posts, voting and threaded comments', () => {
  let alice, bob, community

  beforeAll(async () => {
    alice = (await signUp('Alice')).agent
    bob = (await signUp('Bob')).agent
    community = await createCommunity(alice)
    await bob.post(`/api/communities/${community.id}/join`)
  })

  it('counts one vote per user and toggles off when the same arrow is clicked again', async () => {
    const post = await createPost(alice, community.id)
    const vote = (agent, value) => agent.post('/api/vote').send({ targetType: 'post', targetId: post.id, value })

    expect((await vote(alice, 1)).body).toEqual({ score: 1, myVote: 1 })
    expect((await vote(bob, 1)).body).toEqual({ score: 2, myVote: 1 })
    // Clicking up again clears Alice's vote rather than adding a second one.
    expect((await vote(alice, 1)).body).toEqual({ score: 1, myVote: 0 })
    // Switching Bob from up to down moves the score by two.
    expect((await vote(bob, -1)).body).toEqual({ score: -1, myVote: -1 })
  })

  it('rejects invalid votes', async () => {
    const post = await createPost(alice, community.id)
    const bad = await alice.post('/api/vote').send({ targetType: 'post', targetId: post.id, value: 5 })
    expect(bad.status).toBe(400)
    const missing = await alice.post('/api/vote').send({ targetType: 'post', targetId: 'p-missing', value: 1 })
    expect(missing.status).toBe(404)
  })

  it('nests replies under their parent and ranks top-level comments by score', async () => {
    const post = await createPost(alice, community.id)
    const first = (await alice.post(`/api/posts/${post.id}/comments`).send({ body: 'First' })).body.comments[0]
    let res = await bob.post(`/api/posts/${post.id}/comments`).send({ body: 'Second' })
    const second = res.body.comments.find((c) => c.body === 'Second')
    await bob.post(`/api/posts/${post.id}/comments`).send({ body: 'Reply to first', parentId: first.id })

    // Upvote the later comment so it should rise above the earlier one.
    await alice.post('/api/vote').send({ targetType: 'comment', targetId: second.id, value: 1 })

    res = await alice.get(`/api/posts/${post.id}`)
    expect(res.body.post.commentCount).toBe(3)
    const roots = res.body.comments
    expect(roots.map((c) => c.body)).toEqual(['Second', 'First'])
    expect(roots[1].replies.map((c) => c.body)).toEqual(['Reply to first'])
  })

  it('refuses a reply to a comment from a different post', async () => {
    const postA = await createPost(alice, community.id, 'A')
    const postB = await createPost(alice, community.id, 'B')
    const onA = (await alice.post(`/api/posts/${postA.id}/comments`).send({ body: 'on A' })).body.comments[0]
    const res = await alice.post(`/api/posts/${postB.id}/comments`).send({ body: 'sneaky', parentId: onA.id })
    expect(res.status).toBe(400)
  })

  // Idea #11
  it('rejects an unknown reaction type but accepts a real one', async () => {
    const post = await createPost(alice, community.id)
    const bad = await bob.post(`/api/posts/${post.id}/spark`).send({ kind: 'banana' })
    expect(bad.status).toBe(400)

    const good = await bob.post(`/api/posts/${post.id}/spark`).send({ kind: 'fire' })
    expect(good.status).toBe(200)
  })

  it('requires a title for community posts', async () => {
    const res = await alice.post('/api/posts').send({ communityId: community.id, title: '   ' })
    expect(res.status).toBe(400)
  })
})
