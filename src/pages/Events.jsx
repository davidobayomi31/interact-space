// Events — screen 8 of Nuel's mockup: Upcoming · Trending · My Events,
// big photo cards with the date, place and a Join button. Join is a real
// RSVP; My Events is everything you've joined.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EVENTS } from '../data/seed.js'
import { findCommunity } from '../communities.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon, IconTile } from '../components/Icons.jsx'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'trending', label: 'Trending' },
  { id: 'mine', label: 'My Events' },
]
const dayOf = (d) => new Date(d + 'T00:00:00')

function EventBig({ event, going, count, onJoin }) {
  const c = findCommunity(event.communityId)
  const d = dayOf(event.date)
  const soon = (d - new Date()) / 86400000
  const cover = event.cover ?? c?.cover
  return (
    <article className="ev-card card-link" style={{ '--accent': c?.accent ?? '#3B82F6' }}>
      <Link to={c ? `/community/${c.id}?tab=events` : '/events'} className="ev-photo" aria-label={event.title}>
        {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="ev-photo-fallback"><Icon name="calendar" size={36} /></span>}
        <span className="ev-date"><b>{d.toLocaleDateString('en-GB', { day: 'numeric' })}</b>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
        {soon >= -0.5 && soon < 1 && <span className="ev-live">TODAY</span>}
      </Link>
      <div className="ev-body">
        <div className="ev-text">
          <b>{event.title}</b>
          <span><Icon name="clock" size={12} /> {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {event.time}</span>
          {event.venue && <span><Icon name="map-pin" size={12} /> {event.venue}</span>}
          <em>{count} going{c ? ` · ${c.name}` : ''}</em>
        </div>
        <button className={`btn small ${going ? 'ghost ev-going' : 'primary'}`} onClick={onJoin}>
          {going ? <><Icon name="check" size={13} /> Going</> : 'Join'}
        </button>
      </div>
    </article>
  )
}

export default function Events() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'upcoming'
  const setTab = (t) => setParams(t === 'upcoming' ? {} : { tab: t }, { replace: true })
  const [made, setMade] = useState([])
  const [rsvps, setRsvps] = useState({ counts: {}, mine: [] })

  useEffect(() => { api.listEvents().then(setMade).catch(() => {}) }, [])
  useEffect(() => { api.listRsvps().then(setRsvps).catch(() => {}) }, [user?.id])

  const today = new Date().toISOString().slice(0, 10)
  const all = useMemo(() => [...made, ...EVENTS.filter((e) => !made.some((m) => m.id === e.id))], [made])
  const count = (e) => (e.attending ?? 0) + (rsvps.counts[e.id] ?? 0)
  const upcoming = all.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const list = {
    upcoming,
    trending: [...upcoming].sort((a, b) => count(b) - count(a)),
    mine: all.filter((e) => rsvps.mine.includes(e.id)).sort((a, b) => a.date.localeCompare(b.date)),
  }[tab]
  // The demo city calendar is dated in July; if it has all passed, show it anyway.
  const shown = list.length || tab === 'mine' ? list : [...all].sort((a, b) => a.date.localeCompare(b.date))

  const join = async (e) => {
    if (!user) return navigate('/auth')
    const going = rsvps.mine.includes(e.id)
    setRsvps((r) => ({ counts: { ...r.counts, [e.id]: (r.counts[e.id] ?? 0) + (going ? -1 : 1) }, mine: going ? r.mine.filter((x) => x !== e.id) : [...r.mine, e.id] }))
    try { await api.rsvp(e.id) } catch { api.listRsvps().then(setRsvps).catch(() => {}) }
  }

  return (
    <div className="page ev-page">
      <header className="page-head">
        <h1>Events</h1>
        <p className="meta-dim">Discover, create and manage events.</p>
      </header>
      <div className="seg" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}{t.id === 'mine' && rsvps.mine.length > 0 ? ` (${rsvps.mine.length})` : ''}</button>)}
      </div>

      {shown.length === 0 ? (
        <div className="card feed-empty">
          <IconTile name="calendar" tone="pink" size={52} />
          <strong>No events yet</strong>
          <span className="meta-dim">Tap Join on an event and it shows up here.</span>
          <button className="btn primary small" onClick={() => setTab('upcoming')}>See upcoming events</button>
        </div>
      ) : (
        <div className="ev-list stagger">
          {shown.map((e) => <EventBig key={e.id} event={e} going={rsvps.mine.includes(e.id)} count={count(e)} onJoin={() => join(e)} />)}
        </div>
      )}

      <Link to={user ? '/add?pick=event' : '/auth'} className="card cm-create card-link">
        <IconTile name="plus" tone="pink" size={44} />
        <span><b>Create an event</b><em>Plan a meetup, class or gathering for a community</em></span>
        <Icon name="chevron-right" size={20} />
      </Link>
    </div>
  )
}
