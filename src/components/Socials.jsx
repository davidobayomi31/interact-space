// About & links — a member's bio plus their social media and other links,
// near the top of a profile. Members edit their own in place; everyone
// else sees the bio and a row of links. Platforms take a handle (or a
// pasted link to the profile); Website and Other take a full link.
import { useState } from 'react'
import { Icon } from './Icons.jsx'

export const SOCIAL_KINDS = [
  { id: 'instagram', label: 'Instagram', url: (h) => `https://instagram.com/${h}`, hint: '@yourname' },
  { id: 'x', label: 'X (Twitter)', url: (h) => `https://x.com/${h}`, hint: '@yourname' },
  { id: 'tiktok', label: 'TikTok', url: (h) => `https://www.tiktok.com/@${h}`, hint: '@yourname' },
  { id: 'linkedin', label: 'LinkedIn', url: (h) => `https://www.linkedin.com/in/${h}`, hint: 'your-profile-name' },
  { id: 'youtube', label: 'YouTube', url: (h) => `https://www.youtube.com/@${h}`, hint: '@yourchannel' },
  { id: 'facebook', label: 'Facebook', url: (h) => `https://www.facebook.com/${h}`, hint: 'yourname' },
  { id: 'snapchat', label: 'Snapchat', url: (h) => `https://www.snapchat.com/add/${h}`, hint: 'yourname' },
  { id: 'whatsapp', label: 'WhatsApp', url: (h) => `https://wa.me/${h.replace(/[^0-9]/g, '')}`, hint: '+234 800 000 0000' },
  { id: 'website', label: 'Website', url: (h) => h, hint: 'https://' },
  { id: 'other', label: 'Other link', url: (h) => h, hint: 'https://' },
]
const KIND = Object.fromEntries(SOCIAL_KINDS.map((k) => [k.id, k]))
const isUrl = (v) => /^https?:\/\//i.test(v)
const hostOf = (url) => { try { return new URL(url).host.replace(/^www\./, '') } catch { return url } }

function linkFor(s) {
  const k = KIND[s.kind]
  if (!k) return null
  const href = isUrl(s.value) ? s.value : k.url(s.value)
  // Only ordinary web links ever go behind a profile link.
  if (!isUrl(href)) return null
  const shown = s.kind === 'website' || s.kind === 'other'
    ? hostOf(s.value)
    : isUrl(s.value) ? hostOf(s.value) : (s.kind === 'whatsapp' ? s.value : `@${s.value}`)
  return { href, label: k.label, shown }
}

export function SocialLinks({ socials }) {
  const links = (socials || []).map(linkFor).filter(Boolean)
  if (!links.length) return null
  return (
    <div className="social-links">
      {links.map((l, i) => (
        <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="social-link" title={l.href}>
          <span className="social-kind">{l.label}</span>
          <span className="social-value">{l.shown}</span>
          <Icon name="link" size={12} />
        </a>
      ))}
    </div>
  )
}

const EMPTY = { kind: 'instagram', value: '' }

export function AboutSection({ bio, socials, editable, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draftBio, setDraftBio] = useState('')
  const [draft, setDraft] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const start = () => {
    setDraftBio(bio || '')
    setDraft(socials?.length ? socials.map((s) => ({ ...s })) : [{ ...EMPTY }])
    setError(''); setEditing(true)
  }
  const set = (i, k) => (e) => setDraft((d) => d.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)))
  const save = async () => {
    const kept = draft.filter((s) => s.value.trim())
    const bad = kept.find((s) => (s.kind === 'website' || s.kind === 'other') && !isUrl(s.value.trim()))
    if (bad) { setError(`${KIND[bad.kind].label} needs a full link starting with https://`); return }
    setBusy(true); setError('')
    try { await onSave({ bio: draftBio.trim(), socials: kept.map((s) => ({ kind: s.kind, value: s.value.trim() })) }); setEditing(false) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const hasLinks = socials?.length > 0
  if (!editable && !bio && !hasLinks) return null

  return (
    <section className="card about-card">
      <div className="section-head">
        <div className="side-card-head"><Icon name="link" size={15} /> About &amp; links</div>
        {editable && !editing && (
          <button className="btn ghost small" onClick={start}><Icon name="edit" size={13} /> {bio || hasLinks ? 'Edit' : 'Add bio & links'}</button>
        )}
      </div>

      {!editing && <>
        {bio ? <p className="about-bio">{bio}</p> : editable && <p className="meta-dim">Tell people who you are, and add your Instagram, X, TikTok, website and more.</p>}
        <SocialLinks socials={socials} />
      </>}

      {editing && (
        <div className="stack">
          <label className="field"><span>Bio</span>
            <textarea value={draftBio} onChange={(e) => setDraftBio(e.target.value)} maxLength={500} rows={3} placeholder="A few lines about you, what you do, what you’re into" />
          </label>
          <span className="field-label">Social media &amp; links</span>
          {draft.map((s, i) => (
            <div key={i} className="social-edit-row">
              <select className="job-select" value={s.kind} onChange={set(i, 'kind')} aria-label="Platform">
                {SOCIAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
              <input className="job-input" value={s.value} onChange={set(i, 'value')} maxLength={300}
                placeholder={KIND[s.kind]?.hint} aria-label={`${KIND[s.kind]?.label} handle or link`} />
              <button type="button" className="icon-btn" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} aria-label="Remove link">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {draft.length < 12 && (
            <button type="button" className="btn ghost small" onClick={() => setDraft((d) => [...d, { ...EMPTY }])}>
              <Icon name="plus" size={13} /> Add a link
            </button>
          )}
          {error && <p className="auth-error">{error}</p>}
          <div className="composer-foot">
            <button className="btn ghost small" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn primary small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
