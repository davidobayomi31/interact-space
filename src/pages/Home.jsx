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
    ...events.filter((e) => has(e.title, e.venue, e.tags)).map((e) => ({ id: e.id, icon: 'calendar', kind: 'Event', title: e.title, to: `/event/${e.id}` })),
    ...jobs.filter((j) => has(j.title, j.area, j.category)).map((j) => ({ id: j.id, icon: 'briefcase', kind: 'Job', title: j.title, to: `/jobs?job=${j.id}` })),
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

// A photo that quietly removes itself if it fails to load, leaving the
// drawn fallback (icon or skyline) underneath.
export function Cover({ src, className = 'tile-photo' }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return <img className={className} src={src} alt="" loading="lazy" decoding="async" onError={() => setOk(false)} />
}

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
  const to = `/event/${event.id}`
  return (
    <div className="tile event-tile card-link" style={{ '--accent': c?.accent ?? 'var(--gold)' }}>
      <div className="tile-top">
        <Cover src={event.cover ?? c?.cover} />
        <span className="tile-date"><b>{day(event.date)}</b>{month(event.date)}</span>
        <Icon name={c?.icon ?? 'calendar'} size={30} />
        <span className="tile-kind">{c ? c.name.split(' ')[0] : event.audience === 'city' ? event.city || 'City' : event.audience === 'public' ? 'Public' : 'Event'}</span>
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

// The top of Home: the city's photo full-bleed, a short line over it, and
// a glass panel of what's on. Signed-out visitors get the brand line and
// the way in; members get a greeting and their city. (David, Nov 10:
// "follow the images sent as examples".)
function Hero({ user, first, city, counts, me }) {
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <section className="hero-x">
      <Cover src={`/images/city/${city.toLowerCase().replace(/\s+/g, '-')}.jpg`} className="hero-x-photo" />
      <div className="hero-x-shade" aria-hidden="true" />
      <div className="hero-x-body">
        <span className="hero-x-eyebrow"><Icon name="map-pin" size={13} /> {city}, Nigeria</span>
        {user
          ? <h1>{greet}, <em>{first}</em>.</h1>
          : <h1>A new space for <em>people</em>, communities &amp; opportunities.</h1>}
        <p>{user ? `Here’s what’s happening around ${city} today.` : PURPOSE}</p>
        <div className="hero-x-actions">
          {user ? (
            <>
              <Link to="/city" className="btn primary">Explore {city} <Icon name="arrow" size={15} /></Link>
              <Link to="/add" className="btn glass"><Icon name="plus" size={15} /> Create</Link>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn primary">Get started <Icon name="arrow" size={15} /></Link>
              <Link to="/auth?mode=login" className="btn glass">Log in</Link>
            </>
          )}
        </div>
      </div>
      <div className="hero-x-side">
        {me}
        <nav className="hero-x-stats" aria-label={`What’s on in ${city}`}>
          <Link to="/events"><b>{counts.events}</b><span>Events</span></Link>
          <Link to="/jobs"><b>{counts.jobs}</b><span>Open jobs</span></Link>
          <Link to="/communities"><b>{counts.communities}</b><span>Communities</span></Link>
        </nav>
      </div>
    </section>
  )
}

// "Your Space": you, your numbers and your citizen level.
function YourSpace({ inHero = false }) {
  const { user, profile } = useApp()
  const [j, setJ] = useState(null)
  useEffect(() => { api.journey('me').then(setJ).catch(() => {}) }, [user?.id])
  return (
    <section className={inHero ? 'hero-x-me' : 'card home-side-card ys-card'}>
      <Link to="/profile/me" className="ys-me">
        <Avatar user={user} size={44} />
        <span><b>{user.name}</b><em>View profile</em></span>
      </Link>
      <div className="ys-stats">
        <Link to="/profile/me"><b>{profile.connections.length}</b><span>Connections</span></Link>
        <Link to="/communities?tab=mine"><b>{profile.communities.length}</b><span>Communities</span></Link>
        <Link to="/badges"><b>{j ? j.badges.length + j.custom.length : '–'}</b><span>Badges</span></Link>
      </div>
      {j && (
        <Link to="/badges" className="ys-level">
          <span><b>{j.level.name}</b>{j.next && <em>{j.toNext} pts to {j.next.name}</em>}</span>
          <span className="lv-bar"><span style={{ width: `${Math.max(4, j.progress)}%` }} /></span>
        </Link>
      )}
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
    const out = [<FeedPost key={p.id} post={p} onLoomed={(np) => np.audience !== 'community' && setFeed((f) => [np, ...(f || [])])} />]
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
      <Hero user={user} first={first} city={city} me={user ? <YourSpace inHero /> : null} counts={{
        events: [...madeEvents, ...EVENTS].length,
        jobs: jobs.length,
        communities: communities.filter((c) => (c.city || '').toLowerCase() === city.toLowerCase()).length || communities.length,
      }} />

      {/* Phones only: on larger screens the header search does this. */}
      <HomeSearch communities={communities} posts={posts} jobs={jobs} events={[...madeEvents, ...EVENTS]} />

      <div className="home-body">
        <div className="home-main">
          <StoriesRow />

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

        {/* Wide screens: what's around you sits beside the feed — Nuel's
            "Hybrid Experience" desktop concept (Nov 3): your space, your city
            on a map, then what's coming up and quick opportunities. */}
        <aside className="home-aside">
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
