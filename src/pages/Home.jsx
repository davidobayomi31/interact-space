// Home — the member's starting point, laid out like the VOIDAJ app
// screens: search, an "Explore your city" card into My City, three
// shortcuts, nearby events and trending communities as rows you swipe
// through, quick actions, then the feed (latest posts, people, jobs) and
// the member's own space. On wider screens the rows become grids.
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { COMMUNITIES, EVENTS, USERS, PURPOSE } from '../data/seed.js'
import { Avatar, PostCard, FavoriteButton } from '../components/bits.jsx'
import { useCommunities, findCommunity } from '../communities.js'
import { Icon } from '../components/Icons.jsx'
import { VoidajMark } from '../components/VoidajMark.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { useAds, pickSearchAd, SearchAd } from '../components/AdsRail.jsx'
import { JobCard } from './Jobs.jsx'
import MySpace from './MySpace.jsx'

const day = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric' })
const month = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })

// ── Search: a few results right here, everything else in Explore ──────
function HomeSearch({ communities, posts, jobs, events }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const term = q.trim().toLowerCase()
  const has = (...fields) => term.split(/\s+/).every((w) => fields.flat().filter(Boolean).join(' ').toLowerCase().includes(w))
  const results = useMemo(() => (term.length < 2 ? [] : [
    ...USERS.filter((u) => has(u.name, u.title, u.handle)).map((u) => ({ id: u.id, icon: 'user', kind: 'Person', title: u.name, to: `/profile/${u.id}` })),
    ...communities.filter((c) => has(c.name, c.tagline, c.tags)).map((c) => ({ id: c.id, icon: 'community', kind: 'Community', title: c.name, to: `/community/${c.id}` })),
    ...events.filter((e) => has(e.title, e.venue, e.tags)).map((e) => ({ id: e.id, icon: 'calendar', kind: 'Event', title: e.title, to: e.communityId ? `/community/${e.communityId}?tab=events` : '/explore?type=events' })),
    ...jobs.filter((j) => has(j.title, j.area, j.category)).map((j) => ({ id: j.id, icon: 'wrench', kind: 'Job', title: j.title, to: `/jobs?job=${j.id}` })),
    ...posts.filter((p) => has(p.title, p.body)).map((p) => ({ id: p.id, icon: 'chat', kind: 'Post', title: p.title, to: `/post/${p.id}` })),
  ].slice(0, 6)), [term, communities, events, jobs, posts]) // eslint-disable-line
  const searchAd = pickSearchAd(useAds(), term)
  const submit = (e) => { e.preventDefault(); navigate(term ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore') }

  return (
    <div className="home-search">
      <form className="search-pill" onSubmit={submit} role="search">
        <Icon name="search" size={18} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search VOIDAJ"
          placeholder="Search people, communities, hubs…" />
      </form>
      {term.length >= 2 && (
        <div className="card home-search-results">
          {results.length ? (
            <ul className="hx-results">
              {results.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link to={r.to}><Icon name={r.icon} size={14} /><strong>{r.title}</strong><span className="hx-count">{r.kind}</span></Link>
                </li>
              ))}
            </ul>
          ) : <p className="hx-none">Nothing here for “{q.trim()}” yet.</p>}
          {searchAd && <SearchAd ad={searchAd} />}
          <Link to={`/explore?q=${encodeURIComponent(q.trim())}`} className="btn ghost small">See everything in Explore <Icon name="arrow" size={13} /></Link>
        </div>
      )}
    </div>
  )
}

// A flat, hand-drawn skyline: blocks of ink with a few lit windows. No
// photos, no gradients.
function Skyline() {
  return (
    <svg className="city-hero-skyline" viewBox="0 0 320 90" preserveAspectRatio="none" aria-hidden="true">
      <g fill="#262420">
        <rect x="10" y="48" width="26" height="42" /><rect x="40" y="30" width="20" height="60" />
        <rect x="64" y="56" width="30" height="34" /><rect x="98" y="18" width="24" height="72" />
        <rect x="126" y="40" width="18" height="50" /><rect x="148" y="8" width="22" height="82" />
        <rect x="174" y="44" width="30" height="46" /><rect x="208" y="26" width="20" height="64" />
        <rect x="232" y="52" width="26" height="38" /><rect x="262" y="34" width="22" height="56" />
        <rect x="288" y="58" width="28" height="32" />
      </g>
      <g fill="#d99a1e">
        <rect x="104" y="28" width="4" height="4" /><rect x="112" y="40" width="4" height="4" /><rect x="154" y="20" width="4" height="4" />
        <rect x="160" y="44" width="4" height="4" /><rect x="214" y="36" width="4" height="4" /><rect x="46" y="42" width="4" height="4" />
        <rect x="268" y="46" width="4" height="4" /><rect x="180" y="56" width="4" height="4" />
      </g>
    </svg>
  )
}

