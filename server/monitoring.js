// ── Monitoring ───────────────────────────────────────────────────────
// Three small pieces, no dependencies:
// - a health check that actually asks the database something,
// - one JSON log line per failed (5xx) request, so failures can be found by
//   searching Vercel's runtime logs (e.g. for "request_failed" or a request id),
// - a request id on every response (X-Request-Id), to tie a user's report to
//   its log line.
// The scheduled check that calls the health endpoint and alerts lives in
// .github/workflows/uptime.yml.
import crypto from 'crypto'
import { createRequire } from 'module'

// Version and commit, for the health response. VERCEL_GIT_COMMIT_SHA is one of
// Vercel's system environment variables; locally there is none.
let version = null
try {
  version = createRequire(import.meta.url)('../package.json').version
} catch { /* not fatal: health just reports no version */ }
const commit = () => (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null

// One line of JSON on stdout/stderr. Vercel keeps each line as one log entry,
// and console.error lines are marked as errors there.
export function logJson(level, event, fields = {}) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

// Vercel puts its own request id in x-vercel-id; reusing it means our log
// line and Vercel's request log share an id. Anything client-supplied is
// trimmed to a safe shape so it can't inject into the log.
const SAFE_ID = /^[\w:.-]{1,128}$/
const requestIdFor = (req) => {
  const given = req.get('x-vercel-id') || req.get('x-request-id')
  return given && SAFE_ID.test(given) ? given : crypto.randomUUID()
}

// The route pattern (/api/posts/:id) rather than the concrete URL groups
// failures of the same route together. The query string is never logged: it
// can carry OAuth codes.
const routeOf = (req) => (req.route ? `${req.baseUrl || ''}${req.route.path}` : null)

export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint()
  req.id = requestIdFor(req)
  res.set('X-Request-Id', req.id)
  res.on('finish', () => {
    if (res.statusCode < 500) return
    const error = res.locals.error
    logJson('error', 'request_failed', {
      requestId: req.id,
      method: req.method,
      route: routeOf(req),
      path: req.path,
      status: res.statusCode,
      durationMs: Number((process.hrtime.bigint() - start) / 1_000_000n),
      ...(error && { error: { name: error.name, message: error.message, stack: error.stack } }),
    })
  })
  next()
}

// Express error handler. The details go into the log line (via res.locals);
// the client only gets a generic message and the request id to quote.
export function errorHandler(error, req, res, next) {
  res.locals.error = error
  if (res.headersSent) {
    // Too late to send a clean error: log now, and let Express close the
    // connection instead of leaving it hanging.
    logJson('error', 'unhandled_error_after_headers', {
      requestId: req.id, method: req.method, route: routeOf(req), path: req.path,
      error: { name: error.name, message: error.message, stack: error.stack },
    })
    return next(error)
  }
  res.status(500).json({ error: 'Something went wrong on our end.', requestId: req.id })
}

// Run a cheap query against the database, giving up after timeoutMs. Never
// throws; reports what happened. A timed-out query is left to finish (or
// fail) on its own; the pool's own timeouts clean it up.
export async function checkDatabase(query, timeoutMs) {
  const start = Date.now()
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`no answer within ${timeoutMs} ms`), { code: 'HEALTH_TIMEOUT' })), timeoutMs)
  })
  try {
    await Promise.race([query('SELECT 1'), timeout])
    return { ok: true, latencyMs: Date.now() - start }
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - start, error }
  } finally {
    clearTimeout(timer)
  }
}

const DEFAULT_DB_TIMEOUT_MS = 3000

// GET /api/health. 200 when the database answers, 503 when it doesn't, so an
// uptime checker only has to look at the status code. The body says nothing
// secret: no connection string, hostnames or error text from the driver.
export const healthHandler = (pool) => async (req, res) => {
  const timeoutMs = Number(process.env.HEALTH_DB_TIMEOUT_MS) || DEFAULT_DB_TIMEOUT_MS
  const db = await checkDatabase((sql) => pool.query(sql), timeoutMs)
  if (!db.ok) {
    logJson('error', 'health_db_down', {
      requestId: req.id,
      latencyMs: db.latencyMs,
      error: { name: db.error.name, code: db.error.code, message: db.error.message },
    })
  }
  res.set('Cache-Control', 'no-store')
  res.status(db.ok ? 200 : 503).json({
    status: db.ok ? 'ok' : 'error',
    ok: db.ok,
    db: db.ok
      ? { ok: true, latencyMs: db.latencyMs }
      : { ok: false, latencyMs: db.latencyMs, error: db.error.code === 'HEALTH_TIMEOUT' ? 'timeout' : 'unreachable' },
    llm: !!process.env.ANTHROPIC_API_KEY,
    version,
    commit: commit(),
    time: new Date().toISOString(),
  })
}
