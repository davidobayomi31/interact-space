// My City — the map page from Nuel's mockup. Tapping a city on the map
// switches everything to that city: the selected-place card, the photo
// tiles, the events, jobs and communities below, and the ads (Nuel,
// Oct 25: "anytime someone taps on a place on the map everything
// switches to suggestions of the things there … same with the ads").
// Businesses and Trips are coming soon.
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES, EVENTS } from '../data/seed.js'
import { CommunityCard, EventCard } from '../components/bits.jsx'
import { useCommunities, findCommunity } from '../communities.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { CITIES } from '../components/NigeriaMap.jsx'
// The map library is big, so it loads only when My City opens.
const CityMap = lazy(() => import('../components/CityMap.jsx').then((m) => ({ default: m.CityMap })))
import { HomeAds } from '../components/AdsRail.jsx'
import { JobCard } from './Jobs.jsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'jobs', label: 'Jobs', icon: 'wrench' },
  { id: 'communities', label: 'Communities', icon: 'community' },
  { id: 'trips', label: 'Trips', icon: 'car', soon: true },
  { id: 'businesses', label: 'Businesses', icon: 'store', soon: true },
]

// Seeded events don't carry a city; they're Lagos, like their communities.
const eventCity = (e) => e.city || findCommunity(e.communityId)?.city || 'Lagos'

export default function MyCity() {
  const { user, profile, place, setPlace } = useApp()
  const [filter, setFilter] = useState('all')
  const [jobs, setJobs] = useState([])
  const [madeEvents, setMadeEvents] = useState([])
  const { created } = useCommunities()
  const home = profile.city || 'Lagos'
  const city = place

  useEffect(() => { api.listJobs().then(setJobs).catch(() => setJobs([])) }, [user])
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.listEvents().then((list) => setMadeEvents(list.filter((e) => e.date >= today))).catch(() => {})
  }, [])

  const same = (a) => (a || '').toLowerCase() === city.toLowerCase()
  const allEvents = [...madeEvents, ...[...EVENTS].sort((a, b) => a.date.localeCompare(b.date))]
  const events = allEvents.filter((e) => same(eventCity(e))).slice(0, 6)
  const cityJobs = jobs.filter((j) => same(j.city || 'Lagos'))
  const local = [...COMMUNITIES, ...created].filter((c) => c.scope !== 'global' && same(c.city))
  const global = COMMUNITIES.filter((c) => c.scope === 'global')
  const startTo = user ? '/communities/new' : '/auth'
  const show = (id) => filter === 'all' || filter === id
  const counts = Object.fromEntries(CITIES.map((c) => {
    const s = (x) => (x || '').toLowerCase() === c.name.toLowerCase()
    return [c.name, allEvents.filter((e) => s(eventCity(e))).length + jobs.filter((j) => s(j.city || 'Lagos')).length]
  }))
  const soon = FILTERS.find((f) => f.id === filter)?.soon
  const photo = CITIES.find((c) => same(c.name))?.photo

  return (
    <div className="page city-page city2">
      <section className="page-head city2-head">
        <div>
          <h1>My City</h1>
          <p className="meta-dim">What’s happening around you in {city}, Nigeria.</p>
        </div>
        {!same(home) && <button className="btn ghost small" onClick={() => setPlace(null)}><Icon name="navigation" size={13} /> Back to {home}</button>}
      </section>

      <div className="chip-row float-bar" role="tablist" aria-label="What to show">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
            {f.icon && <Icon name={f.icon} size={13} />} {f.label}{f.soon && <span className="soon-badge">Soon</span>}
          </button>
        ))}
      </div>

      {soon ? (
        <section className="card feed-empty">
          <IconTile name={filter === 'trips' ? 'car' : 'store'} tone={filter === 'trips' ? 'indigo' : 'green'} size={56} />
          <strong>{filter === 'trips' ? 'Trips' : 'Businesses'} are coming soon</strong>
          <span className="meta-dim">
            {filter === 'trips'
              ? 'Find people going your way, share rides and plan group travel across Nigeria.'
              : `Shops, brands and services in ${city}, with their own pages. Until then, local businesses advertise beside the page.`}
          </span>
        </section>
      ) : (
        <>
          <section className="city-map-card">
            <Suspense fallback={<div className="cm"><div className="cm-canvas" /></div>}><CityMap value={city} onPick={setPlace} counts={counts} /></Suspense>
            <div className="city-place glass" key={city}>
              {photo ? <img className="city-place-photo" src={photo} alt="" /> : <IconTile name="map-pin" tone="grad" size={44} />}
              <div>
                <strong>{city}</strong>
                <span>{events.length} events · {cityJobs.length} jobs · {local.length} local communities</span>
              </div>
              <span className="city-place-hint">Tap a city on the map</span>
            </div>
          </section>

          {filter === 'all' && (
            <div className="city-tiles stagger" key={`tiles-${city}`}>
              <button className="city-tile" onClick={() => setFilter('events')} style={{ '--img': `url(${events.find((e) => e.cover)?.cover || '/images/events/ev-market-popup.jpg'})` }}>
                <b>Events</b><span>{events.length ? `${events.length} this month` : 'None yet'}</span>
              </button>
              <button className="city-tile" onClick={() => setFilter('jobs')} style={{ '--img': 'url(/images/events/ev-solar-workshop.jpg)' }}>
                <b>Jobs near you</b><span>{cityJobs.length} open</span>
              </button>
              <button className="city-tile" onClick={() => setFilter('communities')} style={{ '--img': `url(${local[0]?.cover ?? '/images/communities/african-startup-network.jpg'})` }}>
                <b>Communities</b><span>{local.length || global.length} to join</span>
              </button>
              <button className="city-tile soon" onClick={() => setFilter('trips')} style={{ '--img': 'url(/images/city/lagos.jpg)' }}>
                <b>Ride share</b><span>Coming soon</span>
              </button>
            </div>
          )}

          {filter === 'all' && <section className="city-ads-phone"><HomeAds /></section>}

          {show('events') && (
            <section className="section">
              <div className="row-head"><h2>Events in {city}</h2><Link to="/events">See all <Icon name="arrow" size={13} /></Link></div>
              {events.length
                ? <div className="card-grid two">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
                : <p className="meta-dim">No events in {city} yet. {user ? <Link to="/add?pick=event">Plan the first one</Link> : null}</p>}
            </section>
          )}

          {show('jobs') && (
            <section className="section">
              <div className="row-head"><h2>Jobs in {city}</h2><Link to="/jobs">See all <Icon name="arrow" size={13} /></Link></div>
              {cityJobs.length
                ? <div className="card-grid two">{cityJobs.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}</div>
                : <p className="meta-dim">No open jobs in {city} right now. <Link to="/jobs?post=1">Post one</Link>.</p>}
            </section>
          )}

          {show('communities') && (
            <section className="section">
              <div className="row-head">
                <h2>Communities in {city}</h2>
                <Link to={startTo}><Icon name="plus" size={13} /> Start one</Link>
              </div>
              {local.length
                ? <div className="card-grid three">{local.map((c) => <CommunityCard key={c.id} community={c} />)}</div>
                : <p className="meta-dim">No local communities in {city} yet. <Link to={startTo}>Start the first one</Link> — or join one that’s open everywhere:</p>}
              {!local.length && <div className="card-grid three">{global.map((c) => <CommunityCard key={c.id} community={c} />)}</div>}
            </section>
          )}
        </>
      )}
    </div>
  )
}
