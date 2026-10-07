// Notifications — one inbox for what needs the member's attention, gathered
// from the systems that already track it: unread messages, jobs that match
// what they do, interest in jobs they posted, and open reports for
// communities they moderate.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar } from '../components/bits.jsx'

export default function Notifications() {
  const { user, profile, loading } = useApp()
  const [items, setItems] = useState(null)

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
    ]).then(([convos, matched, mine, reports]) => {
      const list = []
      for (const c of convos.filter((c) => c.unread > 0)) {
        list.push({
          key: `dm-${c.other.id}`, at: c.lastAt, icon: 'message-circle', person: c.other,
          text: <><strong>{c.other.name}</strong> sent you {c.unread === 1 ? 'a message' : `${c.unread} messages`}: “{c.lastMessage}”</>,
          to: `/chats?dm=${c.other.id}`,
        })
      }
      for (const j of (mine.posted ?? []).filter((j) => j.interested > 0)) {
        list.push({
          key: `posted-${j.id}`, at: j.createdAt, icon: 'briefcase',
          text: <><strong>{j.interested} {j.interested === 1 ? 'person wants' : 'people want'}</strong> to do your job “{j.title}”</>,
          to: '/jobs',
        })
      }
      for (const j of matched.slice(0, 5)) {
        list.push({
          key: `job-${j.id}`, at: j.createdAt, icon: 'wrench',
          text: <>New job that matches what you do: <strong>{j.title}</strong>{j.area ? ` in ${j.area}` : ''}</>,
          to: '/jobs',
        })
      }
      for (const r of reports.filter((r) => r.status === 'open')) {
        list.push({
          key: `rep-${r.id}`, at: r.createdAt, icon: 'flag',
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

  return (
    <div className="page notif-page">
      <section className="discover-hero">
        <h1><Icon name="bell" size={24} /> Notifications</h1>
        <p className="meta-dim">Messages, jobs and community activity that need you — all in one place.</p>
      </section>

      {items === null ? (
        <p className="meta-dim" style={{ marginTop: 24 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card ghost-card left" style={{ marginTop: 24 }}>
          <Icon name="check" size={22} />
          <p><strong>You’re all caught up.</strong><br />
            New messages, jobs that match your skills, and people interested in jobs you post will show up here.
            {!profile.jobSkills?.length && <> <Link to="/jobs">Tell Quick Jobs what you can do</Link> to get matched work.</>}
            {' '}<Link to="/settings/notifications">Choose what you’re notified about</Link>.
          </p>
        </div>
      ) : (
        <div className="notif-list">
          {items.map((n) => (
            <Link key={n.key} to={n.to} className="card notif-item">
              {n.person ? <Avatar user={n.person} size={36} /> : <span className="notif-icon"><Icon name={n.icon} size={17} /></span>}
              <span className="notif-text">{n.text}</span>
              <Icon name="arrow" size={15} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
