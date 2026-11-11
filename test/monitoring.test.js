// Monitoring: the health endpoint really checks the database (200 when it
// answers, 503 when it doesn't, without leaking connection details), and a
// failed request leaves exactly one searchable JSON log line.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app, request } from './helpers.js'
import { pool } from '../server/db.js'
import { checkDatabase, errorHandler } from '../server/monitoring.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// Capture console.error and return the JSON log lines written to it.
const captureErrorLog = () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  return () => spy.mock.calls.map(([line]) => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
}

describe('GET /api/health', () => {
  it('reports healthy, with database latency, when the database answers', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '0123456789abcdef0123456789abcdef01234567')
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', ok: true, db: { ok: true }, commit: '0123456' })
    expect(res.body.db.latencyMs).toBeGreaterThanOrEqual(0)
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+/)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['x-request-id']).toBeTruthy()
  })

  it('answers 503 when the database is unreachable, without leaking the driver error', async () => {
    const readLog = captureErrorLog()
    vi.spyOn(pool, 'query').mockRejectedValueOnce(
      Object.assign(new Error('connect ECONNREFUSED 10.1.2.3:5432 for user admin password=hunter2'), { code: 'ECONNREFUSED' }),
    )
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ status: 'error', ok: false, db: { ok: false, error: 'unreachable' } })
    const body = JSON.stringify(res.body)
    for (const secret of ['hunter2', '10.1.2.3', 'admin', process.env.DATABASE_URL]) expect(body).not.toContain(secret)

    // The detail is in the server log instead, tied to the request id.
    const line = readLog().find((l) => l.event === 'health_db_down')
    expect(line).toMatchObject({ level: 'error', requestId: res.headers['x-request-id'], error: { code: 'ECONNREFUSED' } })
  })

  it('answers 503 when the database takes longer than the timeout', async () => {
    captureErrorLog()
    vi.stubEnv('HEALTH_DB_TIMEOUT_MS', '50')
    vi.spyOn(pool, 'query').mockImplementationOnce(() => new Promise(() => {}))
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body.db).toMatchObject({ ok: false, error: 'timeout' })
  })
})

describe('checkDatabase', () => {
  it('returns ok with a latency when the query resolves', async () => {
    const result = await checkDatabase(async () => ({ rows: [{ '?column?': 1 }] }), 1000)
    expect(result.ok).toBe(true)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })
  it('never throws: a failing query comes back as ok: false', async () => {
    const result = await checkDatabase(async () => { throw new Error('boom') }, 1000)
    expect(result).toMatchObject({ ok: false, error: { message: 'boom' } })
  })
})

describe('structured error logs', () => {
  it('logs one JSON line for an unhandled error, with method, route, status, duration and request id', async () => {
    await request(app).get('/api/communities') // set up the schema before breaking the database
    const readLog = captureErrorLog()
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('relation "communities" does not exist'))

    const res = await request(app).get('/api/communities?code=oauth-secret')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Something went wrong on our end.', requestId: res.headers['x-request-id'] })

    const lines = readLog().filter((l) => l.event === 'request_failed')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      level: 'error',
      requestId: res.headers['x-request-id'],
      method: 'GET',
      route: '/api/communities',
      path: '/api/communities',
      status: 500,
      error: { name: 'Error', message: 'relation "communities" does not exist' },
    })
    expect(lines[0].durationMs).toBeGreaterThanOrEqual(0)
    expect(JSON.stringify(lines[0])).not.toContain('oauth-secret') // query strings are never logged
  })

  it('does not log ordinary 4xx responses', async () => {
    const readLog = captureErrorLog()
    const res = await request(app).get('/api/posts/p-does-not-exist')
    expect(res.status).toBe(404)
    expect(readLog().filter((l) => l.event === 'request_failed')).toEqual([])
  })

  it('reuses a well-formed incoming request id and replaces a malformed one', async () => {
    const kept = await request(app).get('/api/health').set('X-Request-Id', 'dub1::abc-123')
    expect(kept.headers['x-request-id']).toBe('dub1::abc-123')
    const replaced = await request(app).get('/api/health').set('X-Request-Id', 'bad id "with" spaces')
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('hands an error to Express when the response has already started', () => {
    const readLog = captureErrorLog()
    const next = vi.fn()
    const error = new Error('stream broke')
    errorHandler(error, { id: 'r-1', method: 'GET', path: '/api/x' }, { headersSent: true, locals: {} }, next)
    expect(next).toHaveBeenCalledWith(error)
    expect(readLog()[0]).toMatchObject({ event: 'unhandled_error_after_headers', requestId: 'r-1', error: { message: 'stream broke' } })
  })
})
