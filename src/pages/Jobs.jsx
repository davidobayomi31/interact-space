// Quick Jobs — local trade & gig work. Posters describe what they need;
// workers set the categories they do and get notified when a match posts.
// Laid out like Nuel's mockup: a job search bar, All · Remote · Near You ·
// Saved, category tiles with photos, and jobs as rows with a picture, the
// price and when it's needed. Anyone can name their own price with Make
// an offer (Nuel, Oct 27).
// ID verification is a simulated demo badge (no real KYC provider wired up).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { JOB_CATEGORIES } from '../data/seed.js'
import * as api from '../api.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { Avatar, SectionHead, FavoriteButton } from '../components/bits.jsx'
import { JobPeople } from '../components/JobPeople.jsx'
import { useFavorites } from '../favorites.js'

const catInfo = (id) => JOB_CATEGORIES.find((c) => c.id === id) || { label: id, icon: 'briefcase' }

// A picture for each kind of work (public/images, free Unsplash photos).
// A category without one gets a coloured tile with its icon.
const CAT_PHOTO = {
  plumbing: '/images/jobs/plumbing.jpg',
  cleaning: '/images/jobs/cleaning.jpg',
  carpentry: '/images/jobs/carpentry.jpg',
  'appliance-repair': '/images/jobs/appliance-repair.jpg',
  'auto-repair': '/images/jobs/auto-repair.jpg',
  'photography-gig': '/images/communities/lagos-lens-collective.jpg',
  'event-help': '/images/events/ev-pitch-night.jpg',
  'tech-support': '/images/events/ev-js-study.jpg',
  gardening: '/images/events/ev-balcony-farm.jpg',
  electrical: '/images/events/ev-solar-workshop.jpg',
  'catering-gig': '/images/events/ev-market-popup.jpg',
  tutoring: '/images/communities/naija-devs.jpg',
  delivery: '/images/communities/balogun-market-hub.jpg',
  painting: '/images/communities/lagos-entrepreneurs.jpg',
  moving: '/images/events/ev-farm-tour.jpg',
}
const CAT_TONE = { plumbing: 'blue', electrical: 'yellow', cleaning: 'teal', moving: 'orange', painting: 'pink', carpentry: 'orange', 'appliance-repair': 'indigo', gardening: 'green', delivery: 'violet', tutoring: 'blue', 'photography-gig': 'violet', 'event-help': 'pink', 'tech-support': 'indigo', 'catering-gig': 'red', 'auto-repair': 'navy' }
const TIMINGS = ['Today', 'This week', 'This weekend', 'Flexible']

export function JobPhoto({ category, size = 64 }) {
  const info = catInfo(category)
  const src = CAT_PHOTO[category]
  return src
    ? <span className="job-photo" style={{ width: size, height: size }}><img src={src} alt="" loading="lazy" /><Icon name={info.icon} size={13} className="job-photo-badge" /></span>
    : <IconTile name={info.icon} tone={CAT_TONE[category] ?? 'blue'} size={size} iconSize={Math.round(size * 0.42)} />
}
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

// Opened by the "Post a quick job" button beside Find work / Find people.
function PostJobForm({ onCreated, onClose, startCategory }) {
  const blank = { title: '', category: JOB_CATEGORIES[0].id, area: '', budget: '', description: '', verifiedOnly: false, timing: 'Flexible', remote: false, openToOffers: true }
  const [form, setForm] = useState({ ...blank, category: JOB_CATEGORIES.some((c) => c.id === startCategory) ? startCategory : JOB_CATEGORIES[0].id })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || busy) return
    setBusy(true)
    try {
      const job = await api.createJob(form)
      onCreated(job)
      setForm(blank)
      onClose()
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  return (
    <form className="card composer-full job-form" onSubmit={submit}>
      <input className="composer-title" value={form.title} onChange={set('title')} placeholder="What do you need done? e.g. Fix a leaking kitchen pipe" autoFocus />
      <div className="job-form-row">
        <select className="job-select" value={form.category} onChange={set('category')}>
          {JOB_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input className="job-input" value={form.area} onChange={set('area')} placeholder="Area (e.g. Yaba)" />
        <input className="job-input" value={form.budget} onChange={set('budget')} placeholder="Budget (e.g. ₦15,000) — or leave blank" />
      </div>
      <div className="job-timing" role="radiogroup" aria-label="When do you need it?">
        {TIMINGS.map((t) => <button key={t} type="button" role="radio" aria-checked={form.timing === t} className={form.timing === t ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, timing: t }))}>{t}</button>)}
      </div>
      <textarea className="composer-body" value={form.description} onChange={set('description')} placeholder="Add details…" rows={3} />
      <label className="job-checkbox">
        <input type="checkbox" checked={form.openToOffers} onChange={set('openToOffers')} />
        <span><Icon name="hand-coins" size={13} /> Open to offers — people can name their own price</span>
      </label>
      <label className="job-checkbox">
        <input type="checkbox" checked={form.remote} onChange={set('remote')} />
        <span><Icon name="monitor" size={13} /> Can be done remotely</span>
      </label>
      <label className="job-checkbox">
        <input type="checkbox" checked={form.verifiedOnly} onChange={set('verifiedOnly')} />
        <span><Icon name="badge-check" size={13} /> Only show to ID-verified pros</span>
      </label>
      <div className="composer-foot">
        <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>
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

