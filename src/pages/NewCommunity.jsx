// Start a community. Whoever starts it owns it and moderates it; the
// shared Charter is always one of its rules.
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { addCommunity } from '../communities.js'
import { CHARTER } from '../data/seed.js'
import { Icon } from '../components/Icons.jsx'

const ICONS = ['community', 'users', 'briefcase', 'camera', 'code', 'store', 'leaf', 'book', 'megaphone', 'heart', 'globe', 'star', 'wrench', 'smile']
const ACCENTS = ['#C0342A', '#1F5FA8', '#1B7F3B', '#6B3FA0', '#B45309', '#0F6E6E', '#8A5D0B', '#A8306A']

export default function NewCommunity() {
  const { user, loading, setUser } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', tagline: '', description: '', scope: 'local', city: '',
    tags: '', rules: ['', ''], icon: 'community', accent: ACCENTS[0],
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pick = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />

  const submit = async (e) => {
    e.preventDefault()
    if (form.name.trim().length < 3 || busy) return
    setBusy(true)
    try {
      const { community, user: me } = await api.createCommunity({
        ...form,
        city: form.city || user.city,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        rules: form.rules.map((r) => r.trim()).filter(Boolean),
      })
      addCommunity(community)
      setUser(me)
      navigate(`/community/${community.id}`)
    } catch (err) { alert(err.message); setBusy(false) }
  }

  return (
    <div className="page new-community">
      <section className="new-community-head">
        <Link to="/home" className="meta-dim"><Icon name="back" size={13} /> Back</Link>
        <h1>Start a community</h1>
        <p className="section-sub">Your community, your culture. Every community runs itself — and all of them share one Charter.</p>
      </section>

      <form className="card new-community-form" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input className="job-input" value={form.name} onChange={set('name')} placeholder="e.g. Surulere Runners" maxLength={60} autoFocus required />
        </label>
        <label className="field">
          <span>In one line</span>
          <input className="job-input" value={form.tagline} onChange={set('tagline')} placeholder="What brings people here?" maxLength={120} />
        </label>
        <label className="field">
          <span>About</span>
          <textarea className="composer-body" value={form.description} onChange={set('description')} rows={3} maxLength={1000} placeholder="Who it’s for, what you do together, how often you meet." />
        </label>

        <div className="field">
          <span>Where</span>
          <div className="privacy-toggle">
            <button type="button" className={`toggle-seg ${form.scope === 'local' ? 'active' : ''}`} onClick={() => pick('scope', 'local')}><Icon name="map-pin" size={13} /> A city</button>
            <button type="button" className={`toggle-seg ${form.scope === 'global' ? 'active' : ''}`} onClick={() => pick('scope', 'global')}><Icon name="globe" size={13} /> Anywhere</button>
          </div>
          {form.scope === 'local' && (
            <input className="job-input" value={form.city} onChange={set('city')} placeholder={user.city || 'Lagos'} maxLength={40} aria-label="City" />
          )}
        </div>

        <label className="field">
          <span>Topics <em>comma-separated</em></span>
          <input className="job-input" value={form.tags} onChange={set('tags')} placeholder="running, fitness, mornings" maxLength={150} />
        </label>

        <div className="field">
          <span>Look</span>
          <div className="choice-row" role="radiogroup" aria-label="Icon">
            {ICONS.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={form.icon === i} aria-label={i}
                className={`choice-icon ${form.icon === i ? 'on' : ''}`} style={{ color: form.accent }} onClick={() => pick('icon', i)}>
                <Icon name={i} size={18} />
              </button>
            ))}
          </div>
          <div className="choice-row" role="radiogroup" aria-label="Colour">
            {ACCENTS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={form.accent === c} aria-label={c}
                className={`choice-swatch ${form.accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => pick('accent', c)} />
            ))}
          </div>
        </div>

        <div className="field">
          <span>Community rules</span>
          {form.rules.map((r, i) => (
            <input key={i} className="job-input" value={r} maxLength={160} placeholder={i === 0 ? 'e.g. Be on time — we start at 6 sharp.' : 'Another rule (optional)'}
              onChange={(e) => setForm((f) => ({ ...f, rules: f.rules.map((x, n) => (n === i ? e.target.value : x)) }))} aria-label={`Rule ${i + 1}`} />
          ))}
          {form.rules.length < 8 && (
            <button type="button" className="link-btn" onClick={() => setForm((f) => ({ ...f, rules: [...f.rules, ''] }))}><Icon name="plus" size={12} /> Another rule</button>
          )}
          <div className="charter-note"><Icon name="shield" size={13} /><span>Always included: follow the Interact Space Charter. {CHARTER[0]}</span></div>
        </div>

        <div className="composer-foot">
          <span className="meta-dim"><Icon name="sparkle" size={13} /> You’ll be its owner — you can add admins and moderators later.</span>
          <button className="btn primary" disabled={form.name.trim().length < 3 || busy}>{busy ? 'Starting…' : 'Start community'}</button>
        </div>
      </form>
    </div>
  )
}
