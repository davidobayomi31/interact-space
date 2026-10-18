// Home — the feed and My City in one place (My City is no longer its own
// tab). Top to bottom: a slideshow of everything happening on Interact
// Space (latest posts and activity, events, jobs), a quick search, My City
// (the map of Nigeria, ads, communities to join, what's on)
// and, for members, their own space. Explore stays separate: Home shows
// what's happening around you; Explore is where you go looking.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { COMMUNITIES, EVENTS, PURPOSE, CHARTER, CITY_LINES, JOB_CATEGORIES } from '../data/seed.js'
import { CommunityCard, EventCard, SectionHead, CityLine } from '../components/bits.jsx'
import { useCommunities, findCommunity } from '../communities.js'
import { Icon } from '../components/Icons.jsx'
import { Eagle } from '../components/Eagle.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { NigeriaMap } from '../components/NigeriaMap.jsx'
import { HomeAds, useAds, pickSearchAd, SearchAd } from '../components/AdsRail.jsx'
import MySpace from './MySpace.jsx'

const SLIDE_MS = 6000
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const jobLabel = (id) => JOB_CATEGORIES.find((c) => c.id === id)?.label ?? id

// ── Slideshow: one thing happening at a time, advancing by itself ──────
function Slideshow({ slides }) {
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef(null)
  const n = slides.length
  const go = (i) => setAt(((i % n) + n) % n)

  useEffect(() => {
    if (paused || n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setAt((i) => (i + 1) % n), SLIDE_MS)
    return () => clearInterval(t)
  }, [paused, n])
  useEffect(() => { if (at >= n) setAt(0) }, [n, at])

  if (!n) return <div className="card slideshow empty"><p className="meta-dim">Nothing new yet — check back soon.</p></div>
  const s = slides[Math.min(at, n - 1)]
  return (
    <div className="slideshow" aria-roledescription="carousel" aria-label="Happening on Interact Space"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
        if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1))
      }}>
      <Link to={s.to} className={`slide ${s.image ? 'has-image' : ''}`} key={s.id} style={{ '--accent': s.accent }}
        aria-roledescription="slide" aria-label={`${at + 1} of ${n}: ${s.title}`}>
        {s.image && <img className="slide-image" src={s.image} alt="" />}
        <div className="slide-body">
          <span className="slide-kind"><Icon name={s.icon} size={12} /> {s.kind}</span>
          <strong className="slide-title">{s.title}</strong>
          {s.text && <p className="slide-text">{s.text}</p>}
          <span className="slide-meta">{s.meta}</span>
          <span className="slide-cta">{s.cta} <Icon name="arrow" size={13} /></span>
        </div>
      </Link>
      {n > 1 && (
        <>
          <button type="button" className="slide-nav prev" onClick={() => go(at - 1)} aria-label="Previous"><Icon name="back" size={16} /></button>
          <button type="button" className="slide-nav next" onClick={() => go(at + 1)} aria-label="Next"><Icon name="arrow" size={16} /></button>
          <div className="hx-dots" role="tablist" aria-label="Slides">
            {slides.map((x, i) => (
              <button key={x.id} type="button" role="tab" aria-selected={i === at} aria-label={`Slide ${i + 1}`}
                className={i === at ? 'on' : ''} onClick={() => go(i)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Quick search: a few results right here, everything else in Explore ──
function HomeSearch({ communities, posts, jobs, events }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const term = q.trim().toLowerCase()
  const has = (...fields) => term.split(/\s+/).every((w) => fields.flat().filter(Boolean).join(' ').toLowerCase().includes(w))
  const results = useMemo(() => (term.length < 2 ? [] : [
    ...communities.filter((c) => has(c.name, c.tagline, c.tags)).map((c) => ({ id: c.id, icon: 'community', kind: 'Community', title: c.name, to: `/community/${c.id}` })),
    ...events.filter((e) => has(e.title, e.venue, e.tags)).map((e) => ({ id: e.id, icon: 'calendar', kind: 'Event', title: e.title, to: e.communityId ? `/community/${e.communityId}?tab=events` : '/explore?type=events' })),
    ...jobs.filter((j) => has(j.title, j.area, j.category)).map((j) => ({ id: j.id, icon: 'wrench', kind: 'Job', title: j.title, to: `/jobs?job=${j.id}` })),
    ...posts.filter((p) => has(p.title, p.body)).map((p) => ({ id: p.id, icon: 'chat', kind: 'Post', title: p.title, to: `/post/${p.id}` })),
  ].slice(0, 5)), [term, communities, events, jobs, posts]) // eslint-disable-line
  const searchAd = pickSearchAd(useAds(), term)
  const submit = (e) => { e.preventDefault(); navigate(term ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore') }

  return (
    <section className="section home-search">
      <form className="explore-search" onSubmit={submit} role="search">
        <Icon name="search" size={18} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search Interact Space"
          placeholder="Search communities, events, jobs and posts…" />
        <button className="btn primary small">Search</button>
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
    </section>
  )
}

export default function Home() {
  const { user, profile, loading, setAssistantOpen } = useApp()
  const [posts, setPosts] = useState([])
  const [jobs, setJobs] = useState([])
  const [madeEvents, setMadeEvents] = useState([])
  const { all: communities, created } = useCommunities()

  useEffect(() => { api.listPosts().then(setPosts).catch(() => setPosts([])) }, [user])
  useEffect(() => { api.listJobs().then(setJobs).catch(() => setJobs([])) }, [user])
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.listEvents().then((list) => setMadeEvents(list.filter((e) => e.date >= today))).catch(() => {})
  }, [])

  const localTrending = COMMUNITIES.filter((c) => c.scope === 'local' && c.trending)
  const globalTrending = COMMUNITIES.filter((c) => c.scope === 'global')
  // Events members have planned come first, then the demo calendar.
  const upcoming = [...madeEvents.slice(0, 4), ...[...EVENTS].sort((a, b) => a.date.localeCompare(b.date))].slice(0, 4)
  const startTo = user ? '/communities/new' : '/auth'

  // Everything happening, interleaved so no one kind hogs the slideshow.
  const slides = useMemo(() => {
    const latest = [...posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4).map((p) => {
      const c = findCommunity(p.communityId)
      return {
        id: `p-${p.id}`, kind: 'Latest post', icon: 'chat', title: p.title, text: p.body,
        meta: `${p.author?.name ?? 'A member'}${c ? ` in ${c.name}` : ''} · ${p.ago} ago`, to: `/post/${p.id}`, cta: 'Read the post',
        accent: c?.accent, image: p.media?.find((m) => m.kind === 'image')?.src,
      }
    })
    const events = upcoming.slice(0, 3).map((e) => {
      const c = findCommunity(e.communityId)
      return {
        id: `e-${e.id}`, kind: 'Event', icon: 'calendar', title: e.title, text: e.description,
        meta: `${fmtDate(e.date)}${e.time ? ` · ${e.time}` : ''}${e.venue ? ` · ${e.venue}` : ''}`,
        to: c ? `/community/${c.id}?tab=events` : '/explore?type=events', cta: 'See the event', accent: c?.accent,
      }
    })
    const openJobs = jobs.slice(0, 3).map((j) => ({
      id: `j-${j.id}`, kind: j.verified ? 'Verified job' : 'Quick job', icon: 'wrench', title: j.title, text: j.description,
      meta: [jobLabel(j.category), j.area, j.budget].filter(Boolean).join(' · '), to: `/jobs?job=${j.id}`, cta: 'Open the job',
    }))
    const activity = created.slice(-2).reverse().map((c) => ({
      id: `c-${c.id}`, kind: 'New community', icon: 'community', title: c.name, text: c.tagline,
      meta: `${c.memberCount?.toLocaleString?.() ?? 1} members`, to: `/community/${c.id}`, cta: 'Take a look', accent: c.accent,
    }))
    const lanes = [latest, events, openJobs, activity]
    const out = []
    for (let i = 0; lanes.some((l) => l[i]); i++) lanes.forEach((l) => l[i] && out.push(l[i]))
    return out
  }, [posts, jobs, madeEvents, created]) // eslint-disable-line

  if (user && !loading && !profile.onboarded) return <Navigate to="/welcome" replace />
  const first = profile.name?.split(' ')[0]

  return (
    <div className="page home">
      <section className="home-head">
        {user ? (
          <>
            <h1>Welcome back, {first}</h1>
            <p className="meta-dim">Here’s what’s happening on Interact Space, around Lagos, and in your space.</p>
          </>
        ) : (
          <>
            <h1 className="hero-title"><span>Voices Of Individuals,</span> <span>Discovered Anywhere</span></h1>
            <p className="meta-dim">{PURPOSE}</p>
            <div className="hero-actions">
              <Link to="/auth" className="btn primary">Enter the city <Icon name="arrow" size={15} /></Link>
              <button className="btn brand-outline" onClick={() => setAssistantOpen(true)}><Eagle size={20} /> Ask the Companion</button>
            </div>
          </>
        )}
      </section>

      <section className="section home-feed">
        <SectionHead icon="zap" title="Happening now" sub="Latest posts, events and jobs across Interact Space" />
        <Slideshow slides={slides} />
      </section>

      <HomeSearch communities={communities} posts={posts} jobs={jobs} events={[...madeEvents, ...EVENTS]} />

      {/* ── My City ── */}
      <section className="section my-city" id="my-city">
        <SectionHead icon="map-pin" title="My City" sub="You’re looking at Lagos, Nigeria — the communities, events and local businesses around you" />
        <div className="city-band">
          <NigeriaMap liveCount={COMMUNITIES.filter((c) => c.scope === 'local').length + created.filter((c) => c.city === 'Lagos').length} startTo={startTo} />
          <HomeAds />
        </div>
      </section>

      <section className="section" id="trending-lagos">
        <SectionHead icon="community" title="Join a community in Lagos" sub="Local communities with the most life this week — tap Join to become part of one"
          action={<Link to={startTo} className="btn brand-outline small"><Icon name="plus" size={14} /> Start a community</Link>} />
        <div className="card-grid three">
          {localTrending.map((c) => <CommunityCard key={c.id} community={c} />)}
        </div>
      </section>

      <section className="section">
        <SectionHead icon="globe" title="Trending beyond Lagos" sub="Communities connecting Nigerian cities and the wider region" />
        <div className="card-grid two">
          {globalTrending.map((c) => <CommunityCard key={c.id} community={c} />)}
          <div className="card ghost-card">
            <Icon name="globe" size={26} />
            <p><strong>Starting in Lagos. Built to grow.</strong><br />
            Every community is independent — all share one Charter.</p>
            <ul className="charter-list">
              {CHARTER.slice(0, 3).map((c) => <li key={c}><Icon name="shield" size={12} /> {c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {created.length > 0 && (
        <section className="section">
          <SectionHead icon="sparkle" title="New in the city" sub="Communities members started recently" />
          <div className="card-grid three">
            {created.slice(-3).reverse().map((c) => <CommunityCard key={c.id} community={c} />)}
          </div>
        </section>
      )}

      <section className="section">
        <CityLine {...CITY_LINES.meet} />
      </section>

      <section className="section">
        <SectionHead icon="calendar" title="Happening soon" sub="Real rooms, real people — the city meets in person" />
        <div className="card-grid two">
          {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </section>

      {/* ── Your space (members) ── */}
      {user ? <MySpace /> : (
        <section className="section">
          <div className="card sign-in-nudge">
            <span className="meta-dim">Sign in to see your communities, events, connections and projects here.</span>
            <Link to="/auth" className="btn primary small">Sign in</Link>
          </div>
        </section>
      )}
    </div>
  )
}