// A job as a row, like the mockup: picture, title, where and when, the
// price on the right. The whole row opens the job.
export function JobCard({ job }) {
  const info = catInfo(job.category)
  return (
    <div className="card job-row card-link">
      <JobPhoto category={job.category} size={64} />
      <div className="job-row-main">
        <Link to={`/jobs?job=${job.id}`} className="job-row-title stretched">{job.title}</Link>
        <span className="job-row-where"><Icon name={job.remote ? 'monitor' : 'map-pin'} size={12} /> {job.remote ? 'Remote' : [job.area, job.city].filter(Boolean).join(', ')}</span>
        <span className="job-row-tags">
          <span className={`job-when ${job.timing === 'Today' ? 'today' : ''}`}>{job.timing || 'Flexible'}</span>
          {job.verified && <span className="verified-tag"><Icon name="badge-check" size={11} /> Verified</span>}
          {job.offerCount > 0 && <span className="job-offers">{job.offerCount} offer{job.offerCount > 1 ? 's' : ''}</span>}
          {job.iInterested && <span className="job-mine"><Icon name="check" size={11} /> {job.myOffer ? `You offered ${job.myOffer}` : 'You offered'}</span>}
        </span>
      </div>
      <div className="job-row-side">
        <b className="job-price">{job.budget || 'Make an offer'}</b>
        {job.budget && job.openToOffers && <span className="job-neg">or offer</span>}
        <FavoriteButton item={{ kind: 'job', id: job.id, title: job.title, subtitle: [info.label, job.area, job.budget].filter(Boolean).join(' · '), href: `/jobs?job=${job.id}` }} />
      </div>
    </div>
  )
}

