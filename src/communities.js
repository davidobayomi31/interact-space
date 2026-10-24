// ── Communities catalog ──────────────────────────────────────────────
// The demo communities ship with the frontend (data/seed.js). Communities
// members start live only in the API, so they are fetched once and kept
// here alongside the seeded ones. Components that render from the catalog
// call useCommunities() so they redraw when a new one arrives.
import { useEffect, useState } from 'react'
import { COMMUNITIES } from './data/seed.js'
import * as api from './api.js'

const SEED_IDS = new Set(COMMUNITIES.map((c) => c.id))
// The seeded entries carry member and moderator lists; created ones don't.
const shape = (c) => ({ ...c, memberIds: [], moderators: [], created: true })

let created = []
// Cover photos moderators have set on the seeded communities, by id.
let seedCovers = {}
let loading = null
let loaded = false
const listeners = new Set()
const notify = () => listeners.forEach((f) => f())

export function refreshCommunities() {
  loading = api.listCommunities()
    .then((all) => {
      created = all.filter((c) => !SEED_IDS.has(c.id)).map(shape)
      seedCovers = Object.fromEntries(all.filter((c) => SEED_IDS.has(c.id) && c.cover).map((c) => [c.id, c.cover]))
    })
    .catch(() => {})
    .finally(() => { loaded = true; notify() })
  return loading
}

export function addCommunity(c) {
  created = [...created.filter((x) => x.id !== c.id), shape(c)]
  notify()
}

export function setCommunityCover(id, cover) {
  if (SEED_IDS.has(id)) seedCovers = { ...seedCovers, [id]: cover }
  else created = created.map((c) => (c.id === id ? { ...c, cover } : c))
  notify()
}

const withCover = (c) => (seedCovers[c.id] ? { ...c, cover: seedCovers[c.id] } : c)
export const allCommunities = () => [...COMMUNITIES.map(withCover), ...created]
export const createdCommunities = () => created
export function findCommunity(id) {
  const seeded = COMMUNITIES.find((c) => c.id === id)
  return seeded ? withCover(seeded) : created.find((c) => c.id === id)
}

export function useCommunities() {
  const [, redraw] = useState(0)
  useEffect(() => {
    const f = () => redraw((n) => n + 1)
    listeners.add(f)
    if (!loading) refreshCommunities()
    return () => listeners.delete(f)
  }, [])
  return { all: allCommunities(), created, loaded }
}
