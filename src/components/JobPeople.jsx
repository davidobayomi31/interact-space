// Quick Jobs → Find people. Everyone who has said what work they do, as
// stacks of profile cards: one stack per occupation (Plumber, Electrician,
// Tutor…), each in its own colour. Tap the arrows or swipe to go through a
// stack; pick an occupation to see everyone in it at once.
// Real members only. "Jobs done" counts real hires; until someone has been
// hired the card says they're new rather than inventing a number.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { JOB_CATEGORIES } from '../data/seed.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Avatar, FavoriteButton } from './bits.jsx'

// What someone in each category is called, and the colour of their cards:
// muted, earthy tones that sit beside the logo's ink and paper.
export const OCCUPATIONS = {
  plumbing: { role: 'Plumber', tone: '#1f5f7a' },
  electrical: { role: 'Electrician', tone: '#a87410' },
  cleaning: { role: 'Cleaner', tone: '#2e7d6b' },
  moving: { role: 'Mover', tone: '#8a4b2a' },
  painting: { role: 'Painter', tone: '#c2462e' },
  carpentry: { role: 'Carpenter', tone: '#7a5230' },
  'appliance-repair': { role: 'Appliance Technician', tone: '#4a4f57' },
  gardening: { role: 'Gardener', tone: '#1e6b4f' },
  delivery: { role: 'Delivery Rider', tone: '#a3521b' },
  tutoring: { role: 'Tutor', tone: '#3d4f8a' },
  'photography-gig': { role: 'Photographer', tone: '#0b0b0b' },
  'event-help': { role: 'Event Hand', tone: '#8c3b5e' },
  'tech-support': { role: 'IT Technician', tone: '#2f4858' },
  'catering-gig': { role: 'Caterer', tone: '#b5502a' },
  'auto-repair': { role: 'Mechanic', tone: '#3b3b3b' },
}
const cat = (id) => JOB_CATEGORIES.find((c) => c.id === id) ?? { id, label: id, icon: 'wrench' }
const occ = (id) => OCCUPATIONS[id] ?? { role: cat(id).label, tone: '#0b0b0b' }

function ProCard({ pro, category }) {
  const { user } = useApp()
  const o = occ(category)
  const others = pro.jobSkills.filter((s) => s !== category)
  return (
    <article className="pro-card" style={{ '--tone': o.tone }}>
      <header className="pro-band">
        <Icon name={cat(category).icon} size={16} />
        <span>{o.role}</span>
      </header>
      <div className="pro-body">
        <div className="pro-who">
          <Avatar user={pro} size={58} />
          <div>
            <Link to={`/profile/${pro.id}`} className="pro-name">
              {pro.name}
              {pro.idVerified && <Icon name="badge-check" size={15} className="pro-tick" />}
            </Link>
            {pro.title && <div className="pro-title">{pro.title}</div>}
            <div className="pro-meta">
              {(pro.area || pro.city) && <span><Icon name="map-pin" size={12} /> {pro.area ? `${pro.area}, ${pro.city}` : pro.city}</span>}
              {pro.active && <span className="pro-active">Active now</span>}
            </div>
          </div>
        </div>
        <div className="pro-stats">
          {pro.jobsDone > 0
            ? <span><b>{pro.jobsDone}</b> {pro.jobsDone === 1 ? 'job' : 'jobs'} done on VOIDAJ</span>
            : <span className="pro-new">New on Quick Jobs</span>}
          {pro.idVerified && <span className="pro-verified"><Icon name="badge-check" size={12} /> ID verified</span>}
        </div>
        {others.length > 0 && (
          <div className="pro-also">
            Also does {others.slice(0, 3).map((s) => occ(s).role.toLowerCase()).join(', ')}{others.length > 3 ? ` +${others.length - 3}` : ''}
          </div>
        )}
        <div className="pro-actions">
          <Link to={user ? `/chats?dm=${pro.id}` : '/auth'} className="btn ghost small"><Icon name="message-circle" size={14} /> Message</Link>
          <Link to={user ? `/jobs?post=1&category=${category}` : '/auth'} className="btn primary small">Offer a job</Link>
          <FavoriteButton item={{ kind: 'person', id: pro.id, title: pro.name, subtitle: o.role, href: `/profile/${pro.id}` }} />
        </div>
      </div>
    </article>
  )
}

