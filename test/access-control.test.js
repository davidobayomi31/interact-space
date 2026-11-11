// A sweep over the API's access rules. Every route that changes data or
// shows private data must refuse a signed-out request, and the admin and
// moderator tools must refuse an ordinary member. Cheap to run, and it
// catches a new route added without `requireAuth`.
import { describe, expect, it } from 'vitest'
import { app, request, signUp } from './helpers.js'

const SIGNED_IN_ONLY = [
  ['get', '/api/messages'],
  ['post', '/api/messages/u-anyone'],
  ['get', '/api/chats'],
  ['post', '/api/chats'],
  ['get', '/api/notifications'],
  ['get', '/api/me/export'],
  ['get', '/api/me/jobs'],
  ['patch', '/api/auth/me'],
  ['delete', '/api/auth/me'],
  ['get', '/api/auth/sessions'],
  ['post', '/api/posts'],
  ['post', '/api/posts/p-any/comments'],
  ['post', '/api/posts/p-any/spark'],
  ['post', '/api/posts/p-any/loom'],
  ['post', '/api/communities'],
  ['post', '/api/communities/c-any/join'],
  ['post', '/api/jobs'],
  ['post', '/api/jobs/j-any/interest'],
  ['post', '/api/statuses'],
  ['delete', '/api/statuses/st-any'],
  ['post', '/api/badges'],
  ['post', '/api/ads'],
  ['get', '/api/ads/mine'],
  ['post', '/api/users/u-any/follow'],
  ['post', '/api/users/u-any/connect'],
  ['post', '/api/businesses'],
  ['get', '/api/businesses/mine'],
  ['post', '/api/uploads'],
]

const ADMIN_ONLY = [
  ['get', '/api/admin/users'],
  ['get', '/api/admin/users.csv'],
  ['get', '/api/admin/accounts'],
  ['post', '/api/admin/accounts'],
]

describe('signed-out requests', () => {
  it.each(SIGNED_IN_ONLY)('%s %s → 401', async (method, path) => {
    const res = await request(app)[method](path).send({})
    expect(res.status).toBe(401)
  })
})

describe('admin tools', () => {
  it.each(ADMIN_ONLY)('%s %s → 403 for an ordinary member', async (method, path) => {
    const { agent } = await signUp()
    const res = await agent[method](path).send({})
    expect(res.status).toBe(403)
  })
})

describe('sessions', () => {
  it('a forged or tampered session cookie is treated as signed out', async () => {
    const forged = await request(app).get('/api/auth/me').set('Cookie', 'is_token=not-a-real-token')
    expect(forged.status).toBe(200)
    expect(forged.body.user).toBeNull()

    // Take a real token and change one character of its signature.
    const { agent } = await signUp()
    const login = await agent.get('/api/auth/me')
    expect(login.body.user).not.toBeNull()
    const real = (await request(app).post('/api/auth/register').send({ name: 'Cookie Check', email: `cookie-${Date.now()}@example.com`, password: 'correct-horse-battery' }))
      .headers['set-cookie'].find((c) => c.startsWith('is_token='))
    const token = real.split(';')[0].slice('is_token='.length)
    const tampered = token.slice(0, -2) + (token.at(-2) === 'a' ? 'b' : 'a') + token.at(-1)
    const res = await request(app).get('/api/auth/me').set('Cookie', `is_token=${tampered}`)
    expect(res.body.user).toBeNull()
    const ok = await request(app).get('/api/auth/me').set('Cookie', `is_token=${token}`)
    expect(ok.body.user).not.toBeNull()
  })
})
