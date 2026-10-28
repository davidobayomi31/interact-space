// Explore — one search across everything on VOIDAJ: people, places,
// communities, events, jobs and posts. Before you search it looks like
// Nuel's mockup: Trending Now, Suggested for You and Popular Posts as
// photo cards. Each search result uses the card its own section uses.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { USERS, EVENTS } from '../data/seed.js'
import { useCommunities } from '../communities.js'
import * as api from '../api.js'
import { useApp } from '../state.jsx'
import { Icon, IconTile } from '../components/Icons.jsx'
import { CommunityCard, PersonCard, EventCard, SectionHead } from '../components/bits.jsx'
import { FeedPost } from '../components/Feed.jsx'
import { CITIES } from '../components/NigeriaMap.jsx'
import { JobCard } from './Jobs.jsx'

const KINDS = [
  { id: 'all', label: 'All' },
  { id: 'people', label: 'People', icon: 'users' },
  { id: 'places', label: 'Places', icon: 'map-pin' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'jobs', label: 'Jobs', icon: 'wrench' },
  { id: 'communities', label: 'Communities', icon: 'community' },
  { id: 'posts', label: 'Posts', icon: 'chat' },
]

const firstPhoto = (p) => p.media?.find((m) => m.kind === 'image')?.src

// A photo card with a title and a line under it — the mockup's tiles.
function PhotoCard({ to, img, title, sub, onClick, tone = 'grad', icon = 'sparkle' }) {
  const body = (
    <>
      <span className="xp-photo">{img ? <img src={img} alt="" loading="lazy" /> : <IconTile name={icon} tone={tone} size={44} />}</span>
      <b>{title}</b>
      {sub && <span>{sub}</span>}
    </>
  )
  return onClick ? <button className="xp-card" onClick={onClick}>{body}</button> : <Link to={to} className="xp-card">{body}</Link>
}

function Discover({ posts, events, jobs, communities }) {
  const { setPlace, profile } = useApp()
  const navigate = useNavigate()
  const photoPosts = posts.filter(firstPhoto).sort((a, b) => b.score - a.score)
  const interests = profile.interests ?? []
  const trending = [
    ...events.slice(0, 2).map((e) => ({ key: e.id, to: `/events?event=${e.id}`, img: e.cover, title: e.title, sub: e.venue })),
    ...photoPosts.slice(0, 3).map((p) => ({ key: p.id, to: `/post/${p.id}`, img: firstPhoto(p), title: (p.title || p.body).slice(0, 40), sub: p.author.name })),
  ]
  const suggested = [
    { key: 'photo', to: '/explore?type=people&q=photo', img: '/images/communities/lagos-lens-collective.jpg', title: 'Photographers', sub: 'Near you' },
    { key: 'remote', to: '/jobs', img: '/images/events/ev-js-study.jpg', title: 'Jobs', sub: `${jobs.length} open` },
    { key: 'founders', to: '/communities?tab=discover', img: '/images/communities/lagos-entrepreneurs.jpg', title: 'Founders', sub: 'Communities' },
    ...communities.filter((c) => c.cover && (c.tags || []).some((t) => interests.includes(t))).slice(0, 2)
      .map((c) => ({ key: c.id, to: `/community/${c.id}`, img: c.cover, title: c.name, sub: 'Matches your interests' })),
  ]
  return (
    <>
      <section className="section">
        <div className="row-head"><h2><Icon name="flame" size={17} /> Trending Now</h2><Link to="/events">See all <Icon name="arrow" size={13} /></Link></div>
        <div className="rail xp-rail">{trending.map((t) => <PhotoCard key={t.key} {...t} />)}</div>
      </section>
      <section className="section">
        <div className="row-head"><h2>Suggested for You</h2></div>
        <div className="rail xp-rail">{suggested.map((t) => <PhotoCard key={t.key} {...t} />)}</div>
      </section>
      <section className="section">
        <div className="row-head"><h2>Places</h2></div>
        <div className="rail xp-rail">
          {CITIES.map((c) => (
            <PhotoCard key={c.id} onClick={() => { setPlace(c.name); navigate('/city') }} img={c.id === 'lagos' ? '/images/city/lagos.jpg' : null}
              icon="map-pin" tone={c.live ? 'blue' : 'teal'} title={c.name} sub={c.live ? 'Live now' : 'Look around'} />
          ))}
        </div>
      </section>
      <section className="section">
        <div className="row-head"><h2>Popular Posts</h2><Link to="/explore?type=posts">See all <Icon name="arrow" size={13} /></Link></div>
        <div className="xp-grid">
          {photoPosts.slice(0, 9).map((p) => (
            <Link key={p.id} to={`/post/${p.id}`} className="xp-grid-item" aria-label={(p.title || p.body).slice(0, 60)}>
              <img src={firstPhoto(p)} alt="" loading="lazy" />
              <span><Icon name="heart" size={12} /> {p.score}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
const PREVIEW = 4

const matches = (q, ...fields) => {
  if (!q) return true
  const hay = fields.flat().filter(Boolean).join(' ').toLowerCase()
  return q.split(/\s+/).every((w) => hay.includes(w))
}

function PlaceCard({ city }) {
  const { setPlace } = useApp()
  const navigate = useNavigate()
  return (
    <button className="card xp-place card-link" onClick={() => { setPlace(city.name); navigate('/city') }}>
      <IconTile name="map-pin" tone={city.live ? 'blue' : 'teal'} size={40} />
      <span><b>{city.name}</b><em>{city.live ? 'Live now' : 'Look around'}</em></span>
    </button>
  )
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
    jobs: jobs.filter((j) => matches(q, j.title, j.description, j.area, j.city, j.category)),
    posts: posts.filter((p) => matches(q, p.title, p.body, p.author?.name)),
    places: CITIES.filter((c) => matches(q, c.name)),
  }), [q, communities, madeEvents, jobs, posts, today])

  const render = {
    people: (u) => <PersonCard key={u.id} user={u} />,
    communities: (c) => <CommunityCard key={c.id} community={c} />,
    events: (e) => <EventCard key={e.id} event={e} />,
    jobs: (j) => <JobCard key={j.id} job={j} />,
    posts: (p) => <FeedPost key={p.id} post={p} />,
    places: (c) => <PlaceCard key={c.id} city={c} />,
  }
  const layout = { people: 'card-grid two', communities: 'card-grid two', events: 'card-grid two', jobs: 'stack', posts: 'feed-list', places: 'card-grid three' }
  const shown = kind === 'all' ? KINDS.slice(1) : KINDS.filter((k) => k.id === kind)
  const total = shown.reduce((n, k) => n + results[k.id].length, 0)

  const discovering = !q && kind === 'all'

  return (
    <div className="page explore-page explore2">
      <header className="page-head">
        <h1>Explore</h1>
        <p className="meta-dim">People, places, events, jobs and more.</p>
      </header>

      <div className="explore-search">
        <Icon name="search" size={18} />
        <input
          type="search" value={query} onChange={(e) => onQuery(e.target.value)} autoFocus
          placeholder="Search people, places, events, jobs…" aria-label="Search VOIDAJ"
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

      {discovering && <Discover posts={posts} events={results.events} jobs={jobs} communities={communities} />}

      {!discovering && total === 0 && (
        <p className="meta-dim empty-note" style={{ marginTop: 28 }}>
          Nothing matches “{query}” yet. Try a broader word, or ask the Companion.
        </p>
      )}

      {!discovering && shown.map((k) => {
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
