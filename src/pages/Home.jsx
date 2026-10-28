// Home — laid out like Nuel's app mockup (Oct 27): the "Explore your
// city" card he liked, status rings, quick icons, then For You /
// Following / Nearby and a feed of posts with events, people to follow
// and jobs woven in between.
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { EVENTS, USERS, PURPOSE } from '../data/seed.js'
import { Avatar, FavoriteButton } from '../components/bits.jsx'
import { useCommunities, findCommunity } from '../communities.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { StoriesRow } from '../components/Stories.jsx'
import { FeedPost, FeedComposer } from '../components/Feed.jsx'
import { VoidajMark } from '../components/VoidajMark.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { useAds, pickSearchAd, SearchAd } from '../components/AdsRail.jsx'
import { JobCard } from './Jobs.jsx'

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

// A city at dusk: towers in deep navy against a blue sky, lit windows
// picked out in warm gold and white. Drawn, so it loads instantly.
function Skyline() {
  const towers = [
    [0, 62, 22], [20, 40, 18], [36, 70, 26], [60, 24, 16], [74, 50, 22], [94, 12, 14], [106, 44, 24],
    [128, 30, 18], [144, 58, 26], [168, 6, 16], [182, 36, 22], [202, 52, 20], [220, 20, 18], [236, 46, 26],
    [260, 30, 16], [274, 60, 22], [294, 38, 26],
  ]
  return (
    <svg className="city-hero-skyline" viewBox="0 0 320 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g fill="#0A1A33" opacity="0.55">
        {towers.map(([x, y, w], i) => <rect key={i} x={x + 6} y={y + 14} width={w} height={100 - y} />)}
      </g>
      <g fill="#081429">
        {towers.map(([x, y, w], i) => <rect key={i} x={x} y={y + 24} width={w - 2} height={100 - y} />)}
      </g>
      <g>
        {towers.flatMap(([x, y, w], i) => Array.from({ length: Math.floor((76 - y) / 9) }, (_, r) =>
          (i * 7 + r * 3) % 4 === 0 ? null : (
            <rect key={`${i}-${r}`} x={x + 3 + ((r + i) % 2) * (w / 2 - 3)} y={y + 30 + r * 9} width="3" height="3"
              fill={(i + r) % 3 === 0 ? '#FFD27A' : '#BFD6FF'} opacity={(i + r) % 2 ? 0.9 : 0.55} />
          )))}
      </g>
    </svg>
  )
}

// A photo that quietly removes itself if it fails to load, leaving the
// drawn fallback (icon or skyline) underneath.
export function Cover({ src, className = 'tile-photo' }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return <img className={className} src={src} alt="" loading="lazy" decoding="async" onError={() => setOk(false)} />
}

