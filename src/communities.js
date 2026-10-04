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
let loading = null
let loaded = false
const listeners = new Set()
const notify = () => listeners.forEach((f) => f())

export function refreshCommunities() {
  loading = api.listCommunities()
    .then((all) => { created = all.filter((c) => !SEED_IDS.has(c.id)).map(shape) })
    .catch(() => {})
    .finally(() => { loaded = true; notify() })
  return loading
}

export function addCommunity(c) {
  created = [...created.filter((x) => x.id !== c.id), shape(c)]
  notify()
}

export const allCommunities = () => [...COMMUNITIES, ...created]
export const createdCommunities = () => created
export const findCommunity = (id) => COMMUNITIES.find((c) => c.id === id) || created.find((c) => c.id === id)

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