function CityHero({ city }) {
  return (
    <Link to="/city" className="city-hero">
      <div className="city-hero-text">
        <strong>Explore your city</strong>
        <span>Events, jobs, hubs and more in {city}</span>
      </div>
      <span className="city-hero-go" aria-hidden="true"><Icon name="arrow" size={18} /></span>
      <Skyline />
    </Link>
  )
}

const SHORTCUTS = [
  { to: '/jobs', icon: 'wrench', label: 'Quick Jobs', tone: 'terracotta' },
  { to: '/add', icon: 'plus-circle', label: 'Add Hub', tone: 'green' },
  { to: '/city', icon: 'map-pin', label: 'My City', tone: 'gold' },
]

const QUICK_ACTIONS = [
  { to: '/add?pick=post', icon: 'edit', label: 'Post', tone: 'ink' },
  { to: '/add?pick=event', icon: 'calendar', label: 'Create Event', tone: 'gold' },
  { to: '/jobs', icon: 'briefcase', label: 'Find Job', tone: 'terracotta' },
  { to: '/add', icon: 'plus', label: 'Add Hub', tone: 'green' },
]

// A titled row of cards: swipe sideways on phones, a grid on wider screens.
function Row({ title, to, children }) {
  return (
    <section className="home-row">
      <div className="row-head">
        <h2>{title}</h2>
        {to && <Link to={to}>See all <Icon name="arrow" size={13} /></Link>}
      </div>
      <div className="rail">{children}</div>
    </section>
  )
}

function EventTile({ event }) {
  const c = findCommunity(event.communityId)
  const to = c ? `/community/${c.id}?tab=events` : '/explore?type=events'
  return (
    <div className="tile event-tile card-link" style={{ '--accent': c?.accent ?? 'var(--gold)' }}>
      <div className="tile-top">
        <span className="tile-date"><b>{day(event.date)}</b>{month(event.date)}</span>
        <Icon name={c?.icon ?? 'calendar'} size={30} />
      </div>
      <div className="tile-body">
        <Link to={to} className="tile-title stretched">{event.title}</Link>
        <span className="tile-meta"><Icon name="clock" size={12} /> {event.time}{event.venue ? ` · ${event.venue}` : ''}</span>
        <span className="tile-meta"><Icon name="users" size={12} /> {event.attending} going</span>
      </div>
      <FavoriteButton className="tile-fav" item={{ kind: 'event', id: event.id, title: event.title, subtitle: `${event.date} · ${event.time}${c ? ` · ${c.name}` : ''}`, href: to }} />
    </div>
  )
}

function CommunityTile({ community: c }) {
  const { user, profile, joinCommunity } = useApp()
  const navigate = useNavigate()
  const joined = profile.communities.includes(c.id)
  return (
    <div className="tile community-tile card-link" style={{ '--accent': c.accent }}>
      <div className="tile-top"><Icon name={c.icon} size={34} /></div>
      <div className="tile-body">
        <Link to={`/community/${c.id}`} className="tile-title stretched">{c.name}</Link>
        <span className="tile-meta"><Icon name={c.scope === 'global' ? 'globe' : 'map-pin'} size={12} /> {c.memberCount.toLocaleString()} members</span>
        <button className={`btn small ${joined ? 'ghost' : 'primary'}`} disabled={joined}
          onClick={() => (user ? joinCommunity(c.id) : navigate('/auth'))}>
          {joined ? <><Icon name="check" size={13} /> Joined</> : 'Join'}
        </button>
      </div>
    </div>
  )
}

