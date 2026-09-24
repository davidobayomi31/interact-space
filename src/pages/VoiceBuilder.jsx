// Build or edit a voice. Instead of a long form, the member picks the cards
// people should see, then fills in only those. Things we already know
// (interests, skills, portfolio) arrive pre-filled.
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { COMMUNITIES } from '../data/seed.js'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { SECTION_CATALOG, sectionMeta } from '../components/Voices.jsx'

const NAME_IDEAS = ['Work', 'Creative', 'Business', 'Side hustle']
const slug = (s) => s.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '').replace(/\.{2,}/g, '.').replace(/^[._]+|[._]+$/g, '')

function TagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  const add = (raw = draft) => {
    const t = raw.replace(/,$/, '').trim()
    if (t && !tags.includes(t) && tags.length < 20) onChange([...tags, t])
    setDraft('')
  }
  return (
    <div className="tag-input">
      <div className="pills">
        {tags.map((t) => (
          <span key={t} className="pill removable">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}><Icon name="x" size={11} /></button>
          </span>
        ))}
      </div>
      <input
        value={draft} placeholder={placeholder} maxLength={40}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        onBlur={() => add()}
      />
    </div>
  )
}

function ListEditor({ items, onChange, fields, addLabel }) {
  const set = (i, k) => (e) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: e.target.value } : it)))
  const blank = Object.fromEntries(fields.map((f) => [f.key, '']))
  return (
    <div className="stack tight">
      {items.map((it, i) => (
        <div key={i} className="list-edit-row">
          {fields.map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              <input value={it[f.key] ?? ''} onChange={set(i, f.key)} placeholder={f.placeholder} maxLength={f.max} />
            </label>
          ))}
          <button type="button" className="link-btn" onClick={() => onChange(items.filter((_, j) => j !== i))}><Icon name="trash" size={13} /> Remove</button>
        </div>
      ))}
      {items.length < 12 && (
        <button type="button" className="btn ghost small" onClick={() => onChange([...items, { ...blank }])}><Icon name="plus" size={13} /> {addLabel}</button>
      )}
    </div>
  )
}

