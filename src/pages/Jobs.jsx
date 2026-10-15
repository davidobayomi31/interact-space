// Quick Jobs — local trade & gig work. Posters describe what they need;
// workers set the categories they do and get notified when a match posts.
// ID verification is a simulated demo badge (no real KYC provider wired up).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { JOB_CATEGORIES } from '../data/seed.js'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, SectionHead, CityLine } from '../components/bits.jsx'
import { CITY_LINES } from '../data/seed.js'

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

function PostJobForm({ onCreated, startOpen = false }) {
  const [open, setOpen] = useState(startOpen)
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

// The whole card opens the job; offering to do it happens inside.
export function JobCard({ job }) {
  const info = catInfo(job.category)
  return (
    <div className="card job-card card-link">
      <div className="job-card-head">
        <div className="community-glyph" style={{ color: 'var(--gold)' }}><Icon name={info.icon} size={20} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/jobs?job=${job.id}`} className="card-title stretched">{job.title}</Link>
          <div className="meta-row">
            <span className="pill">{info.label}</span>
            {job.verified && <span className="verified-tag"><Icon name="badge-check" size={12} /> Verified job</span>}
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
        {job.iInterested && <span className="meta-dim"><Icon name="check" size={13} /> You offered to do this</span>}
      </div>
    </div>
  )
}

// A job, opened. This is where someone offers to do it.
function JobSheet({ job, onInterest, onClose }) {
  const { user } = useApp()
  const info = catInfo(job.category)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card job-sheet" role="dialog" aria-label={job.title} onClick={(e) => e.stopPropagation()}>
        <div className="job-card-head">
          <div className="community-glyph" style={{ color: 'var(--gold)' }}><Icon name={info.icon} size={22} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="card-title">{job.title}</h2>
            <div className="meta-row">
              <span className="pill">{info.label}</span>
              {job.verified && <span className="verified-tag"><Icon name="badge-check" size={12} /> Verified job</span>}
              {job.verifiedOnly && <span className="scope-badge local"><Icon name="badge-check" size={11} /> Verified pros only</span>}
            </div>
          </div>
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <ul className="job-facts">
          {job.area && <li><Icon name="map-pin" size={14} /> {job.area}{job.city ? `, ${job.city}` : ''}</li>}
          {job.budget && <li><Icon name="tag" size={14} /> {job.budget}</li>}
          <li><Icon name="users" size={14} /> {job.interested} interested</li>
          <li><Icon name="clock" size={14} /> Posted {job.ago} ago</li>
        </ul>
        {job.description && <p className="card-desc">{job.description}</p>}
        <div className="post-head">
          <Avatar user={job.poster} size={30} />
          <div className="meta-dim">
            Posted by <Link to={`/profile/${job.poster.id}`} className="post-author">{job.poster.name}</Link>
            {job.poster.idVerified && <span className="verified-tag"><Icon name="badge-check" size={12} /> Verified</span>}
          </div>
        </div>
        <div className="composer-foot">
          {user && job.poster.id !== user.id
            ? <Link to={`/chats?dm=${job.poster.id}`} className="btn ghost small"><Icon name="message-circle" size={14} /> Message</Link>
            : <span />}
          <button
            className={job.iInterested ? 'btn ghost small' : 'btn primary small'}
            onClick={() => (user ? onInterest(job.id) : (window.location.href = '/auth'))}
          >
            {job.iInterested ? <><Icon name="check" size={14} /> You offered — undo</> : 'I can do this'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Instead of a long list, a tile that shuffles through a few categories at
// a time. Tap one to filter; the shuffle button deals a new handful.
const TILE_SIZE = 4
const deal = (exclude = []) => {
  const pool = JOB_CATEGORIES.filter((c) => !exclude.includes(c.id))
  return [...pool].sort(() => Math.random() - 0.5).slice(0, TILE_SIZE)
}

function CategoryTile({ category, onPick }) {
  const [hand, setHand] = useState(() => deal())
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setHand((h) => deal(h.map((c) => c.id))), 4500)
    return () => clearInterval(t)
  }, [paused])
  // The picked category stays in view even when it's shuffled out.
  const shown = category && !hand.some((c) => c.id === category)
    ? [{ ...catInfo(category), id: category }, ...hand.slice(0, TILE_SIZE - 1)]
    : hand
  return (
    <div className="card category-tile" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
      <div className="category-tile-head">
        <span className="hx-label"><Icon name="layers" size={12} /> Browse categories</span>
        <button type="button" className="icon-btn subtle" onClick={() => setHand((h) => deal(h.map((c) => c.id)))} aria-label="Shuffle categories">
          <Icon name="shuffle" size={15} />
        </button>
      </div>
      <div className="category-tile-grid" key={shown.map((c) => c.id).join()}>
        {shown.map((c) => (
          <button key={c.id} type="button" className={`category-chip ${category === c.id ? 'on' : ''}`} onClick={() => onPick(category === c.id ? '' : c.id)}>
            <Icon name={c.icon} size={16} /> {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Jobs() {
  const { user, profile, saveProfile, refreshMe } = useApp()
  const [jobs, setJobs] = useState([])
  const [matched, setMatched] = useState([])
  const [category, setCategory] = useState('')
  const [verifiedView, setVerifiedView] = useState(false)
  const [allMatches, setAllMatches] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [toast, setToast] = useState(null)
  const [stray, setStray] = useState(null)
  // Add Hub sends people here with ?post=1 to open the form straight away;
  // ?job=<id> opens that job.
  const [params, setParams] = useSearchParams()
  const openId = params.get('job')
  const openJob = [...matched, ...jobs].find((j) => j.id === openId) || (stray?.id === openId ? stray : null)
  const closeJob = () => setParams((p) => { p.delete('job'); return p }, { replace: true })
  // A job linked from elsewhere may sit outside the current filter.
  useEffect(() => {
    if (openId && !openJob) api.listJobs().then((all) => setStray(all.find((j) => j.id === openId) || null)).catch(() => {})
  }, [openId]) // eslint-disable-line

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
      const notify = user.settings?.notify ?? {}
      if (notify.push && notify.jobs !== false && 'Notification' in window && Notification.permission === 'granted') {
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
      setStray((s) => (s?.id === id ? job : s))
    } catch (err) { alert(err.message) }
  }

  const matchedIds = new Set(matched.map((j) => j.id))
  // Verified jobs lead each category; the toggle shows only them.
  const rest = jobs.filter((j) => !matchedIds.has(j.id) && (!verifiedView || j.verified))
    .sort((a, b) => (category ? Number(b.verified) - Number(a.verified) : 0))
  const MATCH_PREVIEW = 2
  const matchShown = allMatches ? matched : matched.slice(0, MATCH_PREVIEW)
  const listTitle = `${verifiedView ? 'Verified ' : ''}${category ? catInfo(category).label : verifiedView ? 'jobs' : 'All open jobs'}`
  const verifiedCount = jobs.filter((j) => j.verified).length

  return (
    <div className="page jobs-page">
      <section className="discover-hero">
        <h1><Icon name="wrench" size={24} /> Quick Jobs</h1>
        <p className="meta-dim">Real local work — plumbing, moving, tutoring, deliveries and more. Verified pros get priority.</p>
      </section>
      <CityLine {...CITY_LINES.work} className="compact" />

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
            {user ? <PostJobForm startOpen={params.get('post') === '1'} onCreated={(j) => setJobs((js) => [j, ...js])} /> : <span />}
          </div>

          {matched.length > 0 && (
            <section className="section" style={{ marginTop: 24 }}>
              <SectionHead icon="bell" title="Matches for you" sub="A preview of jobs in categories you said you can do"
                action={matched.length > MATCH_PREVIEW
                  ? <button className="btn ghost small" onClick={() => setAllMatches((v) => !v)}>{allMatches ? 'Show less' : `See all ${matched.length}`}</button>
                  : null} />
              <div className="stack">
                {matchShown.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            </section>
          )}

          <section className="section" style={{ marginTop: matched.length ? 44 : 24 }}>
            <CategoryTile category={category} onPick={setCategory} />
            <div className="filter-row job-filter" role="tablist" aria-label="Which jobs">
              <button role="tab" aria-selected={!category && !verifiedView} className={!category && !verifiedView ? 'on' : ''}
                onClick={() => { setCategory(''); setVerifiedView(false) }}>All jobs</button>
              <button role="tab" aria-selected={verifiedView} className={verifiedView ? 'on' : ''} onClick={() => setVerifiedView((v) => !v)}>
                <Icon name="badge-check" size={13} /> Verified jobs <span className="filter-count">{verifiedCount}</span>
              </button>
              {category && <button className="on" onClick={() => setCategory('')}>{catInfo(category).label} <Icon name="x" size={12} /></button>}
            </div>
            <SectionHead icon="briefcase" title={listTitle}
              sub={verifiedView ? 'Checked jobs from trusted posters — how jobs get verified is still being settled' : undefined} />
            <div className="stack">
              {rest.length === 0 && <p className="meta-dim empty-note">{verifiedView ? 'No verified jobs here yet.' : 'No open jobs here yet — be the first to post one.'}</p>}
              {rest.map((j) => <JobCard key={j.id} job={j} />)}
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
                  <button className="btn brand-outline small" onClick={() => setShowVerify(true)}>Get verified</button>
                </>
              )}
            </div>
            <SkillsPicker profile={profile} onSave={(jobSkills) => saveProfile({ jobSkills })} />
          </aside>
        )}
      </div>

      {openJob && <JobSheet job={openJob} onInterest={onInterest} onClose={closeJob} />}

      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onVerified={async (idNumber) => { await api.verifyId(idNumber); await refreshMe() }} />
      )}
    </div>
  )
}
