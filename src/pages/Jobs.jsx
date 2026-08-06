// Quick Jobs — local trade & gig work. Posters describe what they need;
// workers set the categories they do and get notified when a match posts.
// ID verification is a simulated demo badge (no real KYC provider wired up).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { JOB_CATEGORIES } from '../data/seed.js'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, SectionHead } from '../components/bits.jsx'

const catInfo = (id) => JOB_CATEGORIES.find((c) => c.id === id) || { label: id, icon: 'briefcase' }
const seenKey = (uid) => `is_jobs_seen_${uid}`

function VerifyModal({ onClose, onVerified }) {
  const [idNumber, setIdNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (idNumber.trim().length < 6 || busy) return
    setBusy(true); setError('')
    try { await onVerified(idNumber.trim()); onClose() }
    catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="side-card-head"><Icon name="badge-check" size={16} /> Get ID Verified</div>
        <p className="meta-dim">
          Verified pros get priority on jobs marked “verified only” and a trust badge on their profile.
          <br /><em>Demo simulation — no document upload, this is a prototype flow.</em>
        </p>
        <div className="field">
          <span><Icon name="lock" size={13} /> Government ID number</span>
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. NIN or passport number" autoFocus />
        </div>
        {error && <div className="auth-error"><Icon name="x" size={14} /> {error}</div>}
        <div className="composer-foot">
          <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>
          <button className="btn primary small" disabled={idNumber.trim().length < 6 || busy}>
            {busy ? 'Verifying…' : 'Verify me'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PostJobForm({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', category: JOB_CATEGORIES[0].id, area: '', budget: '', description: '', verifiedOnly: false })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || busy) return
    setBusy(true)
    try {
      const job = await api.createJob(form)
      onCreated(job)
      setForm({ title: '', category: JOB_CATEGORIES[0].id, area: '', budget: '', description: '', verifiedOnly: false })
      setOpen(false)
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  if (!open) {
    return (
      <button className="btn primary" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} /> Post a quick job
      </button>
    )
  }

  return (
    <form className="card composer-full job-form" onSubmit={submit}>
      <input className="composer-title" value={form.title} onChange={set('title')} placeholder="What do you need done? e.g. Fix a leaking kitchen pipe" autoFocus />
      <div className="job-form-row">
        <select className="job-select" value={form.category} onChange={set('category')}>
          {JOB_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input className="job-input" value={form.area} onChange={set('area')} placeholder="Area (e.g. Yaba)" />
        <input className="job-input" value={form.budget} onChange={set('budget')} placeholder="Budget (e.g. ₦15,000)" />
      </div>
      <textarea className="composer-body" value={form.description} onChange={set('description')} placeholder="Add details…" rows={3} />
      <label className="job-checkbox">
        <input type="checkbox" checked={form.verifiedOnly} onChange={set('verifiedOnly')} />
        <span><Icon name="badge-check" size={13} /> Only show to ID-verified pros</span>
      </label>
      <div className="composer-foot">
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn primary small" disabled={!form.title.trim() || busy}>{busy ? 'Posting…' : 'Post job'}</button>
      </div>
    </form>
  )
}

function SkillsPicker({ profile, onSave }) {
  const [selected, setSelected] = useState(profile.jobSkills || [])
  const [busy, setBusy] = useState(false)
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...(profile.jobSkills || [])].sort())

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const save = async () => {
    setBusy(true)
    try {
      await onSave(selected)
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    } finally { setBusy(false) }
  }

  return (
    <div className="card side-card">
      <div className="side-card-head"><Icon name="bell" size={15} /> Get notified for work</div>
      <p className="meta-dim">Pick what you can do — you’ll be notified when a matching job goes up nearby.</p>
      <div className="chip-grid tight">
        {JOB_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`goal-chip small ${selected.includes(c.id) ? 'selected' : ''}`} onClick={() => toggle(c.id)}>
            <Icon name={c.icon} size={13} /> {c.label} {selected.includes(c.id) && <Icon name="check" size={12} className="chip-check" />}
          </button>
        ))}
      </div>
      {changed && (
        <button className="btn primary small" style={{ marginTop: 10 }} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save & enable alerts'}
        </button>
      )}
    </div>
  )
}

function JobCard({ job, onInterest }) {
  const { user } = useApp()
  const info = catInfo(job.category)
  return (
    <div className="card job-card">
      <div className="job-card-head">
        <div className="community-glyph" style={{ color: 'var(--gold)' }}><Icon name={info.icon} size={20} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">{job.title}</div>
          <div className="meta-row">
            <span className="pill">{info.label}</span>
            {job.area && <span className="meta-dim"><Icon name="map-pin" size={12} /> {job.area}</span>}
            {job.budget && <span className="meta-dim"><Icon name="tag" size={12} /> {job.budget}</span>}
            {job.verifiedOnly && <span className="scope-badge local"><Icon name="badge-check" size={11} /> Verified pros only</span>}
          </div>
        </div>
      </div>
      {job.description && <p className="card-desc">{job.description}</p>}
      <div className="post-head">
        <Avatar user={job.poster} size={26} />
        <div className="meta-dim">
          Posted by <strong className="post-author">{job.poster.name}</strong>
          {job.poster.idVerified && <span className="verified-tag"><Icon name="badge-check" size={12} /> Verified</span>}
          {' '}· {job.ago} ago
        </div>
      </div>
      <div className="card-actions">
        <span className="meta-dim"><Icon name="users" size={13} /> {job.interested} interested</span>
        <button
          className={job.iInterested ? 'btn ghost small' : 'btn primary small'}
          onClick={() => (user ? onInterest(job.id) : (window.location.href = '/auth'))}
        >
          {job.iInterested ? <><Icon name="check" size={14} /> Interested</> : 'I can do this'}
        </button>
      </div>
    </div>
  )
}