export default function VoiceBuilder() {
  const { id } = useParams()
  const { user, profile, loading } = useApp()
  const navigate = useNavigate()
  const editing = !!id

  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleTouched, setHandleTouched] = useState(false)
  const [headline, setHeadline] = useState('')
  const [sections, setSections] = useState([])
  const [content, setContent] = useState({})
  const [ready, setReady] = useState(!editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from what we already know, or load the voice being edited.
  useEffect(() => {
    if (!user) return
    if (!editing) {
      setContent({
        interests: { tags: profile.interests ?? [] },
        skills: { tags: profile.skills ?? [] },
        portfolio: { items: profile.portfolio ?? [] },
        communities: { ids: [] },
      })
      return
    }
    api.listVoices().then(({ voices }) => {
      const v = voices.find((x) => x.id === id)
      if (!v) { setError('That voice doesn’t exist.'); setReady(true); return }
      setName(v.name); setHandle(v.handle); setHandleTouched(true); setHeadline(v.headline)
      setSections(v.sections); setContent(v.content); setReady(true)
    }).catch((e) => { setError(e.message); setReady(true) })
  }, [user, id]) // eslint-disable-line

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  if (!profile.onboarded) return <Navigate to="/welcome" replace />

  const first = profile.name.split(' ')[0]
  const pickName = (n) => {
    setName(n)
    if (!handleTouched) setHandle(slug(`${first}.${n}`))
  }
  const toggle = (sid) => setSections((s) => (s.includes(sid) ? s.filter((x) => x !== sid) : [...s, sid]))
  const put = (key, value) => setContent((c) => ({ ...c, [key]: { ...(c[key] || {}), ...value } }))
  const myCommunities = COMMUNITIES.filter((c) => profile.communities.includes(c.id))
  const chosenIds = content.communities?.ids ?? []
  const needsCommunities = sections.includes('communities') || sections.includes('posts')

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    const body = { name: name.trim(), handle: handle.trim(), headline: headline.trim(), sections, content }
    try {
      const v = editing ? await api.updateVoice(id, body) : await api.createVoice(body)
      navigate(`/v/${v.handle}`)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (!ready) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>

  return (
    <div className="page voice-builder">
      <Link to="/profile/me" className="thread-breadcrumb"><Icon name="back" size={13} /> Back to your profile</Link>
      <h1 className="vb-title">{editing ? `Edit your ${name || ''} voice` : 'Add a voice'}</h1>
      <p className="meta-dim vb-lede">A separate version of you with its own username. People who have it see only what you put here — never your main profile.</p>

      <form onSubmit={save} className="vb-form">
        <section className="vb-step">
          <h2><span className="vb-num">1</span> Name it</h2>
          <div className="chip-grid tight vb-ideas">
            {NAME_IDEAS.map((n) => (
              <button type="button" key={n} className={`goal-chip small ${name === n ? 'selected' : ''}`} onClick={() => pickName(n)}>{n}</button>
            ))}
          </div>
          <div className="vb-fields">
            <label className="field"><span>Voice name</span>
              <input value={name} onChange={(e) => pickName(e.target.value)} maxLength={40} placeholder="Work" required />
            </label>
            <label className="field"><span>Username people will use</span>
              <div className="handle-input"><span>@</span>
                <input value={handle} onChange={(e) => { setHandleTouched(true); setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')) }}
                  maxLength={30} placeholder={`${first.toLowerCase()}.work`} required />
              </div>
            </label>
            <label className="field vb-wide"><span>One-line headline (optional)</span>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} placeholder="Product designer at Kola Foods" />
            </label>
          </div>
        </section>

        <section className="vb-step">
          <h2><span className="vb-num">2</span> How would you like people to experience this profile?</h2>
          <p className="meta-dim">Pick the cards. They appear in the order you pick them.</p>
          <div className="section-cards">
            {SECTION_CATALOG.map((s) => {
              const order = sections.indexOf(s.id)
              const on = order !== -1
              return (
                <button type="button" key={s.id} className={`section-card ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(s.id)}>
                  <span className="sc-order">{on ? order + 1 : <Icon name="plus" size={13} />}</span>
                  <Icon name={s.icon} size={18} />
                  <strong>{s.label}</strong>
                  <span className="sc-blurb">{s.blurb}</span>
                </button>
              )
            })}
          </div>
        </section>

        {sections.length > 0 && (
          <section className="vb-step">
            <h2><span className="vb-num">3</span> Fill in what you picked</h2>

            {needsCommunities && (
              <div className="vb-block">
                <h3><Icon name="community" size={15} /> Which communities belong to this voice?</h3>
                <p className="meta-dim">{sections.includes('posts') ? 'Your posts are shown only from these.' : 'Only these are shown.'}</p>
                {myCommunities.length ? (
                  <div className="chip-grid tight">
                    {myCommunities.map((c) => {
                      const on = chosenIds.includes(c.id)
                      return (
                        <button type="button" key={c.id} className={`goal-chip small ${on ? 'selected' : ''}`} aria-pressed={on}
                          onClick={() => put('communities', { ids: on ? chosenIds.filter((x) => x !== c.id) : [...chosenIds, c.id] })}>
                          {on && <Icon name="check" size={12} />} {c.name}
                        </button>
                      )
                    })}
                  </div>
                ) : <p className="meta-dim">You haven’t joined any communities yet.</p>}
              </div>
            )}

            {sections.map((sid) => {
              const meta = sectionMeta(sid)
              if (sid === 'communities' || sid === 'posts') return null
              return (
                <div key={sid} className="vb-block">
                  <h3><Icon name={meta.icon} size={15} /> {meta.label}</h3>
                  {sid === 'about' && (
                    <textarea className="composer-body" rows={4} maxLength={600} value={content.about?.text ?? ''}
                      onChange={(e) => put('about', { text: e.target.value })} placeholder="What should people know about you here?" />
                  )}
                  {sid === 'interests' && (
                    <TagInput tags={content.interests?.tags ?? []} onChange={(tags) => put('interests', { tags })} placeholder="Type an interest and press Enter" />
                  )}
                  {sid === 'skills' && (
                    <TagInput tags={content.skills?.tags ?? []} onChange={(tags) => put('skills', { tags })} placeholder="Type a skill and press Enter" />
                  )}
                  {sid === 'work' && (
                    <ListEditor items={content.work?.items ?? []} onChange={(items) => put('work', { items })} addLabel="Add a role"
                      fields={[{ key: 'role', label: 'Role', placeholder: 'Product designer', max: 80 },
                        { key: 'org', label: 'Where', placeholder: 'Kola Foods', max: 80 },
                        { key: 'years', label: 'When', placeholder: '2022 – now', max: 40 }]} />
                  )}
                  {sid === 'offers' && (
                    <ListEditor items={content.offers?.items ?? []} onChange={(items) => put('offers', { items })} addLabel="Add an offer"
                      fields={[{ key: 'title', label: 'Offer', placeholder: 'Brand identity', max: 80 },
                        { key: 'detail', label: 'Details', placeholder: 'Logo, colours, type — two weeks', max: 200 },
                        { key: 'rate', label: 'Rate (optional)', placeholder: 'From ₦150,000', max: 40 }]} />
                  )}
                  {sid === 'portfolio' && (
                    <>
                      {profile.portfolio?.length > 0 && (
                        <button type="button" className="link-btn" onClick={() => put('portfolio', { items: profile.portfolio })}>
                          <Icon name="image" size={13} /> Copy from my main portfolio
                        </button>
                      )}
                      <ListEditor items={content.portfolio?.items ?? []} onChange={(items) => put('portfolio', { items })} addLabel="Add a piece"
                        fields={[{ key: 'title', label: 'Title', placeholder: 'Kola Foods rebrand', max: 80 },
                          { key: 'description', label: 'What it is', placeholder: 'One line', max: 280 },
                          { key: 'link', label: 'Link', placeholder: 'https://', max: 300 }]} />
                    </>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {error && <p className="auth-error"><Icon name="info" size={14} /> {error}</p>}
        <div className="vb-foot">
          <Link to="/profile/me" className="btn ghost">Cancel</Link>
          <button className="btn primary" disabled={busy || !name.trim() || !handle.trim() || !sections.length}>
            {busy ? 'Saving…' : editing ? 'Save voice' : 'Create voice'}
          </button>
        </div>
      </form>
    </div>
  )
}
