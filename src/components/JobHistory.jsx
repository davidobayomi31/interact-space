// Job history — a private tracker for someone using Voida to find work.
// Everything a job-seeker actually needs at a glance: what's still waiting,
// what's gone quiet long enough to chase, who to message, and what they've
// posted themselves. Only the member sees this; it never appears to others.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

const STATUSES = [
  { id: 'applied', label: 'Waiting to hear back' },
  { id: 'talking', label: 'In talks' },
  { id: 'hired', label: 'Hired' },
  { id: 'declined', label: 'Not selected' },
  { id: 'withdrawn', label: 'Withdrawn' },
]
const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'waiting', label: 'Waiting', match: (a) => a.status === 'applied' },
  { id: 'talking', label: 'In talks', match: (a) => a.status === 'talking' },
  { id: 'hired', label: 'Hired', match: (a) => a.status === 'hired' },
  { id: 'closed', label: 'Closed', match: (a) => a.status === 'declined' || a.status === 'withdrawn' },
]
// Long enough that a polite nudge is reasonable, short enough to still matter.
const FOLLOW_UP_DAYS = 5
const daysSince = (t) => Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
const dayLabel = (n) => (n === 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`)

export function JobHistory({ profile }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const load = () => api.myJobs().then(setData).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    const a = data?.applied ?? []
    const count = (s) => a.filter((x) => x.status === s).length
    const heardBack = a.filter((x) => ['talking', 'hired', 'declined'].includes(x.status)).length
    return {
      total: a.length,
      waiting: count('applied'),
      talking: count('talking'),
      hired: count('hired'),
      responseRate: a.length ? Math.round((heardBack / a.length) * 100) : null,
      stale: a.filter((x) => x.status === 'applied' && daysSince(x.appliedAt) >= FOLLOW_UP_DAYS).length,
    }
  }, [data])

  const setStatus = async (jobId, status) => {
    setData((d) => ({ ...d, applied: d.applied.map((a) => (a.job.id === jobId ? { ...a, status, statusAt: Date.now() } : a)) }))
    try { await api.updateApplication(jobId, { status }) } catch (e) { setError(e.message); load() }
  }

  if (error) return <section className="section"><p className="auth-error">{error}</p></section>
  if (!data) return <section className="section"><p className="meta-dim">Loading your job history…</p></section>

  const shown = data.applied.filter(FILTERS.find((f) => f.id === filter).match)

  return (
    <section className="section job-history">
      <div className="section-head">
        <div>
          <h2 className="section-title"><Icon name="briefcase" size={18} /> Job history</h2>
          <p className="section-sub"><Icon name="lock" size={12} /> Only you can see this.</p>
        </div>
        <Link to="/jobs" className="btn ghost small">Find work <Icon name="arrow" size={13} /></Link>
      </div>

      <div className="jh-stats">
        <div className="jh-stat"><span className="jh-num">{stats.total}</span><span className="jh-label">Applied</span></div>
        <div className="jh-stat"><span className="jh-num">{stats.waiting}</span><span className="jh-label">Waiting to hear back</span></div>
        <div className="jh-stat"><span className="jh-num">{stats.talking}</span><span className="jh-label">In talks</span></div>
        <div className="jh-stat"><span className="jh-num">{stats.hired}</span><span className="jh-label">Hired</span></div>
        <div className="jh-stat"><span className="jh-num">{stats.responseRate == null ? '—' : `${stats.responseRate}%`}</span><span className="jh-label">Heard back</span></div>
      </div>

      {(stats.stale > 0 || !profile.idVerified || !profile.jobSkills?.length) && (
        <ul className="jh-nudges">
          {stats.stale > 0 && (
            <li><Icon name="clock" size={14} /> {stats.stale} {stats.stale === 1 ? 'application has' : 'applications have'} been waiting {FOLLOW_UP_DAYS}+ days. A short, polite message to the poster is fair game.</li>
          )}
          {!profile.idVerified && (
            <li><Icon name="badge-check" size={14} /> Verified pros get priority and can apply to verified-only jobs. <Link to="/jobs">Verify your ID</Link></li>
          )}
          {!profile.jobSkills?.length && (
            <li><Icon name="bell" size={14} /> You haven’t told us what work you do, so you won’t be alerted to matching jobs. <Link to="/jobs">Set your skills</Link></li>
          )}
        </ul>
      )}

      {data.applied.length === 0 ? (
        <div className="card ghost-card left">
          <p><strong>You haven’t applied to anything yet.</strong><br />When you tap “I can do this” on a job, it lands here so you can track it.</p>
        </div>
      ) : (
        <>
          <div className="jh-filters" role="tablist" aria-label="Filter applications">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id}
                className={`toggle-seg ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="jh-list">
            {shown.length === 0 && <p className="meta-dim">Nothing in this group.</p>}
            {shown.map((a) => {
              const days = daysSince(a.appliedAt)
              const stale = a.status === 'applied' && days >= FOLLOW_UP_DAYS
              const closed = a.job.status !== 'open'
              return (
                <article key={a.job.id} className={`jh-row status-${a.status}`}>
                  <div className="jh-main">
                    <div className="jh-title">
                      <strong>{a.job.title}</strong>
                      {closed && <span className="jh-flag">Job closed</span>}
                      {stale && <span className="jh-flag warn">Follow up</span>}
                    </div>
                    <div className="meta-dim jh-meta">
                      <span>{a.job.category}</span>
                      {a.job.budget && <span>{a.job.budget}</span>}
                      {a.job.area && <span><Icon name="map-pin" size={11} /> {a.job.area}</span>}
                      <span>Posted by {a.job.poster.name}</span>
                    </div>
                    <div className="meta-dim jh-meta">
                      <span><Icon name="clock" size={11} /> Applied {dayLabel(days)}</span>
                      {a.statusAt !== a.appliedAt && <span>Updated {dayLabel(daysSince(a.statusAt))}</span>}
                      <span>{a.job.interested} {a.job.interested === 1 ? 'person' : 'people'} interested</span>
                    </div>
                  </div>
                  <div className="jh-actions">
                    <label className="jh-status">
                      <span className="sr-only">Status for {a.job.title}</span>
                      <select className="job-select" value={a.status} onChange={(e) => setStatus(a.job.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </label>
                    <Link to={`/chats?dm=${a.job.poster.id}`} className="btn ghost small">
                      <Icon name="message-circle" size={13} /> Message
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {data.posted.length > 0 && (
        <div className="jh-posted">
          <h3 className="jh-subhead">Jobs you’ve posted</h3>
          <div className="jh-list">
            {data.posted.map((j) => (
              <article key={j.id} className="jh-row">
                <div className="jh-main">
                  <div className="jh-title"><strong>{j.title}</strong>{j.status !== 'open' && <span className="jh-flag">Closed</span>}</div>
                  <div className="meta-dim jh-meta">
                    <span>{j.category}</span>
                    <span>Posted {j.ago}</span>
                    <span><strong>{j.interested}</strong> {j.interested === 1 ? 'person' : 'people'} interested</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

