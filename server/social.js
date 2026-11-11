// ── Sign in with Google and Apple ────────────────────────────────────
// Nuel, Nov 9: "Include google and apple signin."
//
// Both use the OAuth authorization-code flow: the browser goes to Google
// or Apple, comes back to our callback with a one-time code, and the
// server swaps that code for an ID token directly with the provider over
// TLS. Because the token comes straight from the provider's token endpoint
// (never through the browser), OpenID Connect lets us trust its claims
// without checking the signature; we still check who it was issued for.
//
// Each provider switches itself on when its keys are set (see .env.example).
// Without them the buttons say "Not set up yet" and these routes refuse.
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const env = (k) => (process.env[k] || '').trim()

export const providers = () => ({
  google: !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
  apple: !!(env('APPLE_CLIENT_ID') && env('APPLE_TEAM_ID') && env('APPLE_KEY_ID') && env('APPLE_PRIVATE_KEY')),
})

// Where the provider sends people back to. PUBLIC_URL wins (set it in
// production); otherwise it's the address this request came in on, which
// is the Vite dev server locally because its proxy keeps the Host header.
export function baseUrl(req) {
  if (env('PUBLIC_URL')) return env('PUBLIC_URL').replace(/\/$/, '')
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0]
  return `${proto}://${req.get('host')}`
}
export const callbackUrl = (req, provider) => `${baseUrl(req)}/api/auth/${provider}/callback`

// A random state value, kept in a short-lived cookie, proves the callback
// belongs to a sign-in this browser started (stops login CSRF). Apple
// posts its callback from appleid.apple.com, a cross-site POST, so its
// cookie has to be SameSite=None (which browsers only accept with Secure).
const STATE_COOKIE = 'vj_oauth_state'
export function newState(res, provider, secure) {
  const state = `${provider}.${crypto.randomBytes(18).toString('base64url')}`
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true, path: '/api/auth', maxAge: 10 * 60 * 1000,
    sameSite: provider === 'apple' ? 'none' : 'lax',
    secure: provider === 'apple' ? true : secure,
  })
  return state
}
export function checkState(req, res, provider, got) {
  const want = req.cookies?.[STATE_COOKIE]
  res.clearCookie(STATE_COOKIE, { path: '/api/auth' })
  if (!want || !got || want !== got || !want.startsWith(`${provider}.`)) return false
  return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(String(got)))
}

// ── Google ───────────────────────────────────────────────────────────
export function googleAuthUrl(req, state) {
  const p = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    redirect_uri: callbackUrl(req, 'google'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

export async function googleProfile(req, code) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: callbackUrl(req, 'google'), grant_type: 'authorization_code',
    }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || !body.id_token) throw new Error('Google didn’t confirm that sign-in.')
  const claims = jwt.decode(body.id_token) || {}
  if (claims.aud !== env('GOOGLE_CLIENT_ID') || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) {
    throw new Error('That Google sign-in wasn’t meant for VOIDAJ.')
  }
  return {
    sub: String(claims.sub),
    email: claims.email && claims.email_verified !== false ? String(claims.email).toLowerCase() : null,
    name: claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || '',
    photo: claims.picture || '',
  }
}

// ── Apple ────────────────────────────────────────────────────────────
export function appleAuthUrl(req, state) {
  const p = new URLSearchParams({
    client_id: env('APPLE_CLIENT_ID'),
    redirect_uri: callbackUrl(req, 'apple'),
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  })
  return `https://appleid.apple.com/auth/authorize?${p}`
}

// Apple has no fixed client secret: it's a short JWT signed with the
// private key from the Apple developer account (Keys → Sign in with Apple).
function appleClientSecret() {
  const key = env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n')
  return jwt.sign({}, key, {
    algorithm: 'ES256', keyid: env('APPLE_KEY_ID'), issuer: env('APPLE_TEAM_ID'),
    audience: 'https://appleid.apple.com', subject: env('APPLE_CLIENT_ID'), expiresIn: '5m',
  })
}

// `userJson` is the "user" field Apple posts back the first time someone
// signs in, and only then: it's the one chance to get their name.
export async function appleProfile(req, code, userJson) {
  const r = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env('APPLE_CLIENT_ID'), client_secret: appleClientSecret(),
      redirect_uri: callbackUrl(req, 'apple'), grant_type: 'authorization_code',
    }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || !body.id_token) throw new Error('Apple didn’t confirm that sign-in.')
  const claims = jwt.decode(body.id_token) || {}
  if (claims.aud !== env('APPLE_CLIENT_ID') || claims.iss !== 'https://appleid.apple.com') {
    throw new Error('That Apple sign-in wasn’t meant for VOIDAJ.')
  }
  let name = ''
  try {
    const u = typeof userJson === 'string' ? JSON.parse(userJson) : userJson
    name = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(' ')
  } catch { /* no name sent: not the first sign-in */ }
  const verified = claims.email_verified === true || claims.email_verified === 'true'
  return { sub: String(claims.sub), email: claims.email && verified ? String(claims.email).toLowerCase() : null, name, photo: '' }
}
