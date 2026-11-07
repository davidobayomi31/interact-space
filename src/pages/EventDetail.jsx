// One event, opened from its card (Nuel, Oct 29: "when I tap on this I
// would like it to show details about it and the organizers"). Cover,
// date, time and place, what it's about, who is organising it (with a
// message button), and who's going. Join is the same RSVP as the list.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EVENTS } from '../data/seed.js'
import { findCommunity } from '../communities.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { Avatar } from '../components/bits.jsx'

const dayOf = (d) => new Date(d + 'T00:00:00')

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useApp()
  const navigate = useNavigate()
  const demo = useMemo(() => EVENTS.find((e) => e.id === id), [id])
  const [made, setMade] = useState(null)
  const [people, setPeople] = useState({ organizers: [], going: [] })
  const [rsvps, setRsvps] = useState({ counts: {}, mine: [] })
  const [loaded, setLoaded] = useState(false)

  const event = made ?? demo
  useEffect(() => { window.scrollTo(0, 0) }, [id])
  useEffect(() => {
    const qs = new URLSearchParams()
    if (demo?.host) qs.set('host', demo.host)
    if (demo?.communityId) qs.set('community', demo.communityId)
    api.eventPeople(id, Object.fromEntries(qs))
      .then((d) => { if (d.event) setMade(d.event); setPeople({ organizers: d.organizers || [], going: d.going || [] }) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [id, demo])
  useEffect(() => { api.listRsvps().then(setRsvps).catch(() => {}) }, [user?.id])

  if (!event) {
    return (
      <div className="page">
        <div className="card feed-empty">
          <IconTile name="calendar" tone="pink" size={52} />
          <strong>{loaded ? 'Event not found' : 'Loading…'}</strong>
          {loaded && <Link className="btn primary small" to="/events">See all events</Link>}
        </div>
      </div>
    )
  }

  const c = findCommunity(event.communityId)
  const d = dayOf(event.date)
  const going = rsvps.mine.includes(event.id)
  const count = (event.attending ?? 0) + (rsvps.counts[event.id] ?? 0)
  const cover = event.cover || c?.cover
  const where = c ? c.name : event.audience === 'city' ? event.city || 'Your city' : 'Public'

  const join = async () => {
    if (!user) return navigate('/auth')
    setRsvps((r) => ({ counts: { ...r.counts, [event.id]: (r.counts[event.id] ?? 0) + (going ? -1 : 1) }, mine: going ? r.mine.filter((x) => x !== event.id) : [...r.mine, event.id] }))
    setPeople((p) => ({ ...p, going: going ? p.going.filter((u) => u.id !== user.id) : [user, ...p.going] }))
    try { await api.rsvp(event.id) } catch { api.listRsvps().then(setRsvps).catch(() => {}) }
  }
  const share = async () => {
    const url = `${location.origin}/event/${event.id}`
    try { if (navigator.share) await navigator.share({ title: event.title, url }); else await navigator.clipboard.writeText(url) } catch { /* closed */ }
  }

  return (
    <div className="page evd-page">
      <button className="btn ghost small evd-back" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/events'))}><Icon name="back" size={16} /> Events</button>

      <article className="card evd-hero" style={{ '--accent': c?.accent ?? '#3B82F6' }}>
        <div className="evd-cover">
          {cover ? <img src={cover} alt="" /> : <span className="ev-photo-fallback"><Icon name="calendar" size={48} /></span>}
          <span className="ev-date"><b>{d.toLocaleDateString('en-GB', { day: 'numeric' })}</b>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
        </div>
        <div className="evd-main">
          <h1>{event.title}</h1>
          <ul className="evd-facts">
            <li><Icon name="calendar" size={16} /> {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{event.time ? ` · ${event.time}` : ''}</li>
            {event.venue && <li><Icon name="map-pin" size={16} /> {event.venue}</li>}
            <li><Icon name={c ? 'community' : event.audience === 'city' ? 'map-pin' : 'globe'} size={16} /> {c ? <Link to={`/community/${c.id}?tab=events`}>{where}</Link> : where}</li>
            <li><Icon name="users" size={16} /> {count} going</li>
          </ul>
          <div className="evd-actions">
            <button className={`btn ${going ? 'ghost ev-going' : 'primary'}`} onClick={join}>{going ? <><Icon name="check" size={15} /> Going</> : 'Join event'}</button>
            <button className="btn ghost" onClick={share}><Icon name="share" size={15} /> Share</button>
          </div>
        </div>
      </article>

      {event.description && (
        <section className="card evd-section">
          <h2>About this event</h2>
          <p>{event.description}</p>
          {event.tags?.length > 0 && <div className="evd-tags">{event.tags.map((t) => <Link key={t} to={`/tag/${t.replace(/[^a-z0-9_]/gi, '').toLowerCase()}`}>#{t}</Link>)}</div>}
        </section>
      )}

      <section className="card evd-section">
        <h2>Organisers</h2>
        {people.organizers.length === 0 && <p className="meta-dim">{loaded ? 'No organiser listed yet.' : 'Loading…'}</p>}
        <ul className="evd-people">
          {people.organizers.map(({ user: u, role }) => (
            <li key={u.id}>
              <Link to={`/profile/${u.id}`} className="evd-person"><Avatar user={u} size={44} /><span><b>{u.name}</b><em>{role}{u.handle ? ` · ${u.handle}` : ''}</em></span></Link>
              {user?.id !== u.id && <Link className="btn ghost small" to={user ? `/chats?dm=${u.id}&event=${event.id}` : '/auth'}><Icon name="message-circle" size={14} /> Message</Link>}
            </li>
          ))}
        </ul>
      </section>

      <section className="card evd-section">
        <h2>Who’s going <span className="meta-dim">· {count}</span></h2>
        {people.going.length === 0
          ? <p className="meta-dim">Tap Join and you’ll show up here.</p>
          : <div className="evd-faces">{people.going.slice(0, 24).map((u) => <Link key={u.id} to={`/profile/${u.id}`} title={u.name}><Avatar user={u} size={38} /></Link>)}</div>}
      </section>
    </div>
  )
}
