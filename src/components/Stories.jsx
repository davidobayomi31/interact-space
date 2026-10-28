// ── Status ───────────────────────────────────────────────────────────
// Nuel: "introduce individual status upload". A row of rings at the top
// of Home, like the mockup's "Add Story" row. Each person's statuses play
// one after another, five seconds each; tap the right side to skip, the
// left to go back. A status is a photo or a line of text on a gradient,
// and it disappears after 24 hours.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Avatar } from './bits.jsx'
import { compressPhoto } from './Media.jsx'

const BACKGROUNDS = [
  'linear-gradient(135deg, #3B82F6, #8B5CF6)',
  'linear-gradient(135deg, #00C896, #3B82F6)',
  'linear-gradient(135deg, #F97316, #EC4899)',
  'linear-gradient(135deg, #0B1F3B, #2563EB)',
  'linear-gradient(135deg, #7C3AED, #EC4899)',
]
const STEP_MS = 5000

export function StoriesRow() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [open, setOpen] = useState(null) // index into groups
  const [adding, setAdding] = useState(false)
  const load = () => api.listStatuses().then(setGroups).catch(() => setGroups([]))
  useEffect(() => { load() }, [user?.id])

  const mine = groups.find((g) => g.mine)
  const others = groups.filter((g) => !g.mine)

  return (
    <div className="stories" aria-label="Status">
      <div className="stories-track">
        <button className="story story-add" onClick={() => (user ? (mine ? setOpen(groups.indexOf(mine)) : setAdding(true)) : navigate('/auth'))}>
          <span className={`story-ring ${mine ? '' : 'none'}`}>
            {user ? <Avatar user={user} size={58} /> : <span className="story-blank"><Icon name="user" size={24} /></span>}
            <span className="story-plus" onClick={(e) => { e.stopPropagation(); user ? setAdding(true) : navigate('/auth') }} role="button" aria-label="Add a status">
              <Icon name="plus" size={13} />
            </span>
          </span>
          <span className="story-name">{mine ? 'Your status' : 'Add status'}</span>
        </button>
        {others.map((g) => (
          <button key={g.user.id} className="story" onClick={() => setOpen(groups.indexOf(g))}>
            <span className={`story-ring ${g.seen ? 'seen' : ''}`}>
              <StoryThumb group={g} />
            </span>
            <span className="story-name">{g.user.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
      {open !== null && groups[open] && (
        <StoryViewer groups={groups} start={open} onClose={() => { setOpen(null); load() }} onAdd={() => { setOpen(null); setAdding(true) }} />
      )}
      {adding && <AddStatus onClose={() => setAdding(false)} onPosted={() => { setAdding(false); load() }} />}
    </div>
  )
}

// The ring shows their latest photo if there is one, otherwise their face.
function StoryThumb({ group }) {
  const last = group.statuses[group.statuses.length - 1]
  if (last.image) return <img className="story-thumb" src={last.image} alt="" loading="lazy" />
  return <Avatar user={group.user} size={58} />
}

function StoryViewer({ groups, start, onClose, onAdd }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [g, setG] = useState(start)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const group = groups[g]
  const status = group?.statuses[i]

  const next = () => {
    if (i < group.statuses.length - 1) { setI(i + 1); setElapsed(0) }
    else if (g < groups.length - 1) { setG(g + 1); setI(0); setElapsed(0) }
    else onClose()
  }
  const prev = () => {
    if (i > 0) { setI(i - 1); setElapsed(0) }
    else if (g > 0) { setG(g - 1); setI(groups[g - 1].statuses.length - 1); setElapsed(0) }
  }

  // Count each one as seen.
  useEffect(() => { if (status && user && !group.mine) api.viewStatus(status.id).catch(() => {}) }, [status?.id]) // eslint-disable-line

  // The progress bar and auto-advance.
  const tick = useRef(null)
  useEffect(() => {
    if (paused || !status) return
    const began = Date.now() - elapsed
    tick.current = setInterval(() => {
      const e = Date.now() - began
      if (e >= STEP_MS) { clearInterval(tick.current); next() } else setElapsed(e)
    }, 50)
    return () => clearInterval(tick.current)
  }, [g, i, paused]) // eslint-disable-line

  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  })

  if (!status) return null
  const remove = async () => {
    if (!confirm('Delete this status?')) return
    await api.deleteStatus(status.id).catch(() => {})
    onClose()
  }

  return (
    <div className="story-viewer" role="dialog" aria-label={`${group.user.name}’s status`}>
      <div className="story-stage" style={status.image ? undefined : { background: status.bg || BACKGROUNDS[0] }}
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        {status.image && <img className="story-photo" src={status.image} alt="" />}
        {status.text && <p className={`story-text ${status.image ? 'caption' : ''}`}>{status.text}</p>}

        <div className="story-bars">
          {group.statuses.map((s, n) => (
            <span key={s.id}><i style={{ width: n < i ? '100%' : n === i ? `${(elapsed / STEP_MS) * 100}%` : '0%' }} /></span>
          ))}
        </div>
        <div className="story-head">
          <button className="story-who" onClick={() => navigate(`/profile/${group.mine ? 'me' : group.user.id}`)}>
            <Avatar user={group.user} size={34} />
            <span><b>{group.mine ? 'You' : group.user.name}</b><em>{status.ago} ago</em></span>
          </button>
          <div className="story-tools">
            {group.mine && <button onClick={onAdd} aria-label="Add another status"><Icon name="plus" size={18} /></button>}
            {group.mine && <button onClick={remove} aria-label="Delete this status"><Icon name="trash" size={18} /></button>}
            <button onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
          </div>
        </div>
        <button className="story-tap left" onClick={prev} aria-label="Previous" />
        <button className="story-tap right" onClick={next} aria-label="Next" />
      </div>
    </div>
  )
}

function AddStatus({ onClose, onPosted }) {
  const fileRef = useRef(null)
  const [image, setImage] = useState('')
  const [text, setText] = useState('')
  const [bg, setBg] = useState(BACKGROUNDS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    try { setImage((await compressPhoto(f)).src) } catch (err) { setError(err.message) }
  }
  const share = async () => {
    if (busy || (!image && !text.trim())) return
    setBusy(true); setError('')
    try { await api.postStatus({ image, text, bg: image ? '' : bg }); onPosted() }
    catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card status-composer" onClick={(e) => e.stopPropagation()}>
        <div className="side-card-head"><Icon name="plus-circle" size={16} /> New status <span className="meta-dim">· disappears after 24 hours</span></div>
        <div className="status-preview" style={image ? undefined : { background: bg }}>
          {image && <img src={image} alt="" />}
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 240))} rows={image ? 2 : 4}
            placeholder={image ? 'Add a caption…' : 'What’s on your mind?'} className={image ? 'caption' : ''} autoFocus />
        </div>
        <div className="status-tools">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
          <button type="button" className="btn ghost small" onClick={() => fileRef.current?.click()}><Icon name="image" size={15} /> {image ? 'Change photo' : 'Photo'}</button>
          {image && <button type="button" className="btn ghost small" onClick={() => setImage('')}><Icon name="x" size={14} /> Text only</button>}
          {!image && (
            <span className="status-swatches" role="radiogroup" aria-label="Background">
              {BACKGROUNDS.map((b) => <button key={b} type="button" role="radio" aria-checked={bg === b} className={bg === b ? 'on' : ''} style={{ background: b }} onClick={() => setBg(b)} />)}
            </span>
          )}
        </div>
        {error && <p className="auth-error">{error}</p>}
        <div className="composer-foot">
          <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>
          <button className="btn primary small" onClick={share} disabled={busy || (!image && !text.trim())}>{busy ? 'Sharing…' : 'Share status'}</button>
        </div>
      </div>
    </div>
  )
}