// A job, opened. This is where someone offers to do it.
function JobSheet({ job, onInterest, onOffer, onClose }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const info = catInfo(job.category)
  const [offering, setOffering] = useState(false)
  const [offer, setOffer] = useState(job.myOffer || '')
  const [note, setNote] = useState(job.myOfferNote || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mine = user && job.poster.id === user.id
  const sendOffer = async (e) => {
    e.preventDefault()
    if (!offer.trim() || busy) return
    setBusy(true); setError('')
    try { await onOffer(job.id, offer.trim().startsWith('₦') || /[a-z$€£]/i.test(offer) ? offer.trim() : `₦${offer.trim()}`, note); setOffering(false) }
    catch (err) { setError(err.message) }
    setBusy(false)
  }
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card job-sheet" role="dialog" aria-label={job.title} onClick={(e) => e.stopPropagation()}>
        <div className="job-card-head">
          <JobPhoto category={job.category} size={56} />
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
          {job.remote && <li><Icon name="monitor" size={14} /> Can be done remotely</li>}
          <li><Icon name="clock" size={14} /> Needed: {job.timing || 'Flexible'}</li>
          <li><Icon name="tag" size={14} /> {job.budget || 'No set price — make an offer'}{job.budget && job.openToOffers ? ' · open to offers' : ''}</li>
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
        {mine && job.offers && (
          <section className="job-offer-list">
            <div className="side-card-head"><Icon name="hand-coins" size={15} /> Offers ({job.offers.length})</div>
            {job.offers.length ? job.offers.map((o) => (
              <div key={o.user.id} className="job-offer-item">
                <Avatar user={o.user} size={34} />
                <span><b>{o.user.name}</b><em>{o.note || 'Can do it'} · {o.ago} ago</em></span>
                <strong>{o.offer || job.budget || '—'}</strong>
                <Link to={`/chats?dm=${o.user.id}&job=${job.id}`} className="btn ghost small" aria-label={`Message ${o.user.name}`}><Icon name="message-circle" size={14} /></Link>
              </div>
            )) : <p className="meta-dim">No offers yet.</p>}
          </section>
        )}

        {offering && (
          <form className="job-offer-form" onSubmit={sendOffer}>
            <label className="field"><span>Your price</span>
              <span className="job-offer-input"><b>₦</b><input value={offer.replace(/^₦/, '')} onChange={(e) => setOffer(e.target.value)} placeholder={job.budget ? job.budget.replace(/^₦/, '') : '15,000'} inputMode="numeric" autoFocus /></span>
            </label>
            <label className="field"><span>Note to {job.poster.name.split(' ')[0]} <em>optional</em></span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I can come this evening with my tools" maxLength={300} />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <div className="composer-foot">
              <button type="button" className="btn ghost small" onClick={() => setOffering(false)}>Cancel</button>
              <button className="btn primary small" disabled={!offer.trim() || busy}>{busy ? 'Sending…' : job.myOffer ? 'Update offer' : 'Send offer'}</button>
            </div>
          </form>
        )}

        {!mine && !offering && (
          <div className="composer-foot job-sheet-actions">
            {user ? <Link to={`/chats?dm=${job.poster.id}&job=${job.id}`} className="btn ghost small"><Icon name="message-circle" size={14} /> Message</Link> : <span />}
            <span className="job-sheet-buttons">
              {job.openToOffers && (
                <button className="btn ghost small" onClick={() => (user ? setOffering(true) : navigate('/auth'))}>
                  <Icon name="hand-coins" size={14} /> {job.myOffer ? `Your offer: ${job.myOffer}` : 'Make an offer'}
                </button>
              )}
              {job.iInterested ? (
                <button className="btn ghost small" onClick={() => onInterest(job.id)}><Icon name="x" size={14} /> Withdraw</button>
              ) : job.budget && (
                <button className="btn primary small" onClick={() => (user ? onInterest(job.id) : navigate('/auth'))}>Do it for {job.budget}</button>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Categories as photo tiles you swipe through (Nuel: "can those tiles get
// images or pics also"). Tap one to filter; tap again to clear.
function CategoryTiles({ category, onPick }) {
  return (
    <div className="job-cats">
      <div className="row-head"><h2>Browse categories</h2>{category && <button className="link-btn" onClick={() => onPick('')}>Clear <Icon name="x" size={12} /></button>}</div>
      <div className="rail job-cat-rail">
        {JOB_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`job-cat ${category === c.id ? 'on' : ''}`} onClick={() => onPick(category === c.id ? '' : c.id)}
            style={CAT_PHOTO[c.id] ? { '--img': `url(${CAT_PHOTO[c.id]})` } : undefined} aria-pressed={category === c.id}>
            {!CAT_PHOTO[c.id] && <IconTile name={c.icon} tone={CAT_TONE[c.id] ?? 'blue'} size={40} />}
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'remote', label: 'Remote', icon: 'monitor' },
  { id: 'near', label: 'Near You', icon: 'map-pin' },
  { id: 'offers', label: 'Open to offers', icon: 'hand-coins' },
  { id: 'verified', label: 'Verified', icon: 'badge-check' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
]

export default function Jobs() {
  const { user, profile, saveProfile, refreshMe } = useApp()
  const [jobs, setJobs] = useState([])
  const [matched, setMatched] = useState([])
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [allMatches, setAllMatches] = useState(false)
  const saved = useFavorites()
  const [showVerify, setShowVerify] = useState(false)
  const [toast, setToast] = useState(null)
  const [stray, setStray] = useState(null)
  // Add Hub sends people here with ?post=1 to open the form straight away
  // (with &category= when offering a job from someone's card); ?job=<id>
  // opens that job; ?view=people shows Find people.
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'people' ? 'people' : 'work'
  const setView = (v) => setParams((p) => { v === 'people' ? p.set('view', 'people') : p.delete('view'); return p }, { replace: true })
  const [posting, setPosting] = useState(params.get('post') === '1')
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

  const replace = (job) => {
    setJobs((js) => js.map((j) => (j.id === job.id ? job : j)))
    setMatched((js) => js.map((j) => (j.id === job.id ? job : j)))
    setStray((st) => (st?.id === job.id ? job : st))
  }
  const onOffer = async (id, offer, note) => replace(await api.makeOffer(id, offer, note))

  const onInterest = async (id) => {
    try {
      const job = await api.toggleJobInterest(id)
      setJobs((js) => js.map((j) => (j.id === id ? job : j)))
      setMatched((js) => js.map((j) => (j.id === id ? job : j)))
      setStray((s) => (s?.id === id ? job : s))
    } catch (err) { alert(err.message) }
  }

  const matchedIds = new Set(matched.map((j) => j.id))
  const city = (profile.city || 'Lagos').toLowerCase()
  const term = search.trim().toLowerCase()
  const savedIds = new Set(saved.filter((f) => f.kind === 'job').map((f) => f.id))
  const keep = (j) => (!term || `${j.title} ${j.description} ${j.area} ${j.city} ${catInfo(j.category).label}`.toLowerCase().includes(term)) && ({
    all: true,
    remote: j.remote,
    near: (j.city || 'Lagos').toLowerCase() === city,
    offers: j.openToOffers,
    verified: j.verified,
    saved: savedIds.has(j.id),
  }[filter])
  // Jobs near you come first; verified ones lead within a category.
  const rest = jobs.filter((j) => (filter !== 'all' || term || !matchedIds.has(j.id)) && keep(j))
    .sort((a, b) => (((b.city || 'Lagos').toLowerCase() === city) - ((a.city || 'Lagos').toLowerCase() === city)) || (category ? Number(b.verified) - Number(a.verified) : 0))
  const MATCH_PREVIEW = 2
  const matchShown = allMatches ? matched : matched.slice(0, MATCH_PREVIEW)
  const listTitle = term ? `Results for “${search.trim()}”` : `${FILTERS.find((f) => f.id === filter).id === 'all' ? '' : FILTERS.find((f) => f.id === filter).label + ' · '}${category ? catInfo(category).label : 'All open jobs'}`

  return (
    <div className="page jobs-page">
      <header className="page-head jobs-head">
        <h1>Quick Jobs</h1>
        <p className="meta-dim">Real local work — plumbing, moving, tutoring, deliveries and more.</p>
      </header>

      <div className="jobs-banner">
        <IconTile name="sparkle" tone="grad" size={40} />
        <span><b>Good work travels by word of mouth.</b> Here, the word of mouth is written down.</span>
      </div>

      <div className="jobs-views-row">
      <div className="seg jobs-views" role="tablist" aria-label="Quick Jobs">
        <button role="tab" aria-selected={view === 'work'} className={view === 'work' ? 'on' : ''} onClick={() => setView('work')}>
          <Icon name="briefcase" size={15} /> Find work
        </button>
        <button role="tab" aria-selected={view === 'people'} className={view === 'people' ? 'on' : ''} onClick={() => setView('people')}>
          <Icon name="users" size={15} /> Find people
        </button>
      </div>
      {user && (
        <button className="btn primary jobs-post-btn" onClick={() => { setView('work'); setPosting(true) }} aria-expanded={posting}>
          <Icon name="plus" size={15} /> Post a quick job
        </button>
      )}
      </div>

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

      {view === 'people' ? <JobPeople /> : (
      <div className="space-grid">
        <div className="space-main jobs-main">
          {user && posting && (
            <PostJobForm startCategory={params.get('category')} onClose={() => setPosting(false)} onCreated={(j) => setJobs((js) => [j, ...js])} />
          )}

          <label className="search-pill jobs-search">
            <Icon name="search" size={17} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs — e.g. plumber, Yaba, tutoring" aria-label="Search jobs" />
            {search && <button type="button" className="icon-btn subtle" onClick={() => setSearch('')} aria-label="Clear search"><Icon name="x" size={14} /></button>}
          </label>

          <div className="chip-row" role="tablist" aria-label="Which jobs">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
                {f.icon && <Icon name={f.icon} size={13} />} {f.label}
              </button>
            ))}
          </div>

          {!term && filter === 'all' && <CategoryTiles category={category} onPick={setCategory} />}

          {matched.length > 0 && !term && filter === 'all' && (
            <section className="section">
              <SectionHead icon="bell" title="Matches for you" sub="Jobs in the kinds of work you said you do"
                action={matched.length > MATCH_PREVIEW
                  ? <button className="btn ghost small" onClick={() => setAllMatches((v) => !v)}>{allMatches ? 'Show less' : `See all ${matched.length}`}</button>
                  : null} />
              <div className="stack">
                {matchShown.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            </section>
          )}

          <section className="section">
            <SectionHead icon="briefcase" title={listTitle} sub={`${rest.length} open`} />
            <div className="stack stagger" key={`${filter}-${category}`}>
              {rest.length === 0 && (
                <p className="meta-dim empty-note">
                  {filter === 'saved' ? 'Tap the bookmark on a job to save it here.' : term ? 'No jobs match that search.' : 'No open jobs here yet — be the first to post one.'}
                </p>
              )}
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
      )}

      {openJob && <JobSheet key={openJob.id} job={openJob} onInterest={onInterest} onOffer={onOffer} onClose={closeJob} />}

      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} onVerified={async (idNumber) => { await api.verifyId(idNumber); await refreshMe() }} />
      )}
    </div>
  )
}
