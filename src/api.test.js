// The API client every page goes through: how it sends requests and how it
// turns a server error into a message the page can show.
import { describe, expect, it, vi } from 'vitest'
import * as api from './api.js'

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body)),
})

describe('api client', () => {
  it('sends JSON to /api with the session cookie and returns the user', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(200, { user: { id: 'u-1', name: 'Ada' } }))
    const user = await api.login({ email: 'ada@example.com', password: 'pw' })
    expect(user).toEqual({ id: 'u-1', name: 'Ada' })
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(opts).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse(opts.body)).toEqual({ email: 'ada@example.com', password: 'pw' })
  })

  it('uses GET with no body by default', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(200, { user: null }))
    await api.me()
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', body: undefined })
  })

  it('throws the server’s own error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(401, { error: 'Wrong email or password.' }))
    await expect(api.login({ email: 'x', password: 'y' })).rejects.toThrow('Wrong email or password.')
  })

  it('falls back to a friendly message when the error has no body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(502))
    await expect(api.me()).rejects.toThrow('Something went wrong.')
  })

  it('lets a network failure surface instead of hanging', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.me()).rejects.toThrow('Failed to fetch')
  })
})
