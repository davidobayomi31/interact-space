// Explore — one search across everything on Voidaj: people, communities,
// events, jobs and posts. Each result uses the card its own section uses,
// so a find here opens the same page it would anywhere else.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { USERS, EVENTS } from '../data/seed.js'
import { useCommunities } from '../communities.js'
import * as api from '../api.js'
import { useApp } from '../state.jsx'
import { Icon } from '../components/Icons.jsx'
import { CommunityCard, PersonCard, EventCard, PostCard, SectionHead } from '../components/bits.jsx'
import { JobCard } from './Jobs.jsx'

const KINDS = [
  { id: 'all', label: 'Everything' },
  { id: 'people', label: 'People', icon: 'users' },
  { id: 'communities', label: 'Communities', icon: 'community' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'jobs', label: 'Jobs', icon: 'wrench' },
  { id: 'posts', label: 'Posts', icon: 'chat' },
]
const PREVIEW = 4

const matches = (q, ...fields) => {
  if (!q) return true
  const hay = fields.flat().filter(Boolean).join(' ').toLowerCase()
  return q.split(/\s+/).every((w) => hay.includes(w))
}

export default function Explore() {
  const { user } = useApp()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const kind = KINDS.some((k) => k.id === params.get('type')) ? params.get('type') : 'all'
  const { all: communities } = useCommunities()
  const [posts, setPosts] = useState([])
  const [jobs, setJobs] = useState([])
  const [madeEvents, setMadeEvents] = useState([])

  useEffect(() => {
    api.listPosts().then(setPosts).catch(() => {})
    api.listJobs().then(setJobs).catch(() => {})
    api.listEvents().then(setMadeEvents).catch(() => {})
  }, [user])

  // Keep the query in the URL so a search can be shared or come back to.
  const setKind = (id) => setParams((p) => { id === 'all' ? p.delete('type') : p.set('type', id); return p }, { replace: true })
  const onQuery = (v) => {
    setQuery(v)
    setParams((p) => { v ? p.set('q', v) : p.delete('q'); return p }, { replace: true })
  }

  const q = query.trim().toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  const results = useMemo(() => ({
    people: USERS.filter((u) => matches(q, u.name, u.handle, u.title, u.area, u.interests, u.skills, u.bio)),
    communities: communities.filter((c) => matches(q, c.name, c.tagline, c.description, c.tags, c.city)),
    events: [...madeEvents, ...EVENTS]
      .filter((e) => e.date >= today && matches(q, e.title, e.description, e.venue, e.tags))
      .sort((a, b) => a.date.localeCompare(b.date)),
    jobs: jobs.filter((j) => matches(q, j.title, j.description, j.area, j.category)),
    posts: posts.filter((p) => matches(q, p.title, p.body, p.author?.name)),
  }), [q, communities, madeEvents, jobs, posts, today])

  const onInterest = async (id) => {
    if (!user) { window.location.href = '/auth'; return }
    try {
      const job = await api.toggleJobInterest(id)
      setJobs((js) => js.map((j) => (j.id === id ? job : j)))
    } catch (err) { alert(err.message) }
  }

  const render = {
    people: (u) => <PersonCard key={u.id} user={u} />,
    communities: (c) => <CommunityCard key={c.id} community={c} />,
    events: (e) => <EventCard key={e.id} event={e} />,
    jobs: (j) => <JobCard key={j.id} job={j} onInterest={onInterest} />,
    posts: (p) => <PostCard key={p.id} post={p} />,
  }
  const layout = { people: 'card-grid two', communities: 'card-grid two', events: 'card-grid two', jobs: 'stack', posts: 'stack' }
  const shown = kind === 'all' ? KINDS.slice(1) : KINDS.filter((k) => k.id === kind)
  const total = shown.reduce((n, k) => n + results[k.id].length, 0)

  return (
    <div className="page explore-page">
      <section className="discover-hero">
        <h1><Icon name="search" size={24} /> Explore</h1>
        <p className="meta-dim">Find people, communities, events, jobs and conversations across Voidaj.</p>
      </section>

      <div className="explore-search">
        <Icon name="search" size={18} />
        <input
          type="search" value={query} onChange={(e) => onQuery(e.target.value)} autoFocus
          placeholder="Search for a person, skill, community, event or job…" aria-label="Search Voidaj"
        />
        {query && <button className="icon-btn subtle" onClick={() => onQuery('')} aria-label="Clear search"><Icon name="x" size={15} /></button>}
      </div>

      <div className="filter-row" role="tablist" aria-label="What to show">
        {KINDS.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
            {k.icon && <Icon name={k.icon} size={13} />} {k.label}
            {q && k.id !== 'all' && <span className="filter-count">{results[k.id].length}</span>}
          </button>
        ))}
      </div>

      {total === 0 && (
        <p className="meta-dim empty-note" style={{ marginTop: 28 }}>
          Nothing matches “{query}” yet. Try a broader word, or ask the Companion.
        </p>
      )}

      {shown.map((k) => {
        const list = results[k.id]
        if (!list.length) return null
        const capped = kind === 'all' ? list.slice(0, PREVIEW) : list
        return (
          <section className="section" key={k.id}>
            <SectionHead
              icon={k.icon} title={k.label}
              sub={`${list.length} ${q ? 'found' : 'to explore'}`}
              action={kind === 'all' && list.length > PREVIEW
                ? <button className="btn ghost small" onClick={() => setKind(k.id)}>See all {list.length}</button>
                : null}
            />
            <div className={layout[k.id]}>{capped.map(render[k.id])}</div>
          </section>
        )
      })}
    </div>
  )
}
