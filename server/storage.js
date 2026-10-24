// ── Photo storage (Supabase Storage) ─────────────────────────────────
// Cover photos for communities and events go to a public Supabase Storage
// bucket; the database keeps only the photo's public link. The browser has
// already shrunk the photo to a JPEG of a few hundred KB (compressPhoto in
// src/components/Media.jsx), so it arrives here as a data URL.
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example). The
// service key stays on the server — it never reaches the browser.
import crypto from 'crypto'

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = process.env.SUPABASE_BUCKET || 'covers'
const MAX_BYTES = 5 * 1024 * 1024
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export const storageReady = () => !!(SUPABASE_URL && SERVICE_KEY)
export const publicPrefix = () => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`

// Parses and checks a data URL: one of the allowed image types, under the
// size cap. Returns { type, bytes } or throws with a message for the member.
export function readImage(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!m || !TYPES[m[1]]) throw new Error('Photos must be JPG, PNG or WebP.')
  const bytes = Buffer.from(m[2], 'base64')
  if (bytes.length > MAX_BYTES) throw new Error('That photo is too large (5MB max).')
  return { type: m[1], bytes }
}

// Uploads to <bucket>/<folder>/<random>.<ext> and returns the public link.
export async function uploadImage(dataUrl, folder) {
  const { type, bytes } = readImage(dataUrl)
  const key = `${folder}/${crypto.randomUUID()}.${TYPES[type]}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
      'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'x-upsert': 'false',
    },
    body: bytes,
  })
  if (!res.ok) {
    console.error('Supabase Storage upload failed:', res.status, await res.text().catch(() => ''))
    throw new Error('Couldn’t save that photo. Try again in a moment.')
  }
  return publicPrefix() + key
}

// What a community or event may store as its cover: a link into our bucket
// or a bundled /images/ path. Locally, with storage not set up, an inline
// data URL is accepted too so the feature can be tried without keys.
export function cleanCover(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  if (storageReady() && s.startsWith(publicPrefix()) && s.length < 500) return s
  if (/^\/images\/[\w/-]+\.(jpg|jpeg|png|webp)$/.test(s)) return s
  if (!storageReady() && !process.env.VERCEL && s.startsWith('data:image/')) { readImage(s); return s }
  return null
}