// Drop a photo at public/images/city/<city>.jpg (lower case) and the hero uses it.
function CityHero({ city }) {
  return (
    <Link to="/city" className="city-hero">
      <Cover src={`/images/city/${city.toLowerCase()}.jpg`} className="city-hero-photo" />
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
  { to: '/jobs', icon: 'wrench', label: 'Quick Jobs', tone: 'orange' },
  { to: '/events', icon: 'calendar', label: 'Events', tone: 'pink' },
  { to: '/city', icon: 'map-pin', label: 'My City', tone: 'teal' },
]

// The mockup's icon row under the status rings.
const QUICK = [
  { to: '/add?pick=post', icon: 'edit', label: 'Post', tone: 'blue' },
  { to: '/add?pick=event', icon: 'calendar', label: 'Event', tone: 'pink' },
  { to: '/jobs?post=1', icon: 'wrench', label: 'Job', tone: 'orange' },
  { to: '/communities', icon: 'community', label: 'Community', tone: 'teal' },
  { to: '/city', icon: 'map-pin', label: 'Map', tone: 'green' },
  { to: '/explore', icon: 'grid', label: 'More', tone: 'violet' },
]

const TABS = [
  { id: 'foryou', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'nearby', label: 'Nearby' },
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

export function EventTile({ event }) {
  const c = findCommunity(event.communityId)
  const to = c ? `/community/${c.id}?tab=events` : '/explore?type=events'
  return (
    <div className="tile event-tile card-link" style={{ '--accent': c?.accent ?? 'var(--gold)' }}>
      <div className="tile-top">
        <Cover src={event.cover ?? c?.cover} />
        <span className="tile-date"><b>{day(event.date)}</b>{month(event.date)}</span>
        <Icon name={c?.icon ?? 'calendar'} size={30} />
        <span className="tile-kind">{c ? c.name.split(' ')[0] : 'Event'}</span>
      </div>
      <div className="tile-body">
        <Link to={to} className="tile-title stretched">{event.title}</Link>
        <span className="tile-meta"><Icon name="clock" size={12} /> {day(event.date)} {month(event.date)} · {event.time}</span>
        {event.venue && <span className="tile-meta"><Icon name="map-pin" size={12} /> {event.venue}</span>}
        <span className="tile-going">
          <span className="tile-faces" aria-hidden="true">{USERS.slice(0, 3).map((u) => <Avatar key={u.id} user={u} size={20} />)}</span>
          {event.attending} going
        </span>
      </div>
      <FavoriteButton className="tile-fav" item={{ kind: 'event', id: event.id, title: event.title, subtitle: `${event.date} · ${event.time}${c ? ` · ${c.name}` : ''}`, href: to }} />
    </div>
  )
}

export function CommunityTile({ community: c }) {
  const { user, profile, joinCommunity } = useApp()
  const navigate = useNavigate()
  const joined = profile.communities.includes(c.id)
  return (
    <div className="tile community-tile card-link" style={{ '--accent': c.accent }}>
      <div className="tile-top"><Icon name={c.icon} size={34} /><Cover src={c.cover} /></div>
      <div className="tile-body">
        <Link to={`/community/${c.id}`} className="tile-title stretched">{c.name}</Link>
        <span className="tile-meta"><Icon name={c.scope === 'global' ? 'globe' : 'map-pin'} size={12} /> {c.memberCount >= 1000 ? `${(c.memberCount / 1000).toFixed(1)}k` : c.memberCount} members</span>
        <button className={`btn small ${joined ? 'ghost' : 'primary'}`} disabled={joined}
          onClick={() => (user ? joinCommunity(c.id) : navigate('/auth'))}>
          {joined ? <><Icon name="check" size={13} /> Joined</> : 'Join'}
        </button>
      </div>
    </div>
  )
}

export function PersonTile({ person }) {
  const { user, profile, follow } = useApp()
  const navigate = useNavigate()
  const following = (profile.following ?? []).includes(person.id)
  return (
    <div className="tile person-tile card-link">
      <Avatar user={person} size={56} />
      <Link to={`/profile/${person.id}`} className="tile-title stretched">{person.name}</Link>
      <span className="tile-meta">{person.title}</span>
      <button className={`btn small ${following ? 'ghost' : 'primary'}`}
        onClick={() => (user ? follow(person.id) : navigate('/auth'))}>
        {following ? <><Icon name="check" size={13} /> Following</> : <><Icon name="user-plus" size={13} /> Follow</>}
      </button>
    </div>
  )
}

// Signed-out visitors meet the brand first, like the app's welcome screen.
function Welcome() {
  return (
    <section className="welcome-card">
      <VoidajMark size={30} light />
      <h1>A new space for people, communities &amp; opportunities.</h1>
      <p>{PURPOSE}</p>
      <div className="welcome-actions">
        <Link to="/auth" className="btn primary">Get started <Icon name="arrow" size={15} /></Link>
        <Link to="/auth?mode=login" className="btn ghost">Log in</Link>
      </div>
    </section>
  )
}

// A compact row for the side column: face, name, Follow.
function SidePerson({ person }) {
  const { user, profile, follow } = useApp()
  const navigate = useNavigate()
  const following = (profile.following ?? []).includes(person.id)
  return (
    <div className="side-person">
      <Link to={`/profile/${person.id}`} className="people-row">
        <Avatar user={person} size={40} />
        <span><b>{person.name}</b><em>{person.title}</em></span>
      </Link>
      <button className={`btn small ${following ? 'ghost' : 'primary'}`} onClick={() => (user ? follow(person.id) : navigate('/auth'))}>
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  )
}

export default function Home() {
  const { user, profile, loading } = useApp()
  const [tab, setTab] = useState('foryou')
  const [feed, setFeed] = useState(null)
  const [posts, setPosts] = useState([])
  const [jobs, setJobs] = useState([])
  const [madeEvents, setMadeEvents] = useState([])
  const { all: communities } = useCommunities()

  useEffect(() => {
    setFeed(null)
    api.feed(tab === 'following' ? 'following' : 'foryou').then(setFeed).catch(() => setFeed([]))
  }, [tab, user?.id])
  useEffect(() => { api.listPosts().then(setPosts).catch(() => setPosts([])) }, [user])
  useEffect(() => { api.listJobs().then(setJobs).catch(() => setJobs([])) }, [user])
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.listEvents().then((list) => setMadeEvents(list.filter((e) => e.date >= today))).catch(() => {})
  }, [])

  if (user && !loading && !profile.onboarded) return <Navigate to="/welcome" replace />

  // Events members have planned come first, then the city calendar.
  const events = [...madeEvents, ...[...EVENTS].sort((a, b) => a.date.localeCompare(b.date))].slice(0, 8)
  const people = USERS.filter((u) => u.id !== profile.id && !(profile.following ?? []).includes(u.id)).slice(0, 8)
  const trending = communities.filter((c) => c.trending || c.scope === 'global' || c.cover).slice(0, 8)
  const first = profile.name?.split(' ')[0]
  const city = profile.city || 'Lagos'
  // Nearby: posts for your city and from local communities.
  const shown = feed && (tab === 'nearby'
    ? feed.filter((p) => p.audience === 'city' || (p.community && findCommunity(p.community.id)?.scope !== 'global'))
    : feed)

  // Events, people and jobs sit between posts rather than above them.
  const weave = (list) => list.flatMap((p, n) => {
    const out = [<FeedPost key={p.id} post={p} />]
    if (n === 1 && events.length) out.push(
      <div key="events" className="feed-inline"><Row title={`Happening in ${city}`} to="/events">{events.map((e) => <EventTile key={e.id} event={e} />)}</Row></div>)
    if (n === 3 && people.length) out.push(
      <div key="people" className="feed-inline"><Row title="People to follow" to="/explore?type=people">{people.map((u) => <PersonTile key={u.id} person={u} />)}</Row></div>)
    if (n === 5 && jobs.length) out.push(
      <section key="jobs" className="home-row feed-inline">
        <div className="row-head"><h2>Jobs near you</h2><Link to="/jobs">See all <Icon name="arrow" size={13} /></Link></div>
        <div className="card-grid two">{jobs.slice(0, 2).map((j) => <JobCard key={j.id} job={j} />)}</div>
      </section>)
    return out
  })

  return (
    <div className="page home2 home3">
      {user
        ? <div className="home-greeting"><h1>Hi {first} <span aria-hidden="true">👋</span></h1><p className="meta-dim">Here’s what’s happening around {city}.</p></div>
        : <Welcome />}

      <HomeSearch communities={communities} posts={posts} jobs={jobs} events={[...madeEvents, ...EVENTS]} />

      <div className="home-top">
        <CityHero city={city} />
        <nav className="shortcut-tiles" aria-label="Shortcuts">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to} className="shortcut">
              <IconTile name={s.icon} tone={s.tone} size={40} iconSize={20} />
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="home-body">
        <div className="home-main">
          <StoriesRow />

          <nav className="quick-icons" aria-label="Create and find">
            {QUICK.map((a) => (
              <Link key={a.label} to={user || a.to === '/explore' || a.to === '/city' || a.to === '/communities' ? a.to : '/auth'} className="quick-icon">
                <IconTile name={a.icon} tone={a.tone} size={48} iconSize={22} />
                <span>{a.label}</span>
              </Link>
            ))}
          </nav>

          <div className="feed-tabs" role="tablist" aria-label="Feed">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          <FeedComposer onPosted={(p) => setFeed((f) => [p, ...(f || [])])} />

          <div className="feed-list stagger">
            {shown === null && [0, 1].map((n) => <div key={n} className="card feed-post skeleton" aria-hidden="true" />)}
            {shown && shown.length === 0 && (
              <div className="card feed-empty">
                <IconTile name={tab === 'following' ? 'user-plus' : 'sparkle'} tone="grad" size={52} />
                <strong>{tab === 'following' ? 'Follow people to see their posts here' : 'Nothing here yet'}</strong>
                <span className="meta-dim">{tab === 'following' ? 'Here are a few people in your city to start with.' : 'Be the first to post something for your city.'}</span>
              </div>
            )}
            {shown && shown.length === 0 && tab === 'following' && people.length > 0 && (
              <Row title="People to follow" to="/explore?type=people">{people.map((u) => <PersonTile key={u.id} person={u} />)}</Row>
            )}
            {shown && weave(shown)}
          </div>
        </div>

        {/* Wide screens: what's around you sits beside the feed. */}
        <aside className="home-aside">
          {events.length > 0 && (
            <section className="card home-side-card">
              <div className="row-head"><h2>Happening in {city}</h2><Link to="/events">See all <Icon name="arrow" size={13} /></Link></div>
              {events.slice(0, 4).map((e) => <EventTile key={e.id} event={e} />)}
            </section>
          )}
          {people.length > 0 && (
            <section className="card home-side-card">
              <div className="row-head"><h2>People to follow</h2><Link to="/explore?type=people">See all <Icon name="arrow" size={13} /></Link></div>
              {people.slice(0, 5).map((u) => <SidePerson key={u.id} person={u} />)}
            </section>
          )}
          {jobs.length > 0 && (
            <section className="card home-side-card">
              <div className="row-head"><h2>Jobs near you</h2><Link to="/jobs">See all <Icon name="arrow" size={13} /></Link></div>
              <div className="stack">{jobs.slice(0, 3).map((j) => <JobCard key={j.id} job={j} />)}</div>
            </section>
          )}
          {trending.length > 0 && (
            <section className="card home-side-card">
              <div className="row-head"><h2>Trending communities</h2><Link to="/communities">See all <Icon name="arrow" size={13} /></Link></div>
              <div className="home-side-comms">{trending.slice(0, 4).map((c) => <CommunityTile key={c.id} community={c} />)}</div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
