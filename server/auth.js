// ── Authentication ───────────────────────────────────────────────────
// Email + password accounts. Passwords are bcrypt-hashed; sessions are a
// signed JWT delivered in an httpOnly cookie so the token is never exposed
// to page JavaScript.
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getUserById } from './db.js'

const SECRET = process.env.JWT_SECRET || 'interact-space-dev-secret-change-me'
const COOKIE = 'is_token'
const MAX_AGE = 30 * 24 * 3600 * 1000 // 30 days
const IS_PRODUCTION = !!process.env.VERCEL || process.env.NODE_ENV === 'production'

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10)
export const checkPassword = (pw, hash) => bcrypt.compareSync(pw, hash)

export function issueSession(res, userId) {
  const token = jwt.sign({ uid: userId }, SECRET, { expiresIn: '30d' })
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', maxAge: MAX_AGE, path: '/',
    // Over HTTPS the session cookie should never be sent in the clear.
    // Local development is plain http://localhost, where Secure would stop
    // the cookie being stored at all.
    secure: IS_PRODUCTION,
  })
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' })
}

// Populate req.userRow (or null) from the session cookie on every request.
export async function attachUser(req, _res, next) {
  req.userRow = null
  req.userId = null
  const token = req.cookies?.[COOKIE]
  if (token) {
    try {
      const { uid } = jwt.verify(token, SECRET)
      const row = await getUserById(uid)
      if (row) { req.userRow = row; req.userId = uid }
    } catch { /* invalid/expired token → treated as logged out */ }
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Sign in to do that.' })
  next()
}
