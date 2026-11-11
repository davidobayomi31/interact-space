// Unit tests for the server's pure helpers: no HTTP and no database rows,
// just inputs and outputs. These pin down rules other code relies on —
// what location a member shows, how levels are named, how a promotion's
// reach is estimated, and that an OAuth callback only passes with the state
// this browser was given.
import { describe, expect, it, vi } from 'vitest'
import { timeAgo, visibleLocation, publicUser, levelTitle, LEVELS, DEFAULT_TITLE, isActive, readSettings, DEFAULT_SETTINGS } from '../../server/db.js'
import { estimateReach, PROMOTION } from '../../server/business.js'
import { checkState, newState } from '../../server/social.js'
import { hashPassword, checkPassword } from '../../server/auth.js'

describe('timeAgo', () => {
  const ago = (ms) => timeAgo(Date.now() - ms)
  it('counts seconds, minutes, hours, days, weeks and months', () => {
    expect(ago(5_000)).toBe('5s')
    expect(ago(3 * 60_000)).toBe('3m')
    expect(ago(2 * 3_600_000)).toBe('2h')
    expect(ago(3 * 86_400_000)).toBe('3d')
    expect(ago(14 * 86_400_000)).toBe('2w')
    expect(ago(90 * 86_400_000)).toBe('3mo')
  })
  it('never says 0s, even for a time in the future', () => {
    expect(ago(0)).toBe('1s')
    expect(timeAgo(Date.now() + 60_000)).toBe('1s')
  })
})

describe('visibleLocation (location privacy)', () => {
  const row = { city: 'Lagos', area: 'Yaba' }
  it('hidden shows nothing', () => expect(visibleLocation({ ...row, privacy: 'hidden' })).toEqual({ city: null, area: null }))
  it('city-only hides the area', () => expect(visibleLocation({ ...row, privacy: 'city-only' })).toEqual({ city: 'Lagos', area: null }))
  it('exact shows both', () => expect(visibleLocation({ ...row, privacy: 'exact' })).toEqual({ city: 'Lagos', area: 'Yaba' }))
  it('no setting defaults to city-only, the safer choice', () => expect(visibleLocation(row)).toEqual({ city: 'Lagos', area: null }))
})

describe('publicUser', () => {
  const row = {
    id: 'u-1', name: 'Ada', handle: '@ada', title: DEFAULT_TITLE, citizen_level: 2, privacy: 'hidden', city: 'Lagos', area: 'Yaba',
    email: 'ada@example.com', password_hash: 'secret-hash', google_sub: 'g-1', interests: '["tech"]', socials: 'not json',
  }
  it('never exposes email, password hash or sign-in provider ids', () => {
    const u = publicUser(row)
    expect(u).not.toHaveProperty('email')
    expect(u).not.toHaveProperty('password_hash')
    expect(u).not.toHaveProperty('google_sub')
    expect(JSON.stringify(u)).not.toContain('secret-hash')
  })
  it('follows the member’s location privacy', () => {
    expect(publicUser(row)).toMatchObject({ city: null, area: null })
  })
  it('shows the level title in place of the default title', () => {
    expect(publicUser(row).title).toBe(levelTitle(2))
    expect(publicUser({ ...row, title: 'Baker' }).title).toBe('Baker')
  })
  it('survives bad JSON in stored lists', () => {
    const u = publicUser(row)
    expect(u.interests).toEqual(['tech'])
    expect(u.socials).toEqual([])
  })
  it('returns null for a missing row', () => expect(publicUser(null)).toBeNull())
})

describe('levelTitle', () => {
  it('names each level', () => expect(levelTitle(0)).toBe('New Citizen of VOIDAJ'))
  it('clamps out-of-range levels instead of crashing', () => {
    expect(levelTitle(-3)).toBe(`${LEVELS[0].name} of VOIDAJ`)
    expect(levelTitle(99)).toBe(`${LEVELS.at(-1).name} of VOIDAJ`)
    expect(levelTitle(undefined)).toBe(`${LEVELS[0].name} of VOIDAJ`)
  })
})

describe('isActive', () => {
  it('is true only within the last few minutes', () => {
    expect(isActive({ last_seen_at: Date.now() - 60_000 })).toBe(true)
    expect(isActive({ last_seen_at: Date.now() - 60 * 60_000 })).toBe(false)
    expect(isActive({})).toBe(false)
    expect(isActive(null)).toBe(false)
  })
})