function PersonTile({ person }) {
  const { user, profile, connect } = useApp()
  const navigate = useNavigate()
  const connected = profile.connections.includes(person.id)
  return (
    <div className="tile person-tile card-link">
      <Avatar user={person} size={56} />
      <Link to={`/profile/${person.id}`} className="tile-title stretched">{person.name}</Link>
      <span className="tile-meta">{person.title}</span>
      <button className={`btn small ${connected ? 'ghost' : 'primary'}`} disabled={connected}
        onClick={() => (user ? connect(person.id) : navigate('/auth'))}>
        {connected ? <><Icon name="check" size={13} /> Connected</> : 'Connect'}
      </button>
    </div>
  )
}

// Signed-out visitors meet the brand first, like the app's welcome screen.
function Welcome() {
  return (
    <section className="welcome-card">
      <VoidajMark size={84} />
      <h1>A new space for people, communities &amp; opportunities.</h1>
      <p>{PURPOSE}</p>
      <div className="welcome-actions">
        <Link to="/auth" className="btn primary">Get started <Icon name="arrow" size={15} /></Link>
        <Link to="/auth?mode=login" className="btn ghost">Log in</Link>
      </div>
    </section>
  )
}

export default function Home() {
  const { user, profile, loading } = useApp()
  const [posts, setPosts] = useState([])
  const [jobs, setJobs] = useState([])
  const [madeEvents, setMadeEvents] = useState([])
  const { all: communities } = useCommunities()

  useEffect(() => { api.listPosts().then(setPosts).catch(() => setPosts([])) }, [user])
  useEffect(() => { api.listJobs().then(setJobs).catch(() => setJobs([])) }, [user])
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.listEvents().then((list) => setMadeEvents(list.filter((e) => e.date >= today))).catch(() => {})
  }, [])

  if (user && !loading && !profile.onboarded) return <Navigate to="/welcome" replace />

  // Events members have planned come first, then the city calendar.
  const events = [...madeEvents, ...[...EVENTS].sort((a, b) => a.date.localeCompare(b.date))].slice(0, 8)
  const trending = COMMUNITIES.filter((c) => c.trending || c.scope === 'global').slice(0, 8)
  const people = USERS.filter((u) => u.id !== profile.id && !profile.connections.includes(u.id)).slice(0, 8)
  const latest = [...posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
  const first = profile.name?.split(' ')[0]
  const city = profile.city || 'Lagos'

  return (
    <div className="page home2">
      {user
        ? <div className="home-greeting"><h1>Hi {first} <span aria-hidden="true">👋</span></h1><p className="meta-dim">Here’s what’s happening around {city}.</p></div>
        : <Welcome />}

      <HomeSearch communities={communities} posts={posts} jobs={jobs} events={[...madeEvents, ...EVENTS]} />

      <div className="home-top">
        <CityHero city={city} />
        <nav className="shortcut-tiles" aria-label="Shortcuts">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to} className={`shortcut tone-${s.tone}`}>
              <span className="shortcut-icon"><Icon name={s.icon} size={20} /></span>
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <Row title="Nearby Events" to="/explore?type=events">
        {events.map((e) => <EventTile key={e.id} event={e} />)}
      </Row>

      <Row title="Trending Communities" to="/explore?type=communities">
        {trending.map((c) => <CommunityTile key={c.id} community={c} />)}
      </Row>

      <section className="home-row">
        <div className="row-head"><h2>Quick Actions</h2></div>
        <nav className="quick-actions" aria-label="Quick actions">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} to={user ? a.to : '/auth'} className={`quick-action tone-${a.tone}`}>
              <span className="quick-action-icon"><Icon name={a.icon} size={20} /></span>
              <span>{a.label}</span>
            </Link>
          ))}
        </nav>
      </section>

      {latest.length > 0 && (
        <section className="home-row">
          <div className="row-head"><h2>Latest posts</h2><Link to="/explore?type=posts">See all <Icon name="arrow" size={13} /></Link></div>
          <div className="feed-list">{latest.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      )}

      {people.length > 0 && (
        <Row title="People you may know" to="/explore?type=people">
          {people.map((p) => <PersonTile key={p.id} person={p} />)}
        </Row>
      )}

      {jobs.length > 0 && (
        <section className="home-row">
          <div className="row-head"><h2>Jobs near you</h2><Link to="/jobs">See all <Icon name="arrow" size={13} /></Link></div>
          <div className="card-grid two">{jobs.slice(0, 4).map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
      )}

      {user && <MySpace />}
    </div>
  )
}
