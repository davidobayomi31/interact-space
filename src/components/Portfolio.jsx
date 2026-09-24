// Portfolio — public work samples on a profile. Members edit their own in
// place; everyone else sees a read-only grid. Links are shown as their
// host name so a visitor knows where a click will take them.
import { useState } from 'react'
import { Icon } from './Icons.jsx'

const hostOf = (url) => { try { return new URL(url).host.replace(/^www\./, '') } catch { return '' } }
const EMPTY = { title: '', description: '', link: '' }

export function PortfolioGrid({ items }) {
  if (!items?.length) return null
  return (
    <div className="portfolio-grid">
      {items.map((p, i) => (
        <article key={i} className="portfolio-item">
          <strong>{p.title}</strong>
          {p.description && <p className="meta-dim">{p.description}</p>}
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="portfolio-link">
              <Icon name="link" size={12} /> {hostOf(p.link)}
            </a>
          )}
        </article>
      ))}
    </div>
  )
}

export function PortfolioSection({ items, editable, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const start = () => { setDraft(items?.length ? items.map((p) => ({ ...p })) : [{ ...EMPTY }]); setError(''); setEditing(true) }
  const set = (i, k) => (e) => setDraft((d) => d.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)))
  const save = async () => {
    setBusy(true); setError('')
    try { await onSave(draft.filter((p) => p.title.trim())); setEditing(false) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  if (!editable && !items?.length) return null

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2 className="section-title"><Icon name="image" size={18} /> Portfolio</h2>
          {editable && !editing && <p className="section-sub">Work you want people to see. Public on your main profile.</p>}
        </div>
        {editable && !editing && (
          <button className="btn ghost small" onClick={start}><Icon name="edit" size={13} /> {items?.length ? 'Edit' : 'Add work'}</button>
        )}
      </div>

      {!editing && (items?.length
        ? <PortfolioGrid items={items} />
        : <p className="meta-dim">Nothing here yet. Add a project, a shop, a gallery — anything that shows what you do.</p>)}

      {editing && (
        <div className="stack">
          {draft.map((p, i) => (
            <div key={i} className="card portfolio-edit">
              <label className="field"><span>Title</span>
                <input value={p.title} onChange={set(i, 'title')} maxLength={80} placeholder="e.g. Kola Foods rebrand" />
              </label>
              <label className="field"><span>What it is</span>
                <input value={p.description} onChange={set(i, 'description')} maxLength={280} placeholder="One line on what you did" />
              </label>
              <label className="field"><span>Link (optional)</span>
                <input value={p.link} onChange={set(i, 'link')} maxLength={300} placeholder="https://" inputMode="url" />
              </label>
              <button className="link-btn" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                <Icon name="trash" size={13} /> Remove
              </button>
            </div>
          ))}
          {draft.length < 12 && (
            <button className="btn ghost small" onClick={() => setDraft((d) => [...d, { ...EMPTY }])}>
              <Icon name="plus" size={13} /> Add another
            </button>
          )}
          {error && <p className="auth-error">{error}</p>}
          <div className="composer-foot">
            <button className="btn ghost small" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn primary small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save portfolio'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
