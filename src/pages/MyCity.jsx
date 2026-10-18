// My City — local life in one place: what's happening nearby, local
// communities, jobs and businesses, all in the member's city (Lagos for
// now). A main tab again, as the VOIDAJ feature map has it; Home links
// here through its "Explore your city" card.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES, EVENTS } from '../data/seed.js'
import { CommunityCard, EventCard } from '../components/bits.jsx'
import { useCommunities } from '../communities.js'
import { Icon } from '../components/Icons.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { NigeriaMap } from '../components/NigeriaMap.jsx'
import { HomeAds } from '../components/AdsRail.jsx'
import { JobCard } from './Jobs.jsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'communities', label: 'Communities', icon: 'community' },
  { id: 'jobs', label: 'Jobs', icon: 'wrench' },
  { id: 'businesses', label: 'Businesses', icon: 'store' },
]

export default function MyCity() {
  const { user, profile } = useApp()
  const [filter, setFilter] = useState('all')
  const [jobs, setJobs] = useState([])
  const [madeEvents, setMadeEvents] = useState([])
  const { created } = useCommunities()
  const city = profile.city || 'Lagos'

  useEffect(() => { api.listJobs().then(setJobs).catch(() => setJobs([])) }, [user])
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.listEvents().then((list) => setMadeEvents(list.filter((e) => e.date >= today))).catch(() => {})
  }, [])

  const local = [...COMMUNITIES.filter((c) => c.scope === 'local'), ...created.filter((c) => c.city === city)]
  const events = [...madeEvents, ...[...EVENTS].sort((a, b) => a.date.localeCompare(b.date))].slice(0, 6)
  const startTo = user ? '/communities/new' : '/auth'
  const show = (id) => filter === 'all' || filter === id

  return (
    <div className="page city-page">
      <section className="page-head">
        <div>
          <h1><Icon name="map-pin" size={22} /> My City</h1>
          <p className="meta-dim">What’s happening around you in {city}, Nigeria.</p>
        </div>
        <span className="city-chip"><Icon name="map-pin" size={13} /> {city}</span>
      </section>

      <div className="chip-row" role="tablist" aria-label="What to show">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
            {f.icon && <Icon name={f.icon} size={13} />} {f.label}
          </button>
        ))}
      </div>

      {filter === 'all' && (
        <section className="section city-band">
          <NigeriaMap liveCount={local.length} startTo={startTo} />
          <HomeAds />
        </section>
      )}

      {show('events') && (
        <section className="section">
          <div className="row-head"><h2>Events nearby</h2><Link to="/explore?type=events">See all <Icon name="arrow" size={13} /></Link></div>
          <div className="card-grid two">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
        </section>
      )}

      {show('communities') && (
        <section className="section">
          <div className="row-head">
            <h2>Communities in {city}</h2>
            <Link to={startTo}><Icon name="plus" size={13} /> Start one</Link>
          </div>
          <div className="card-grid three">{local.map((c) => <CommunityCard key={c.id} community={c} />)}</div>
        </section>
      )}

      {show('jobs') && (
        <section className="section">
          <div className="row-head"><h2>Jobs nearby</h2><Link to="/jobs">See all <Icon name="arrow" size={13} /></Link></div>
          {jobs.length
            ? <div className="card-grid two">{jobs.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}</div>
            : <p className="meta-dim">No open jobs right now. <Link to="/jobs?post=1">Post one</Link>.</p>}
        </section>
      )}

      {filter === 'businesses' && (
        <section className="section">
          <div className="row-head"><h2>Local businesses</h2></div>
          <HomeAds max={12} />
        </section>
      )}
    </div>
  )
}
