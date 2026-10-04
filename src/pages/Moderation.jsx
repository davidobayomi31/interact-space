// Moderation dashboard — the moderator's home screen. Everything you look
// after in one place: your communities and their numbers, who's in them,
// what's waiting on you, reports to act on, and what's been happening.
// Any member can report; moderators review and act.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { EVENTS } from '../data/seed.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar } from '../components/bits.jsx'

const ALL = 'all'

function timeAgo(ts) {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`
}

export default function Moderation() {
  const { user, loading } = useApp()
  const navigate = useNavigate()
  const [dash, setDash] = useState(null)
  const [reports, setReports] = useState([])
  const [ready, setReady] = useState(false)
  const [scope, setScope] = useState(ALL)

  const load = () => Promise.all([
    api.modDashboard().then(setDash),
    api.modReports().then((d) => setReports(d.reports)),
  ]).catch(() => {}).finally(() => setReady(true))
  useEffect(() => { if (!loading && !user) navigate('/auth'); else if (user) load() }, [user, loading]) // eslint-disable-line

  const act = async (id, action) => { await api.resolveReport(id, action); load() }

  const communities = dash?.communities ?? []
  const inScope = (communityId) => scope === ALL || communityId === scope
  const shown = communities.filter((c) => inScope(c.id))
  const byId = useMemo(() => Object.fromEntries(communities.map((c) => [c.id, c])), [communities])

  // The seeded demo events live in the frontend catalog, not the database.
  const today = new Date().toISOString().slice(0, 10)
  const seededUpcoming = (id) => EVENTS.filter((e) => e.communityId === id && e.date >= today).length

  const total = shown.reduce((t, c) => {
    for (const k of Object.keys(c.stats)) t[k] = (t[k] || 0) + c.stats[k]
    t.memberCount = (t.memberCount || 0) + c.memberCount
    t.upcomingEvents += seededUpcoming(c.id)
    return t
  }, { upcomingEvents: 0 })

  const open = reports.filter((r) => r.status === 'open' && inScope(r.community.id))
  const done = reports.filter((r) => r.status !== 'open' && inScope(r.community.id))

  if (ready && !communities.length) {
    return (
      <div className="page mod-page">
        <ModHead />
        <div className="card empty-mod">
          <Icon name="shield" size={26} />
          <p><strong>No communities to moderate yet.</strong></p>
          <p className="meta-dim">Start a community and you’ll moderate it — or, in this demo, the first community you join makes you its moderator.</p>
          <div className="card-actions" style={{ justifyContent: 'center' }}>
            <Link to="/communities/new" className="btn primary small"><Icon name="plus" size={14} /> Start a community</Link>
            <Link to="/" className="btn ghost small">Find a community</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page mod-page">
      <ModHead />

      {communities.length > 1 && (
        <div className="mod-scope" role="tablist" aria-label="Community">
          <button role="tab" aria-selected={scope === ALL} className={scope === ALL ? 'on' : ''} onClick={() => setScope(ALL)}>All communities</button>
          {communities.map((c) => (
            <button key={c.id} role="tab" aria-selected={scope === c.id} className={scope === c.id ? 'on' : ''}
              style={{ '--accent': c.accent }} onClick={() => setScope(c.id)}>
              <span className="mod-scope-dot" aria-hidden="true" />{c.name}
            </button>
          ))}
        </div>
      )}

      {!ready ? <p className="meta-dim" style={{ marginTop: 24 }}>Loading…</p> : <>
        <section className="mod-stats" aria-label="At a glance">
          <Stat icon="users" label="Members" value={total.memberCount} sub={`${total.joined} joined on Voidaj`} />
          <Stat icon="zap" label="Active now" value={total.activeNow} sub={`${total.activeWeek} this week`} live={total.activeNow > 0} />
          <Stat icon="plus-circle" label="New this week" value={total.newWeek} sub="members joined" />
          <Stat icon="chat" label="Posts this week" value={total.postsWeek} sub={`${total.posts} in total`} />
          <Stat icon="flag" label="Open reports" value={total.openReports} sub={`${total.resolvedWeek} resolved this week`} alert={total.openReports > 0} />
          <Stat icon="calendar" label="Upcoming events" value={total.upcomingEvents} sub="on the calendar" />
        </section>

        <div className="mod-grid">
          <div className="mod-main">
            <section className="section">
              <h2 className="section-title"><Icon name="flag" size={16} /> Reports requiring attention {open.length > 0 && <span className="mod-count">{open.length}</span>}</h2>
              {open.length === 0 ? (
                <div className="card mod-clear"><Icon name="check" size={18} /> All clear — nothing reported right now.</div>
              ) : (
                <div className="mod-list">
                  {open.map((r) => (
                    <div key={r.id} className="card mod-report">
                      <div className="mod-report-main">
                        <div className="mod-meta">
                          <span className="scope-badge local" style={{ '--accent': r.community.accent, color: r.community.accent }}>{r.community.name}</span>
                          <span className="mod-type">{r.targetType}</span>
                          <span className="meta-dim">reported by {r.reporter?.name || 'a member'}</span>
                        </div>
                        <div className="mod-reason"><Icon name="flag" size={13} /> {r.reason}</div>
                        <div className="mod-preview">
                          “{r.preview?.slice(0, 180)}{r.preview?.length > 180 ? '…' : ''}”
                          {r.author && <span className="meta-dim"> — {r.author.name}</span>}
                        </div>
                      </div>
                      <div className="mod-actions">
                        <button className="btn danger small" onClick={() => act(r.id, 'remove')}><Icon name="trash" size={14} /> Remove</button>
                        <button className="btn ghost small" onClick={() => act(r.id, 'dismiss')}>Dismiss</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="section">
              <h2 className="section-title"><Icon name="clock" size={16} /> Recent activity</h2>
              <Activity items={(dash?.activity ?? []).filter((a) => inScope(a.communityId))} byId={byId} showCommunity={scope === ALL && communities.length > 1} />
            </section>

            {done.length > 0 && (
              <section className="section">
                <h2 className="section-title meta-dim"><Icon name="check" size={16} /> Resolved reports ({done.length})</h2>
                <div className="mod-list">
                  {done.slice(0, 10).map((r) => (
                    <div key={r.id} className="card mod-report resolved">
                      <div className="mod-report-main">
                        <div className="mod-meta">
                          <span className="scope-badge local" style={{ '--accent': r.community.accent, color: r.community.accent }}>{r.community.name}</span>
                          <span className={`mod-status ${r.action}`}>{r.action === 'remove' ? 'Removed' : 'Dismissed'}</span>
                        </div>
                        <div className="mod-preview meta-dim">“{r.preview?.slice(0, 120)}…”</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="mod-side">
            <section className="card side-card">
              <div className="side-card-head"><Icon name="community" size={15} /> What you manage</div>
              <div className="mod-communities">
                {shown.map((c) => (
                  <Link key={c.id} to={`/community/${c.id}`} className="mod-community" style={{ '--accent': c.accent }}>
                    <span className="community-glyph" style={{ color: c.accent }}><Icon name={c.icon} size={16} /></span>
                    <span className="mod-community-text">
                      <strong>{c.name}</strong>
                      <span className="meta-dim">
                        {c.memberCount.toLocaleString()} members · {c.stats.activeNow} active
                        {c.stats.openReports > 0 && <> · <span className="mod-alert-text">{c.stats.openReports} open</span></>}
                      </span>
                    </span>
                    <Icon name="arrow" size={14} />
                  </Link>
                ))}
              </div>
              <Link to="/communities/new" className="link-btn"><Icon name="plus" size={12} /> Start another community</Link>
            </section>

            <section className="card side-card">
              <div className="side-card-head"><Icon name="bell" size={15} /> Pending items</div>
              <ul className="mod-pending">
                <li>
                  <span><Icon name="flag" size={13} /> Reports to review</span>
                  <strong className={total.openReports ? 'mod-alert-text' : ''}>{total.openReports}</strong>
                </li>
                <li className="meta-dim">
                  <span><Icon name="user" size={13} /> Membership requests</span>
                  <em>Soon</em>
                </li>
              </ul>
              <p className="meta-dim mod-note">Communities are open to join right now. Approval-only communities, with requests waiting here, are part of the next step.</p>
            </section>

            <Members members={(dash?.members ?? []).filter((m) => inScope(m.communityId))} byId={byId} showCommunity={scope === ALL && communities.length > 1} />
          </aside>
        </div>
      </>}
    </div>
  )
}

function ModHead() {
  return (
    <section className="discover-hero">
      <h1><Icon name="shield" size={22} /> Moderation</h1>
      <p className="meta-dim">Your communities at a glance — who’s here, what needs you, and what’s been happening.</p>
    </section>
  )
}

function Stat({ icon, label, value, sub, live, alert }) {
  return (
    <div className={`card mod-stat ${alert ? 'alert' : ''}`}>
      <span className="mod-stat-label"><Icon name={icon} size={13} /> {label}</span>
      <strong className="mod-stat-value">{live && <span className="presence-dot" aria-hidden="true" />}{(value ?? 0).toLocaleString()}</strong>
      <span className="meta-dim">{sub}</span>
    </div>
  )
}

const VERB = {
  join: { icon: 'user', say: () => 'joined' },
  post: { icon: 'chat', say: (a) => <>posted <Link to={a.link}>{a.title}</Link></> },
  comment: { icon: 'reply', say: (a) => <>commented on <Link to={a.link}>{a.title}</Link></> },
  event: { icon: 'calendar', say: (a) => <>created the event <Link to={a.link}>{a.title}</Link></> },
  report: { icon: 'flag', say: (a) => <>reported a {a.text}: <span className="mod-alert-text">{a.title}</span></> },
}

function Activity({ items, byId, showCommunity }) {
  if (!items.length) return <p className="meta-dim empty-note">Nothing yet — new members, posts, events and reports will show up here.</p>
  return (
    <ol className="card mod-activity">
      {items.map((a, i) => {
        const v = VERB[a.type]
        const c = byId[a.communityId]
        return (
          <li key={`${a.type}-${a.at}-${i}`}>
            <span className={`mod-activity-icon ${a.type}`}><Icon name={v.icon} size={13} /></span>
            <div className="mod-activity-text">
              <Link to={`/profile/${a.actor.id}`} className="post-author">{a.actor.name}</Link> {v.say(a)}
              {showCommunity && c && <>{a.type === 'join' ? ' ' : ' in '}<Link to={`/community/${c.id}`} style={{ color: c.accent }}>{c.name}</Link></>}
            </div>
            <span className="meta-dim mod-activity-time">{timeAgo(a.at)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Members({ members, byId, showCommunity }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  // One row per person, even if they're in several of your communities.
  const people = useMemo(() => {
    const seen = new Map()
    for (const m of members) {
      const row = seen.get(m.user.id) || { ...m, communities: [] }
      row.communities.push(m.communityId)
      if (m.role === 'moderator') row.role = 'moderator'
      seen.set(m.user.id, row)
    }
    return [...seen.values()]
  }, [members])
  const list = people.filter((m) => !term || `${m.user.name} ${m.user.handle ?? ''} ${m.user.title ?? ''}`.toLowerCase().includes(term))
  const activeCount = people.filter((m) => m.user.active).length

  return (
    <section className="card side-card">
      <div className="side-card-head"><Icon name="users" size={15} /> Members <span className="meta-dim">· {people.length}{activeCount > 0 && `, ${activeCount} active`}</span></div>
      {people.length > 6 && (
        <label className="mod-search">
          <Icon name="search" size={13} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" aria-label="Search members" />
        </label>
      )}
      <div className="mod-members">
        {list.slice(0, 40).map((m) => (
          <Link key={m.user.id} to={`/profile/${m.user.id}`} className="connection-row">
            <Avatar user={m.user} size={30} />
            <div className="mod-member-text">
              <div className="connection-name">{m.user.name} {m.role === 'moderator' && <span className="mod-badge">Mod</span>}</div>
              <div className="meta-dim">
                {showCommunity ? m.communities.map((id) => byId[id]?.name).filter(Boolean).join(', ') : (m.user.title || 'Member')}
              </div>
            </div>
          </Link>
        ))}
        {!list.length && <p className="meta-dim">{term ? 'No one by that name.' : 'No members yet.'}</p>}
      </div>
    </section>
  )
}