describe('readSettings', () => {
  it('fills in defaults for a member with no saved settings', () => expect(readSettings({})).toEqual(DEFAULT_SETTINGS))
  it('merges saved values over defaults, including nested notify flags', () => {
    const s = readSettings({ settings: JSON.stringify({ messages: 'nobody', notify: { jobs: false } }) })
    expect(s.messages).toBe('nobody')
    expect(s.notify).toEqual({ ...DEFAULT_SETTINGS.notify, jobs: false })
  })
  it('falls back to defaults when stored JSON is broken', () => expect(readSettings({ settings: '{oops' })).toEqual(DEFAULT_SETTINGS))
})

describe('estimateReach (Promote Post)', () => {
  it('matches the mockup: ₦15,000 for 7 days nearby is 8,000–25,000', () => {
    expect(estimateReach({ budget: 15000, days: 7, audience: 'nearby' })).toEqual({ low: 8000, high: 25000 })
  })
  it('grows with budget, days and audience', () => {
    const base = estimateReach({ budget: 5000, days: 3, audience: 'city' })
    expect(estimateReach({ budget: 30000, days: 3, audience: 'city' }).low).toBeGreaterThan(base.low)
    expect(estimateReach({ budget: 5000, days: 14, audience: 'city' }).low).toBeGreaterThan(base.low)
    expect(estimateReach({ budget: 5000, days: 3, audience: 'nigeria' }).low).toBeGreaterThan(base.low)
  })
  it('always gives a low below the high, rounded to 500, never under 500', () => {
    for (const budget of PROMOTION.budgets) for (const days of PROMOTION.days) for (const a of PROMOTION.audiences) {
      const r = estimateReach({ budget, days, audience: a.id })
      expect(r.low).toBeGreaterThanOrEqual(500)
      expect(r.high).toBeGreaterThan(r.low)
      expect(r.low % 500).toBe(0)
      expect(r.high % 500).toBe(0)
    }
  })
  it('treats an unknown audience like "nearby"', () => {
    expect(estimateReach({ budget: 15000, days: 7, audience: 'mars' })).toEqual(estimateReach({ budget: 15000, days: 7, audience: 'nearby' }))
  })
})

describe('OAuth state (login CSRF protection)', () => {
  const fakeRes = () => ({ cookie: vi.fn(), clearCookie: vi.fn() })
  it('accepts the state it issued, once', () => {
    const res = fakeRes()
    const state = newState(res, 'google', false)
    expect(state.startsWith('google.')).toBe(true)
    const req = { cookies: { vj_oauth_state: state } }
    expect(checkState(req, fakeRes(), 'google', state)).toBe(true)
  })
  it('rejects a missing, different, or other-provider state', () => {
    const state = newState(fakeRes(), 'google', false)
    expect(checkState({ cookies: {} }, fakeRes(), 'google', state)).toBe(false)
    expect(checkState({ cookies: { vj_oauth_state: state } }, fakeRes(), 'google', state + 'x')).toBe(false)
    expect(checkState({ cookies: { vj_oauth_state: state } }, fakeRes(), 'apple', state)).toBe(false)
    expect(checkState({ cookies: { vj_oauth_state: state } }, fakeRes(), 'google', undefined)).toBe(false)
  })
  it('always clears the cookie so a state can’t be replayed', () => {
    const res = fakeRes()
    checkState({ cookies: {} }, res, 'google', 'x')
    expect(res.clearCookie).toHaveBeenCalled()
  })
  it('Apple’s cookie is SameSite=None and Secure (its callback is a cross-site POST)', () => {
    const res = fakeRes()
    newState(res, 'apple', false)
    expect(res.cookie.mock.calls[0][2]).toMatchObject({ sameSite: 'none', secure: true, httpOnly: true })
  })
})

describe('passwords', () => {
  it('checks a password against its hash', () => {
    const hash = hashPassword('correct-horse')
    expect(hash).not.toContain('correct-horse')
    expect(checkPassword('correct-horse', hash)).toBe(true)
    expect(checkPassword('wrong', hash)).toBe(false)
  })
  it('never accepts any password for an account without one (Google/Apple-only)', () => {
    expect(checkPassword('anything', null)).toBe(false)
    expect(checkPassword('', '')).toBe(false)
  })
})
