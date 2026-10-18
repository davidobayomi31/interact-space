// Voices — different versions of one person for different audiences.
// Voidaj is "Voices Of Individuals": your main profile is one voice, and you
// can add up to three more (a work voice, a creative voice…), each with its
// own @username and only the sections you choose. Hand colleagues your work
// voice; everyone else gets your main profile.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

// The cards a member picks from when building a voice.
export const SECTION_CATALOG = [
  { id: 'about', label: 'About me', icon: 'user', blurb: 'A few lines in your own words' },
  { id: 'interests', label: 'Interests', icon: 'heart', blurb: 'What you’re into' },
  { id: 'skills', label: 'Skills', icon: 'zap', blurb: 'What you’re good at' },
  { id: 'work', label: 'Work', icon: 'briefcase', blurb: 'Roles and where you’ve done them' },
  { id: 'offers', label: 'Offers', icon: 'tag', blurb: 'What people can come to you for' },
  { id: 'portfolio', label: 'Portfolio', icon: 'image', blurb: 'Things you’ve made, with links' },
  { id: 'communities', label: 'Communities', icon: 'community', blurb: 'The groups you pick — not all of them' },
  { id: 'posts', label: 'Posts', icon: 'chat', blurb: 'Your posts from the groups you pick' },
]
export const sectionMeta = (id) => SECTION_CATALOG.find((s) => s.id === id)

export function CopyLink({ handle }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/v/${handle}`); setDone(true); setTimeout(() => setDone(false), 1600) }
    catch { /* clipboard blocked — the link is still visible to copy by hand */ }
  }
  return (
    <button className="btn ghost small" onClick={copy}>
      <Icon name={done ? 'check' : 'link'} size={13} /> {done ? 'Copied' : 'Copy link'}
    </button>
  )
}

export function VoicesSection({ profile }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.listVoices().then(setState).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const remove = async (v) => {
    if (!window.confirm(`Delete your “${v.name}” voice? Anyone with @${v.handle} won’t be able to open it.`)) return
    try { await api.deleteVoice(v.id); load() } catch (e) { setError(e.message) }
  }

  const voices = state?.voices ?? []
  const max = state?.max ?? 2
  const used = voices.length + 1 // the main profile counts as one

  return (
    <section className="section voices">
      <div className="section-head">
        <div>
          <h2 className="section-title"><Icon name="layers" size={18} /> Your VIS</h2>
          <p className="section-sub">A second version of you for different people. Give colleagues your work VIS; everyone else sees your main profile. You can have one.</p>
        </div>
        {used < max
          ? <Link to="/voices/new" className="btn primary small" aria-label="Add a VIS"><Icon name="plus" size={13} /> VIS</Link>
          : <span className="meta-dim">You have your VIS.</span>}
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="voice-list">
        <article className="voice-card main">
          <div className="voice-card-head">
            <span className="voice-tag">Main</span>
            <strong>{profile.name}</strong>
            {profile.handle && <span className="meta-dim">{profile.handle}</span>}
          </div>
          <p className="meta-dim">Your full profile — what people see by default.</p>
        </article>

        {state == null && <p className="meta-dim">Loading…</p>}

        {voices.map((v) => (
          <article key={v.id} className="voice-card">
            <div className="voice-card-head">
              <span className="voice-tag">{v.name}</span>
              <Link to={`/v/${v.handle}`} className="voice-handle">@{v.handle}</Link>
            </div>
            {v.headline && <p className="voice-headline">{v.headline}</p>}
            <div className="pills">
              {v.sections.map((s) => <span key={s} className="pill">{sectionMeta(s)?.label ?? s}</span>)}
            </div>
            <div className="voice-actions">
              <Link to={`/v/${v.handle}`} className="btn ghost small"><Icon name="eye" size={13} /> View</Link>
              <CopyLink handle={v.handle} />
              <Link to={`/voices/${v.id}`} className="btn ghost small"><Icon name="edit" size={13} /> Edit</Link>
              <button className="link-btn" onClick={() => remove(v)}><Icon name="trash" size={13} /> Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
