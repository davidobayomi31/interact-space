// Add Hub — "Add to VOIDAJ", the one place to create anything, laid out
// like Nuel's mockup: a list of rows, each with its own coloured icon.
// Post opens the composer right here, on top of the page (it used to jump
// to a community picker at the bottom — Nuel: "it just takes me to a
// weird spot down the bottom"), and can go to Public, your City or a
// community. Event asks which community in the same sheet.
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { useCommunities } from '../communities.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { FeedComposer } from '../components/Feed.jsx'

const ROWS = [
  { id: 'post', icon: 'edit', tone: 'violet', title: 'Post', sub: 'Share photos, updates and ideas — public, your city or a community', sheet: true },
  { id: 'event', icon: 'calendar', tone: 'pink', title: 'Event', sub: 'Create or promote a meetup, class or gathering', sheet: true },
  { id: 'job', icon: 'wrench', tone: 'orange', title: 'Job', sub: 'Get local help — plumbing, moving, tutoring and more', to: '/jobs?post=1' },
  { id: 'community', icon: 'community', tone: 'teal', title: 'Community', sub: 'Bring people together around a place or a passion', to: '/communities/new' },
  { id: 'voice', icon: 'megaphone', tone: 'blue', title: 'Voice', sub: 'A focused page for one side of who you are', to: '/voices/new' },
]
const SOON = [
  { id: 'trip', icon: 'car', tone: 'indigo', title: 'Trip', sub: 'Offer or find a ride — road trips and carpools' },
  { id: 'business', icon: 'store', tone: 'green', title: 'Business', sub: 'Promote your shop, brand or service' },
  { id: 'organization', icon: 'layers', tone: 'yellow', title: 'Organization', sub: 'Schools, NGOs, churches, associations' },
  { id: 'service', icon: 'briefcase', tone: 'red', title: 'Service', sub: 'List what you offer so people can hire you' },
]

function Sheet({ title, icon, tone, onClose, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <IconTile name={icon} tone={tone} size={36} />
          <strong>{title}</strong>
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function AddHub() {
  const { user, profile, loading } = useApp()
  const { all } = useCommunities()
  const navigate = useNavigate()
  // ?pick=post or ?pick=event (from Home's icons) opens that sheet.
  const [params, setParams] = useSearchParams()
  const picking = ['post', 'event'].includes(params.get('pick')) ? params.get('pick') : null
  const open = (id) => setParams(id ? { pick: id } : {}, { replace: !id })
  const close = () => setParams({}, { replace: true })

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />

  const mine = all.filter((c) => profile.communities.includes(c.id))

  return (
    <div className="page addhub2">
      <header className="page-head">
        <h1>Add to VOIDAJ</h1>
        <p className="meta-dim">Share, create and connect opportunities.</p>
      </header>

      <div className="addhub-list stagger">
        {ROWS.map((r) => {
          const body = (
            <>
              <IconTile name={r.icon} tone={r.tone} size={48} iconSize={22} />
              <span className="addhub-row-text"><b>{r.title}</b><em>{r.sub}</em></span>
              <Icon name="chevron-right" size={20} className="addhub-chev" />
            </>
          )
          return r.to
            ? <Link key={r.id} to={r.to} className="card addhub-row">{body}</Link>
            : <button key={r.id} className="card addhub-row" onClick={() => open(r.id)}>{body}</button>
        })}
      </div>

      <h2 className="addhub-soon-head">Coming soon</h2>
      <div className="addhub-list soon">
        {SOON.map((r) => (
          <div key={r.id} className="card addhub-row soon" aria-disabled="true">
            <IconTile name={r.icon} tone={r.tone} size={48} iconSize={22} />
            <span className="addhub-row-text"><b>{r.title} <span className="soon-badge">Coming soon</span></b><em>{r.sub}</em></span>
          </div>
        ))}
      </div>

      <section className="addhub-banner">
        <div>
          <strong>Collab. Create. Grow.</strong>
          <span>Turn your ideas into opportunities with VOIDAJ.</span>
          <Link to="/communities/new" className="btn small addhub-banner-btn">Start a community <Icon name="arrow" size={14} /></Link>
        </div>
        <Icon name="rocket" size={64} className="addhub-banner-art" />
      </section>

      {picking === 'post' && (
        <Sheet title="New post" icon="edit" tone="violet" onClose={close}>
          <FeedComposer start defaultAudience="public" onCancel={close} onPosted={(p) => navigate(`/post/${p.id}`)} />
        </Sheet>
      )}
      {picking === 'event' && (
        <Sheet title="Which community is this event for?" icon="calendar" tone="pink" onClose={close}>
          {mine.length ? (
            <div className="addhub-pick-list">
              {mine.map((c) => (
                <Link key={c.id} to={`/community/${c.id}?tab=events`} className="addhub-pick-item" style={{ '--accent': c.accent }}>
                  <span className="mod-scope-dot" aria-hidden="true" /> {c.name} <Icon name="arrow" size={14} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="meta-dim">
              Events belong to a community. <Link to="/communities">Join one</Link> or <Link to="/communities/new">start your own</Link>.
            </p>
          )}
        </Sheet>
      )}
    </div>
  )
}
