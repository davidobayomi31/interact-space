import crypto from 'crypto'
import request from 'supertest'
import app from '../server/index.js'

export { app, request }

const unique = () => crypto.randomUUID().slice(0, 8)

// A signed-in user. The Supertest agent keeps the session cookie, so every
// request made through `agent` is made as this user.
export async function signUp(name = 'Test User') {
  const agent = request.agent(app)
  const email = `user-${unique()}@example.com`
  const password = 'correct-horse-battery'
  const res = await agent.post('/api/auth/register').send({ name, email, password })
  if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent, user: res.body.user, email, password }
}

export async function createCommunity(agent, name = `Community ${unique()}`) {
  const res = await agent.post('/api/communities').send({ name, tags: ['testing'] })
  if (res.status !== 200) throw new Error(`create community failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.community
}

export async function createPost(agent, communityId, title = 'A test discussion') {
  const res = await agent.post('/api/posts').send({ communityId, title, body: 'Body text' })
  if (res.status !== 200) throw new Error(`create post failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.post
}
