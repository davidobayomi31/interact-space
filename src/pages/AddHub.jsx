// Add Hub — the one place to create anything on Voidaj. Each tile hands off
// to the flow that already owns that thing (a post lives in a community, a
// job in Quick Jobs), so there is one way to make each of them, not two.
import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { useCommunities } from '../communities.js'
import { Icon } from '../components/Icons.jsx'

const TILES = [
  { id: 'post', icon: 'chat', title: 'Post', sub: 'Start a discussion in one of your communities', pick: '' },
  { id: 'event', icon: 'calendar', title: 'Event', sub: 'Plan a meetup, class or gathering for a community', pick: '?tab=events' },
  { id: 'job', icon: 'wrench', title: 'Job', sub: 'Get local help — plumbing, moving, tutoring and more', to: '/jobs?post=1' },
  { id: 'community', icon: 'community', title: 'Community', sub: 'Bring people together around a place or a passion', to: '/communities/new' },
  { id: 'voice', icon: 'megaphone', title: 'Voice', sub: 'A focused page for one side of who you are', to: '/voices/new' },
  { id: 'business', icon: 'store', title: 'Business', sub: 'A page for your shop, brand or company', soon: true },
  { id: 'organization', icon: 'layers', title: 'Organization', sub: 'Schools, NGOs, churches, associations', soon: true },
  { id: 'service', icon: 'briefcase', title: 'Service', sub: 'List what you offer so people can hire you', soon: true },
]

export default function AddHub() {
  const { user, profile, loading } = useApp()
  const { all } = useCommunities()
  // ?pick=post or ?pick=event (from Home's Quick Actions) opens that tile.
  const [params] = useSearchParams()
  const [picking, setPicking] = useState(() => (['post', 'event'].includes(params.get('pick')) ? params.get('pick') : null))

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />

  const mine = all.filter((c) => profile.communities.includes(c.id))
  const tile = TILES.find((t) => t.id === picking)

  return (
    <div className="page addhub-page">
      <section className="discover-hero">
        <h1><Icon name="plus-circle" size={24} /> Add Hub</h1>
        <p className="meta-dim">What would you like to add to the city?</p>
      </section>

      <div className="addhub-grid">
        {TILES.map((t) => {
          const body = (
            <>
              <span className="addhub-icon"><Icon name={t.icon} size={22} /></span>
              <span className="addhub-title">{t.title}{t.soon && <span className="addhub-soon">Soon</span>}</span>
              <span className="meta-dim">{t.sub}</span>
            </>
          )
          if (t.soon) return <div key={t.id} className="card addhub-tile soon" aria-disabled="true">{body}</div>
          if (t.to) return <Link key={t.id} to={t.to} className="card addhub-tile">{body}</Link>
          return (
            <button key={t.id} className={`card addhub-tile ${picking === t.id ? 'on' : ''}`} onClick={() => setPicking(picking === t.id ? null : t.id)} aria-expanded={picking === t.id}>
              {body}
            </button>
          )
        })}
      </div>

      {tile && (
        <section className="card addhub-pick">
          <div className="side-card-head"><Icon name={tile.icon} size={15} /> Which community is this {tile.title.toLowerCase()} for?</div>
          {mine.length ? (
            <div className="addhub-pick-list">
              {mine.map((c) => (
                <Link key={c.id} to={`/community/${c.id}${tile.pick}`} className="addhub-pick-item" style={{ '--accent': c.accent }}>
                  <span className="mod-scope-dot" aria-hidden="true" /> {c.name} <Icon name="arrow" size={14} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="meta-dim">
              You haven’t joined a community yet. <Link to="/explore?type=communities">Find one in Explore</Link> or <Link to="/communities/new">start your own</Link>.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