// A deck of cards fanned slightly so you can see there are more. Arrows or
// a sideways swipe move through it.
function Stack({ category, pros, onOpen }) {
  const [at, setAt] = useState(0)
  const touch = useRef(null)
  const n = pros.length
  const go = (d) => setAt((i) => (i + d + n) % n)
  const o = occ(category)
  return (
    <section className="pro-stack" style={{ '--tone': o.tone }} aria-label={`${o.role}s`}>
      <div className="pro-stack-head">
        <button type="button" className="pro-stack-title" onClick={onOpen}>
          <span className="pro-stack-icon"><Icon name={cat(category).icon} size={15} /></span>
          {o.role}s <span className="pro-stack-count">{n}</span>
        </button>
        {n > 1 && (
          <div className="pro-stack-nav">
            <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Previous"><Icon name="back" size={14} /></button>
            <span className="meta-dim">{at + 1} / {n}</span>
            <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Next"><Icon name="arrow" size={14} /></button>
          </div>
        )}
      </div>
      <div className="pro-deck"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
          if (n > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        }}>
        {/* The two cards behind peek out underneath the top one. */}
        {n > 2 && <div className="pro-ghost back2" aria-hidden="true" />}
        {n > 1 && <div className="pro-ghost back1" aria-hidden="true" />}
        <ProCard key={pros[at].id} pro={pros[at]} category={category} />
      </div>
    </section>
  )
}

export function JobPeople() {
  const [pros, setPros] = useState(null)
  const [pick, setPick] = useState('')
  useEffect(() => { api.listPros().then(setPros).catch(() => setPros([])) }, [])

  // Occupation → people who do it, busiest occupations first.
  const groups = useMemo(() => {
    const by = {}
    for (const p of pros ?? []) for (const s of p.jobSkills) (by[s] ??= []).push(p)
    // Within an occupation: most hires first, then specialists (people who do
    // fewer kinds of work) ahead of people who ticked everything, then verified.
    const rank = (a, b) => (b.jobsDone - a.jobsDone) || (a.jobSkills.length - b.jobSkills.length) || (Number(b.idVerified) - Number(a.idVerified))
    return JOB_CATEGORIES.map((c) => [c.id, (by[c.id] ?? []).sort(rank)]).filter(([, list]) => list.length)
      .sort((a, b) => b[1].length - a[1].length)
  }, [pros])

  if (pros === null) return <p className="meta-dim" style={{ marginTop: 24 }}>Loading people…</p>

  const chosen = groups.find(([id]) => id === pick)
  return (
    <div className="job-people">
      <p className="meta-dim job-people-intro">
        People near you who do this work. Anyone can appear here by choosing the work they do under <strong>Get notified for work</strong> in Find work
      </p>

      <div className="chip-row" role="tablist" aria-label="Occupation">
        <button role="tab" aria-selected={!pick} className={!pick ? 'on' : ''} onClick={() => setPick('')}>Everyone</button>
        {groups.map(([id, list]) => (
          <button key={id} role="tab" aria-selected={pick === id} className={pick === id ? 'on' : ''} onClick={() => setPick(id)}
            style={{ '--tone': occ(id).tone }}>
            <span className="chip-dot" aria-hidden="true" /> {occ(id).role}s <span className="filter-count">{list.length}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card ghost-card left" style={{ marginTop: 20 }}>
          <Icon name="users" size={22} />
          <p><strong>No one has listed their work yet.</strong><br />Be the first: choose what you can do, and people looking for help will find you here.</p>
        </div>
      ) : chosen ? (
        <div className="pro-grid">
          {chosen[1].map((p) => <ProCard key={p.id} pro={p} category={chosen[0]} />)}
        </div>
      ) : (
        <div className="pro-stacks">
          {groups.map(([id, list]) => <Stack key={id} category={id} pros={list} onOpen={() => setPick(id)} />)}
        </div>
      )}
    </div>
  )
}
