// My Stash: things a member saves, kept in this browser's localStorage.
// The module caches what it read, so each test loads a fresh copy.
import { beforeEach, describe, expect, it, vi } from 'vitest'

let fav
beforeEach(async () => {
  vi.resetModules()
  fav = await import('./favorites.js')
})
const stored = () => JSON.parse(localStorage.getItem('voidaj:favorites') || '[]')
const item = { kind: 'community', id: 'c-1', title: 'Lagos Devs', subtitle: 'Tech', href: '/community/c-1' }

describe('favorites', () => {
  it('saves an item with when it was saved, newest first', () => {
    fav.toggleFavorite(item)
    fav.toggleFavorite({ ...item, id: 'c-2', title: 'Second' })
    const list = stored()
    expect(list.map((f) => f.id)).toEqual(['c-2', 'c-1'])
    expect(typeof list[0].savedAt).toBe('number')
  })

  it('toggling the same item again removes it', () => {
    fav.toggleFavorite(item)
    fav.toggleFavorite(item)
    expect(stored()).toEqual([])
  })

  it('tells apart the same id in different kinds', () => {
    fav.toggleFavorite(item)
    fav.toggleFavorite({ ...item, kind: 'post' })
    expect(stored()).toHaveLength(2)
    expect(fav.isFavorite(stored(), 'post', 'c-1')).toBe(true)
    expect(fav.isFavorite(stored(), 'job', 'c-1')).toBe(false)
  })

  it('removes by kind and id', () => {
    fav.toggleFavorite(item)
    fav.removeFavorite('community', 'c-1')
    expect(stored()).toEqual([])
  })

  it('starts empty instead of crashing when storage holds garbage', async () => {
    localStorage.setItem('voidaj:favorites', '{not json')
    vi.resetModules()
    fav = await import('./favorites.js')
    fav.toggleFavorite(item)
    expect(stored().map((f) => f.id)).toEqual(['c-1'])
  })

  it('treats a stored non-array as empty', async () => {
    localStorage.setItem('voidaj:favorites', '{"a":1}')
    vi.resetModules()
    fav = await import('./favorites.js')
    fav.toggleFavorite(item)
    expect(stored()).toHaveLength(1)
  })
})