export default function Jobs() {
  const { user, profile, saveProfile, refreshMe } = useApp()
  const [jobs, setJobs] = useState([])
  const [matched, setMatched] = useState([])
  const [category, setCategory] = useState('')
  const [showVerify, setShowVerify] = useState(false)
  const [toast, setToast] = useState(null)

  const load = () => {
    api.listJobs(category ? { category } : {}).then(setJobs).catch(() => setJobs([]))
    if (user && profile.jobSkills?.length) api.listJobs({ matchMine: 1 }).then(setMatched).catch(() => setMatched([]))
    else setMatched([])
  }

  useEffect(load, [category, user, profile.jobSkills?.length]) // eslint-disable-line

  // Mark matched jobs as "seen" and surface a one-time toast for anything
  // new since the user's last visit — the notification the CEO asked for.
  useEffect(() => {
    if (!user || !matched.length) return
    const key = seenKey(user.id)
    const lastSeen = Number(localStorage.getItem(key) || 0)
    const fresh = matched.filter((j) => j.createdAt > lastSeen)
    if (fresh.length) {
      setToast(`${fresh.length} new job${fresh.length > 1 ? 's' : ''} match what you do — including “${fresh[0].title}”`)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New quick job near you', { body: fresh[0].title })
      }
    }
    localStorage.setItem(key, String(Date.now()))
  }, [matched, user])

  const onInterest = async (id) => {
    try {
      const job = await api.toggleJobInterest(id)
      setJobs((js) => js.map((j) => (j.id === id ? job : j)))
      setMatched((js) => js.map((j) => (j.id === id ? job : j)))
    } catch (err) { alert(err.message) }
  }

  const matchedIds = new Set(matched.map((j) => j.id))
  const rest = jobs.filter((j) => !matchedIds.has(j.id))

  return (
    <div className="page jobs-page">
      <section className="discover-hero">
        <h1><Icon name="wrench" size={24} /> Quick Jobs</h1>
        <p className="meta-dim">Real local work — plumbing, moving, tutoring, deliveries and more. Verified pros get priority.</p>
      </section>

      {toast && (
        <div className="job-toast">
          <Icon name="bell" size={15} /> {toast}
          <button className="icon-btn subtle" onClick={() => setToast(null)} aria-label="Dismiss"><Icon name="x" size={14} /></button>
        </div>
      )}

      {!user && (
        <div className="card sign-in-nudge" style={{ marginTop: 20 }}>
          <span className="meta-dim">Sign in to post a job, offer your skills, or get notified about work near you.</span>
          <Link to="/auth" className="btn primary small">Sign in</Link>
        </div>
      )}

      <div className="space-grid" style={{ marginTop: 24 }}>
        <div className="space-main">
          <div className="job-toolbar">
            {user ? <PostJobForm onCreated={(j) => setJobs((js) => [j, ...js])} /> : <span />}
            <select className="job-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {JOB_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {matched.length > 0 && (
            <section className="section" style={{ marginTop: 24 }}>
              <SectionHead icon="bell" title="Matched for you" sub="Jobs in categories you said you can do" />
              <div className="stack">
                {matched.map((j) => <JobCard key={j.id} job={j} onInterest={onInterest} />)}
              </div>
            </section>
          )}

          <section className="section" style={{ marginTop: matched.length ? 44 : 24 }}>
            <SectionHead icon="briefcase" title={category ? catInfo(category).label : 'All open jobs'} />
            <div className="stack">
              {rest.length === 0 && <p className="meta-dim empty-note">No open jobs here yet — be the first to post one.</p>}
              {rest.map((j) => <JobCard key={j.id} job={j} onInterest={onInterest} />)}
            </div>
          </section>
        </div>

        {user && (
          <aside className="space-side">
            <div className="card side-card">
              <div className="side-card-head"><Icon name="badge-check" size={15} /> ID Verification</div>
              {profile.idVerified ? (
                <p className="meta-dim"><span className="verified-tag"><Icon name="badge-check" size={13} /> You’re verified</span> — you can take verified-only jobs.</p>
              ) : (
                <>
                  <p className="meta-dim">Verify your ID to unlock verified-only jobs and build trust with posters.</p>
                  <button className="btn gold-outline small" onClick={() => setShowVerify(true)}>Get verified</button>
                </>
              )}
            </div>
            <SkillsPicker profile={profile} onSave={(jobSkills) => saveProfile({ jobSkills })} />
          </aside>
        )}
      </div>

      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onVerified={async (idNumber) => { await api.verifyId(idNumber); await refreshMe() }} />
      )}
    </div>
  )
}
