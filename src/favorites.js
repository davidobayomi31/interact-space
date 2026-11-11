// ── Favorites ────────────────────────────────────────────────────────
// Anything a member hearts to find again: a community, post, person, job
// or event. UI only for now — favorites are kept in this browser, not on
// the server, so they don't follow the member to another device yet.
// Each one keeps the title and link it was saved with.
import { useSyncExternalStore } from 'react'
import { FEATURES } from './features.js'

const KEY = 'voidaj:favorites'
const listeners = new Set()
let cache = null

function read() {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) || '[]') } catch { cache = [] }
  if (!Array.isArray(cache)) cache = []
  return cache
}

function write(next) {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l())
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const same = (a, kind, id) => a.kind === kind && a.id === id

export const useFavorites = () => useSyncExternalStore(subscribe, read)

export const isFavorite = (list, kind, id) => list.some((f) => same(f, kind, id))

// item: { kind, id, title, subtitle, href }
export function toggleFavorite(item) {
  const list = read()
  if (isFavorite(list, item.kind, item.id)) write(list.filter((f) => !same(f, item.kind, item.id)))
  else write([{ ...item, savedAt: Date.now() }, ...list])
}

export const removeFavorite = (kind, id) => write(read().filter((f) => !same(f, kind, id)))

// ── Stash: saves sorted into collections (Nuel's mockup v2.0) ────────
// A save with no collection is in "All Stash".
export const STASH_COLLECTIONS = [
  { id: 'all', label: 'All Stash', icon: 'layers' },
  { id: 'jobs', label: 'Jobs & Opportunities', icon: 'briefcase' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'businesses', label: 'Businesses', icon: 'store' },
  ...(FEATURES.trips ? [{ id: 'trips', label: 'Trips', icon: 'car' }] : []),
  { id: 'ideas', label: 'Ideas & Inspiration', icon: 'sparkle' },
]

export const stashOf = (list, kind, id) => list.find((f) => same(f, kind, id))

// Put an item in a collection (or move it there if it's already stashed).
export function stash(item, collection = 'all') {
  const list = read().filter((f) => !same(f, item.kind, item.id))
  write([{ ...item, collection, savedAt: Date.now() }, ...list])
}
