// Sign in with Google (Nuel, Nov 9). Google's token endpoint is mocked:
// the test stands in for Google and hands back an ID token.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { app, request, signUp } from './helpers.js'

const CLIENT_ID = 'test-client.apps.googleusercontent.com'

function googleReturns(claims) {
  const idToken = jwt.sign({ iss: 'https://accounts.google.com', aud: CLIENT_ID, email_verified: true, ...claims }, 'not-checked')
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id_token: idToken }), { status: 200 }))
}

// Start a sign-in, then come back from "Google" with that state.
async function signInWithGoogle(agent, { stateOverride } = {}) {
  const start = await agent.get('/api/auth/google/start')
  expect(start.status).toBe(302)
  const url = new URL(start.headers.location)
  expect(url.host).toBe('accounts.google.com')
  const state = stateOverride ?? url.searchParams.get('state')
  return agent.get(`/api/auth/google/callback?code=one-time-code&state=${encodeURIComponent(state)}`)
}

describe('Sign in with Google', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
  })

  it('is off, and says so, until its keys are set', async () => {
    const providers = await request(app).get('/api/auth/providers')
    expect(providers.body).toEqual({ google: false, apple: false })
    const start = await request(app).get('/api/auth/google/start')
    expect(start.status).toBe(302)
    expect(start.headers.location).toMatch(/\/auth\?error=/)
  })

  describe('with keys set', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = CLIENT_ID
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    })

    it('creates an account with no password and signs the person in', async () => {
      const agent = request.agent(app)
      const sub = crypto.randomUUID()
      const email = `g-${sub.slice(0, 8)}@gmail.com`
      googleReturns({ sub, email, name: 'Ada Lovelace' })

      const back = await signInWithGoogle(agent)
      expect(back.status).toBe(302)
      expect(back.headers.location).toMatch(/\/welcome$/)

      const me = (await agent.get('/api/auth/me')).body.user
      expect(me).toMatchObject({ name: 'Ada Lovelace', email, hasPassword: false, linked: { google: true, apple: false } })

      // The same Google account lands in the same VOIDAJ account next time.
      googleReturns({ sub, email, name: 'Ada Lovelace' })
      const again = request.agent(app)
      await signInWithGoogle(again)
      expect((await again.get('/api/auth/me')).body.user.id).toBe(me.id)
    })

    it('links to an existing email account instead of making a second one', async () => {
      const { user, email } = await signUp('Email Person')
      googleReturns({ sub: crypto.randomUUID(), email, name: 'Someone Else' })
      const agent = request.agent(app)
      await signInWithGoogle(agent)
      const me = (await agent.get('/api/auth/me')).body.user
      expect(me.id).toBe(user.id)
      expect(me.name).toBe('Email Person')
      expect(me.linked.google).toBe(true)
    })

    it('lets a Google-only account set its first password without a current one', async () => {
      const agent = request.agent(app)
      const sub = crypto.randomUUID()
      googleReturns({ sub, email: `p-${sub.slice(0, 8)}@gmail.com`, name: 'No Password' })
      await signInWithGoogle(agent)
      vi.restoreAllMocks()
      const set = await agent.post('/api/auth/password').send({ next: 'a-new-password' })
      expect(set.status).toBe(200)
      expect((await agent.get('/api/auth/me')).body.user.hasPassword).toBe(true)
    })

    it('refuses a callback whose state this browser did not start', async () => {
      googleReturns({ sub: crypto.randomUUID(), email: 'x@gmail.com' })
      const agent = request.agent(app)
      const back = await signInWithGoogle(agent, { stateOverride: 'google.forged' })
      expect(back.headers.location).toMatch(/\/auth\?mode=login&error=/)
      expect((await agent.get('/api/auth/me')).body.user).toBeNull()
    })

    it('refuses a token that was issued to a different app', async () => {
      const spy = googleReturns({ sub: crypto.randomUUID(), email: 'y@gmail.com' })
      spy.mockResolvedValue(new Response(JSON.stringify({
        id_token: jwt.sign({ iss: 'https://accounts.google.com', aud: 'someone-else', sub: 'z' }, 'k'),
      }), { status: 200 }))
      const agent = request.agent(app)
      const back = await signInWithGoogle(agent)
      expect(decodeURIComponent(back.headers.location)).toMatch(/wasn’t meant for VOIDAJ/)
      expect((await agent.get('/api/auth/me')).body.user).toBeNull()
    })
  })
})
