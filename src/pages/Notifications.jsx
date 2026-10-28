// Notifications — one inbox for what needs the member's attention, in
// sections, with every item saying where it came from (Nuel, Oct 25:
// "you can either suggest where the notification is from or create
// notification sections" — this does both). Gathered from the systems
// that already track each thing: messages (and what they're about), jobs
// that match what you do and offers on yours, new followers, replies to
// your posts, events you're going to, and reports in communities you run.
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { EVENTS } from '../data/seed.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { Avatar } from '../components/bits.jsx'

const SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'messages', label: 'Messages', icon: 'message-circle', tone: 'green', from: 'Chat' },
  { id: 'jobs', label: 'Jobs', icon: 'wrench', tone: 'orange', from: 'Quick Jobs' },
  { id: 'social', label: 'People', icon: 'users', tone: 'violet', from: 'Followers' },
  { id: 'posts', label: 'Posts', icon: 'edit', tone: 'blue', from: 'Your posts' },
  { id: 'events', label: 'Events', icon: 'calendar', tone: 'pink', from: 'Events' },
  { id: 'community', label: 'Communities', icon: 'community', tone: 'teal', from: 'Communities' },
]
const ABOUT = { job: 'about a job', post: 'about a post', event: 'about an event', community: 'from a community', profile: 'from your profile', map: 'from My City' }
const ago = (t) => {
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 60) return `${Math.max(1, m)}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
}

export default function Notifications() {
  const { user, profile, loading } = useApp()
  const [items, setItems] = useState(null)
  const [params, setParams] = useSearchParams()
  const section = SECTIONS.some((s) => s.id === params.get('s')) ? params.get('s') : 'all'

  useEffect(() => {
    if (!user) return
    const mod = user.moderatorOf?.length > 0
    // Settings → Notifications decides which of these sources count.
    const notify = user.settings?.notify ?? {}
    const want = (k) => notify[k] !== false
    Promise.all([
      want('messages') ? api.listConversations().catch(() => []) : [],
      want('jobs') && profile.jobSkills?.length ? api.listJobs({ matchMine: 1 }).catch(() => []) : [],
      want('jobs') ? api.myJobs().catch(() => ({})) : {},
      mod && want('community') ? api.modReports().then((d) => d.reports).catch(() => []) : [],
      api.socialNotifications().catch(() => ({ followers: [], comments: [] })),
      want('events') ? api.listRsvps().catch(() => ({ mine: [] })) : { mine: [] },
    ]).then(([convos, matched, mine, reports, social, rsvps]) => {
      const list = []
      for (const c of convos.filter((c) => c.unread > 0)) {
        list.push({
          key: `dm-${c.other.id}`, section: 'messages', at: c.lastAt, person: c.other,
          text: <><strong>{c.other.name}</strong> sent you {c.unread === 1 ? 'a message' : `${c.unread} messages`}{c.context ? <> {ABOUT[c.context.kind]}{c.context.kind !== 'profile' ? <> — <em>{c.context.title}</em></> : null}</> : null}: “{c.lastMessage}”</>,
          to: `/chats?dm=${c.other.id}`, origin: c.context,
        })
      }
      for (const j of (mine.posted ?? []).filter((j) => j.interested > 0)) {
        list.push({
          key: `posted-${j.id}`, section: 'jobs', at: j.createdAt,
          text: j.offerCount > 0
            ? <><strong>{j.offerCount} {j.offerCount === 1 ? 'offer' : 'offers'}</strong> on your job “{j.title}”</>
            : <><strong>{j.interested} {j.interested === 1 ? 'person wants' : 'people want'}</strong> to do your job “{j.title}”</>,
          to: `/jobs?job=${j.id}`,
        })
      }
      for (const j of matched.slice(0, 5)) {
        list.push({
          key: `job-${j.id}`, section: 'jobs', at: j.createdAt,
          text: <>New job that matches what you do: <strong>{j.title}</strong>{j.area ? ` in ${j.area}` : ''}{j.budget ? ` · ${j.budget}` : ''}</>,
          to: `/jobs?job=${j.id}`,
        })
      }
      for (const f of social.followers) {
        list.push({ key: `f-${f.user.id}`, section: 'social', at: f.at, person: f.user, text: <><strong>{f.user.name}</strong> started following you</>, to: `/profile/${f.user.id}` })
      }
      for (const c of social.comments) {
        list.push({ key: `c-${c.postId}-${c.at}`, section: 'posts', at: c.at, person: c.user, text: <><strong>{c.user.name}</strong> replied to “{c.postTitle}”: {c.text}</>, to: `/post/${c.postId}` })
      }
      const today = new Date().toISOString().slice(0, 10)
      for (const id of rsvps.mine) {
        const e = EVENTS.find((x) => x.id === id)
        if (e && e.date >= today) list.push({ key: `ev-${id}`, section: 'events', at: Date.now() - 1, text: <>You’re going to <strong>{e.title}</strong> — {e.date} · {e.time}</>, to: '/events?tab=mine' })
      }
      for (const r of reports.filter((r) => r.status === 'open')) {
        list.push({
          key: `rep-${r.id}`, section: 'community', at: r.createdAt,
          text: <>A {r.targetType} was reported in <strong>{r.community?.name ?? 'your community'}</strong>{r.reason ? `: “${r.reason}”` : ''}</>,
          to: `/community/${r.community?.id}?tab=manage`,
        })
      }
      list.sort((a, b) => (b.at || 0) - (a.at || 0))
      setItems(list)
    })
  }, [user]) // eslint-disable-line

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />

  const count = (id) => (items || []).filter((n) => id === 'all' || n.section === id).length
  const shown = (items || []).filter((n) => section === 'all' || n.section === section)

  return (
    <div className="page notif-page notif2">
      <header className="page-head">
        <h1>Notifications</h1>
        <p className="meta-dim">Messages, jobs, people and community activity — each one says where it’s from.</p>
      </header>

      <div className="chip-row" role="tablist" aria-label="Sections">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={section === s.id ? 'on' : ''}
            onClick={() => setParams(s.id === 'all' ? {} : { s: s.id }, { replace: true })}>
            {s.icon && <Icon name={s.icon} size={13} />} {s.label}{items && count(s.id) > 0 && <span className="filter-count">{count(s.id)}</span>}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="notif-list">{[0, 1, 2].map((n) => <div key={n} className="card notif-skel" />)}</div>
      ) : shown.length === 0 ? (
        <div className="card feed-empty">
          <IconTile name="check" tone="grad" size={52} />
          <strong>You’re all caught up</strong>
          <span className="meta-dim">
            New messages, jobs that match your skills, followers and replies will show up here.
            {!profile.jobSkills?.length && <> <Link to="/jobs">Tell Quick Jobs what you can do</Link> to get matched work.</>}
            {' '}<Link to="/settings/notifications">Choose what you’re notified about</Link>.
          </span>
        </div>
      ) : (
        <div className="notif-list stagger">
          {shown.map((n) => {
            const src = SECTIONS.find((s) => s.id === n.section)
            return (
              <Link key={n.key} to={n.to} className="card notif-item notif2-item">
                <span className="notif2-face">
                  {n.person ? <Avatar user={n.person} size={44} /> : <IconTile name={src.icon} tone={src.tone} size={44} />}
                  {n.person && <IconTile name={src.icon} tone={src.tone} size={20} iconSize={11} className="notif2-badge" />}
                </span>
                <span className="notif2-text">
                  <span className={`notif2-from itone-${src.tone}`}>{src.from}</span>
                  <span>{n.text}</span>
                </span>
                <span className="notif2-time">{ago(n.at)}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
