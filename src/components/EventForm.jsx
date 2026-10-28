// The event form, shared by Add Hub and a community's Events tab. Given a
// `community` it's fixed to that community; without one it starts Public
// and lets you pick Public, your City or one of your communities — events
// don't have to go through a community (Nuel, Oct 28).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { findCommunity } from '../communities.js'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { AUDIENCES } from './Feed.jsx'
import { CoverPicker } from './CoverPicker.jsx'

const blank = { title: '', date: '', time: '', venue: '', description: '', cover: '' }

export function EventForm({ community, onCreated, onCancel, heading }) {
  const { profile } = useApp()
  const [form, setForm] = useState(blank)
  const [audience, setAudience] = useState(community ? 'community' : 'public')
  const [communityId, setCommunityId] = useState(community?.id ?? profile.communities[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const today = new Date().toISOString().slice(0, 10)
  const city = profile.city || 'Lagos'
  const mine = profile.communities.map(findCommunity).filter(Boolean)
  const ready = form.title.trim() && form.date && (audience !== 'community' || communityId)

  const submit = async (e) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true); setError('')
    try {
      const ev = community
        ? await api.createEvent(community.id, form)
        : await api.createOpenEvent({ ...form, audience, communityId: audience === 'community' ? communityId : undefined })
      setForm(blank)
      onCreated(ev)
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <form className="card composer-full event-form" onSubmit={submit}>
      {heading && <div className="side-card-head"><Icon name="calendar" size={15} /> {heading}</div>}
      {!community && (
        <>
          <div className="fc-audience" role="radiogroup" aria-label="Who is this event for?">
            {AUDIENCES.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={audience === a.id} className={audience === a.id ? 'on' : ''} onClick={() => setAudience(a.id)}>
                <Icon name={a.icon} size={14} /> {a.id === 'city' ? city : a.label}
              </button>
            ))}
          </div>
          {audience === 'community' && (
            mine.length ? (
              <select className="job-select" value={communityId} onChange={(e) => setCommunityId(e.target.value)} aria-label="Community">
                {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : <p className="meta-dim">Join a community first to make an event in it. <Link to="/communities">Find one</Link></p>
          )}
        </>
      )}
      <input className="composer-title" value={form.title} onChange={set('title')} placeholder="What’s happening?" maxLength={100} autoFocus aria-label="Event title" />
      <div className="job-form-row two">
        <input className="job-input" type="date" min={today} value={form.date} onChange={set('date')} aria-label="Date" required />
        <input className="job-input" value={form.time} onChange={set('time')} placeholder="Time (e.g. 6:00 PM)" maxLength={20} aria-label="Time" />
      </div>
      <input className="job-input" value={form.venue} onChange={set('venue')} placeholder="Where? (venue, area, or Online)" maxLength={100} aria-label="Venue" />
      <textarea className="composer-body" value={form.description} onChange={set('description')} placeholder="Tell people what to expect (optional)" rows={3} maxLength={600} />
      <CoverPicker kind="event" label="Event photo (optional)" value={form.cover} onChange={(cover) => setForm((f) => ({ ...f, cover }))} onBusy={setUploading} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="composer-foot">
        {onCancel && <button type="button" className="btn ghost small" onClick={onCancel}>Cancel</button>}
        <button className="btn primary small" disabled={!ready || busy || uploading}>{busy ? 'Creating…' : 'Create event'}</button>
      </div>
    </form>
  )
}
