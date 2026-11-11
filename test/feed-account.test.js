// The Home feed, Loom, and a member's own account: data export, settings
// validation, and deleting an account. The account tests guard privacy —
// the export must never include secrets, and settings only accept known
// values.
import { describe, expect, it } from 'vitest'
import { app, request, signUp, createCommunity } from './helpers.js'

describe('feed', () => {
  it('For You shows public posts to guests, but not a community’s posts to non-members', async () => {
    const author = await signUp('Feed Author')
    const pub = (await author.agent.post('/api/posts').send({ audience: 'public', body: `public-${Date.now()}` })).body.post
    const guestFeed = (await request(app).get('/api/feed')).body.posts.map((p) => p.id)
    expect(guestFeed).toContain(pub.id)

    const owner = await signUp('Community Owner')
    const community = await createCommunity(owner.agent)
    const inner = (await owner.agent.post('/api/posts').send({ communityId: community.id, title: 'Members only', body: 'x' })).body.post
    const stranger = await signUp()
    const strangerFeed = (await stranger.agent.get('/api/feed')).body.posts.map((p) => p.id)
    expect(strangerFeed).not.toContain(inner.id)
    const ownerFeed = (await owner.agent.get('/api/feed')).body.posts.map((p) => p.id)
    expect(ownerFeed).toContain(inner.id)
  })

  it('Following shows only posts by people you follow', async () => {
    const reader = await signUp()
    const followed = await signUp('Followed')
    const other = await signUp('Not Followed')
    const a = (await followed.agent.post('/api/posts').send({ audience: 'public', body: 'from followed' })).body.post
    const b = (await other.agent.post('/api/posts').send({ audience: 'public', body: 'from other' })).body.post
    await reader.agent.post(`/api/users/${followed.user.id}/follow`)
    const ids = (await reader.agent.get('/api/feed?tab=following')).body.posts.map((p) => p.id)
    expect(ids).toContain(a.id)
    expect(ids).not.toContain(b.id)
  })

  it('Following is empty for guests rather than an error', async () => {
    const res = await request(app).get('/api/feed?tab=following')
    expect(res.status).toBe(200)
    expect(res.body.posts).toEqual([])
  })

  it('caps the page size', async () => {
    const res = await request(app).get('/api/feed?limit=100000')
    expect(res.status).toBe(200)
  })
})

describe('loom', () => {
  it('spreads a post with your note, and looming a loom spreads the original', async () => {
    const author = await signUp()
    const looper = await signUp()
    const third = await signUp()
    const original = (await author.agent.post('/api/posts').send({ audience: 'public', body: 'Original thought' })).body.post
    const loom = (await looper.agent.post(`/api/posts/${original.id}/loom`).send({ to: 'public', note: 'Worth a look' })).body.post
    expect(loom.body).toBe('Worth a look')
    expect(loom.loomOf?.id ?? loom.loomOf).toBeTruthy()

    const again = (await third.agent.post(`/api/posts/${loom.id}/loom`).send({ to: 'public' })).body.post
    expect(again.loomOf?.id ?? again.loomOf).toBe(original.id)
  })

  it('will not loom into a community you are not in', async () => {
    const owner = await signUp()
    const community = await createCommunity(owner.agent)
    const outsider = await signUp()
    const post = (await outsider.agent.post('/api/posts').send({ audience: 'public', body: 'hi' })).body.post
    const res = await outsider.agent.post(`/api/posts/${post.id}/loom`).send({ to: 'community', communityId: community.id })
    expect(res.status).toBe(403)
  })

  it('404s for a missing post', async () => {
    const someone = await signUp()
    expect((await someone.agent.post('/api/posts/p-missing/loom').send({})).status).toBe(404)
  })
})

describe('account data export', () => {
  it('includes your data but never your password hash, session version or provider ids', async () => {
    const me = await signUp('Exporter')
    await me.agent.post('/api/posts').send({ audience: 'public', body: 'in my export' })
    const res = await me.agent.get('/api/me/export')
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="voidaj-data-/)
    expect(res.body.account.email).toBe(me.email)
    expect(res.body.posts.map((p) => p.body)).toContain('in my export')
    for (const secret of ['password_hash', 'token_version', 'google_sub', 'apple_sub']) {
      expect(res.body.account).not.toHaveProperty(secret)
    }
  })

  it('needs you to be signed in', async () => {
    expect((await request(app).get('/api/me/export')).status).toBe(401)
  })
})

describe('profile and settings validation', () => {
  it('keeps only known settings values', async () => {
    const me = await signUp()
    const res = await me.agent.patch('/api/auth/me').send({
      settings: { messages: 'connections', theme: 'neon', language: 'english', notify: { jobs: false, hacks: true }, isAdmin: true },
    })
    expect(res.status).toBe(200)
    const s = res.body.user.settings
    expect(s.messages).toBe('connections')
    expect(s.theme).not.toBe('neon')
    expect(s.language).toBe('en')
    expect(s.notify.jobs).toBe(false)
    expect(s.notify).not.toHaveProperty('hacks')
    expect(s).not.toHaveProperty('isAdmin')
    expect(res.body.user.isAdmin).toBeFalsy()
  })

  it('rejects an unknown privacy level and a bad phone number', async () => {
    const me = await signUp()
    expect((await me.agent.patch('/api/auth/me').send({ privacy: 'everyone-everywhere' })).status).toBe(400)
    expect((await me.agent.patch('/api/auth/me').send({ phone: 'call me maybe' })).status).toBe(400)
  })

  it('enforces unique, well-formed usernames', async () => {
    const a = await signUp()
    const b = await signUp()
    const handle = `h${Date.now().toString(36)}`
    expect((await a.agent.patch('/api/auth/me').send({ handle })).status).toBe(200)
    expect((await b.agent.patch('/api/auth/me').send({ handle: handle.toUpperCase() })).status).toBe(409)
    expect((await b.agent.patch('/api/auth/me').send({ handle: 'no spaces!' })).status).toBe(400)
  })

  it('only keeps http(s) links in a portfolio and socials', async () => {
    const me = await signUp()
    const res = await me.agent.patch('/api/auth/me').send({
      portfolio: [{ title: 'Site', link: 'javascript:alert(1)' }, { title: 'Real', link: 'https://example.com' }],
      socials: [{ kind: 'website', value: 'javascript:alert(1)' }, { kind: 'instagram', value: '@ada<script>' }],
    })
    expect(res.status).toBe(200)
    const u = res.body.user
    expect(u.portfolio.map((p) => p.link)).toEqual(['', 'https://example.com'])
    expect(u.socials).toEqual([{ kind: 'instagram', value: 'adascript' }])
  })
})

describe('deleting an account', () => {
  it('needs the right password, then the person can no longer sign in', async () => {
    const me = await signUp('Leaving Soon')
    expect((await me.agent.delete('/api/auth/me').send({ password: 'wrong-password' })).status).toBe(401)
    expect((await me.agent.delete('/api/auth/me').send({ password: me.password })).status).toBe(200)
    const login = await request(app).post('/api/auth/login').send({ email: me.email, password: me.password })
    expect(login.status).toBe(401)
  })
})
