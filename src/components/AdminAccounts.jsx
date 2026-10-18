// Admin → Company accounts: every service VOIDAJ runs on (domain, database,
// hosting, email…), which login controls it, who owns it and what it
// costs. It never holds passwords: those belong in a shared password
// manager, and the server refuses anything that looks like one.
import { useEffect, useState } from 'react'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

const EMPTY = { service: '', purpose: '', login: '', url: '', owner: '', plan: '', notes: '' }
const FIELDS = [
  { id: 'service', label: 'Service', placeholder: 'e.g. Wix' },
  { id: 'purpose', label: 'What it’s for', placeholder: 'e.g. Owns the voidaj.com domain and its DNS' },
  { id: 'login', label: 'Login (email or username)', placeholder: 'e.g. voidajng@gmail.com' },
  { id: 'url', label: 'Dashboard link', placeholder: 'https://' },
  { id: 'owner', label: 'Who looks after it', placeholder: 'e.g. David' },
  { id: 'plan', label: 'Plan / cost', placeholder: 'e.g. Free, or $25/month, renews 16 Oct 2027' },
  { id: 'notes', label: 'Notes', placeholder: 'Anything the next person needs to know. No passwords.', long: true },
]

function AccountForm({ start, onCancel, onSaved }) {
  const [form, setForm] = useState(start)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { onSaved(start.id ? await api.saveAdminAccount(start.id, form) : await api.addAdminAccount(form)) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return (
    <form className="card acct-form" onSubmit={submit}>
      {FIELDS.map((f) => (
        <label key={f.id} className="field"><span>{f.label}</span>
          {f.long
            ? <textarea value={form[f.id]} onChange={set(f.id)} placeholder={f.placeholder} rows={3} />
            : <input value={form[f.id]} onChange={set(f.id)} placeholder={f.placeholder} autoFocus={f.id === 'service'} />}
        </label>
      ))}
      {error && <p className="auth-error">{error}</p>}
      <div className="composer-foot">
        <button type="button" className="btn ghost small" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn primary small" disabled={!form.service.trim() || busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* clipboard blocked */ }
  }
  return (
    <button type="button" className="icon-btn acct-copy" onClick={copy} aria-label={`Copy ${text}`} title="Copy">
      <Icon name={done ? 'check' : 'layers'} size={13} />
    </button>
  )
}

export function AdminAccounts() {
  const [accounts, setAccounts] = useState(null)
  const [editing, setEditing] = useState(null) // an account, EMPTY for a new one, or null
  const [error, setError] = useState('')
  useEffect(() => { api.adminAccounts().then(setAccounts).catch((e) => setError(e.message)) }, [])

  const saved = (a) => {
    setAccounts((list) => [...list.filter((x) => x.id !== a.id), a].sort((x, y) => x.service.localeCompare(y.service)))
    setEditing(null)
  }
  const remove = async (a) => {
    if (!window.confirm(`Remove ${a.service} from this list? (This only removes the note here, not the account itself.)`)) return
    try { await api.deleteAdminAccount(a.id); setAccounts((list) => list.filter((x) => x.id !== a.id)) } catch (e) { setError(e.message) }
  }

  return (
    <div className="acct-wrap">
      <div className="acct-warning">
        <Icon name="lock" size={16} />
        <p><strong>No passwords here.</strong> This page shows which login controls each service. Keep the passwords in a shared password manager (1Password, Bitwarden or Apple Passwords shared groups) so they can be changed and shared safely.</p>
      </div>

      <div className="acct-head">
        <span className="meta-dim">{accounts ? `${accounts.length} services` : ''}</span>
        {!editing && <button className="btn primary small" onClick={() => setEditing(EMPTY)}><Icon name="plus" size={13} /> Add a service</button>}
      </div>

      {editing && <AccountForm start={editing} onCancel={() => setEditing(null)} onSaved={saved} />}
      {error && <p className="auth-error">{error}</p>}
      {accounts === null && !error && <p className="meta-dim">Loading…</p>}

      <div className="acct-grid">
        {(accounts ?? []).filter((a) => a.id !== editing?.id).map((a) => (
          <article key={a.id} className="card acct-card">
            <header>
              <strong>{a.service}</strong>
              {a.plan && <span className="acct-plan">{a.plan}</span>}
            </header>
            {a.purpose && <p className="acct-purpose">{a.purpose}</p>}
            <dl>
              {a.login && <><dt>Login</dt><dd><code>{a.login}</code> <CopyButton text={a.login} /></dd></>}
              {a.owner && <><dt>Looks after it</dt><dd>{a.owner}</dd></>}
              {a.notes && <><dt>Notes</dt><dd className="acct-notes">{a.notes}</dd></>}
            </dl>
            <footer>
              {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn ghost small">Open dashboard <Icon name="arrow" size={13} /></a>}
              <button className="btn ghost small" onClick={() => setEditing(a)}><Icon name="edit" size={13} /> Edit</button>
              <button className="link-btn" onClick={() => remove(a)}><Icon name="trash" size={13} /> Remove</button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  )
}
