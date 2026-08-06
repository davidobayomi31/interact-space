// Community page — independent identity (accent color, glyph, rules) over
// a shared layout: discussions (real posts + votes), events, members.
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { COMMUNITIES, USERS, EVENTS, CHARTER } from '../data/seed.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, EventCard, PostCard } from '../components/bits.jsx'
import { LiveTab, LiveBadge } from '../components/Live.jsx'
import { RatingWidget, RatingSummary } from '../components/Rating.jsx'

export default function Community() {
  const { id } = useParams()
  const { user, profile, joinCommunity, leaveCommunity } = useApp()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') === 'live' ? 'live' : 'discussions')
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [live, setLive] = useState(null)
  const [meta, setMeta] = useState(null)

  const community = COMMUNITIES.find((c) => c.id === id)

  useEffect(() => { if (community) api.listPosts({ community: id }).then(setPosts).catch(() => setPosts([])) }, [id]) // eslint-disable-line
  useEffect(() => { if (community) api.getCommunityLive(id).then(setLive).catch(() => {}) }, [id])
  useEffect(() => { if (community) api.getCommunity(id).then(setMeta).catch(() => {}) }, [id])

  if (!community) return <Navigate to="/" replace />

  const joined = profile.communities.includes(community.id)
  const isMod = user?.moderatorOf?.includes(community.id)
  const events = EVENTS.filter((e) => e.communityId === community.id)
  const members = USERS.filter((u) => community.memberIds.includes(u.id))
  const moderators = USERS.filter((u) => community.moderators.includes(u.id))

  const submitPost = async (e) => {
    e.preventDefault()
    if (!title.trim() || posting) return
    setPosting(true)
    try {
      const post = await api.createPost({ communityId: community.id, title, body })
      setPosts((p) => [post, ...p]); setTitle(''); setBody('')
    } catch (err) { alert(err.message) }
    setPosting(false)
  }

  return (
    <div className="page community-page" style={{ '--accent': community.accent }}>
      <section className="community-banner">
        <div className="community-banner-art" aria-hidden="true" />
        <div className="community-banner-content">
          <div className="community-glyph large"><Icon name={community.icon} size={30} /></div>
          <div className="community-banner-text">
            <div className="breadcrumb">
              <Link to="/">World Network</Link> <span>/</span>
              <span>{community.scope === 'global' ? 'Global' : 'Nigeria / Lagos'}</span> <span>/</span>
              <strong>{community.name}</strong>
            </div>
            <h1>{community.name}</h1>
            <p className="community-tagline">{community.tagline}</p>
            <div className="meta-row">
              <span className={`scope-badge ${community.scope}`}>
                <Icon name={community.scope === 'global' ? 'globe' : 'map-pin'} size={12} />
                {community.scope === 'global' ? 'Global community' : community.city}
              </span>
              <span className="meta-dim"><Icon name="users" size={13} /> {community.memberCount.toLocaleString()} members</span>
              {meta && <RatingSummary rating={meta.rating} />}
              {live && <LiveBadge />}
              {isMod && <Link to="/mod" className="mod-badge-link"><Icon name="shield" size={12} /> You moderate this</Link>}
            </div>
          </div>
          <div className="community-banner-actions">
            {joined ? (
              <>
                <span className="joined-note"><Icon name="check" size={14} /> You’re a member</span>
                <button className="btn ghost small" onClick={() => leaveCommunity(community.id)}>Leave</button>
              </>
            ) : (
              <button className="btn primary" onClick={() => (user ? joinCommunity(community.id) : (window.location.href = '/auth'))}>Join community</button>
            )}
          </div>
        </div>
      </section>

      <div className="community-body">
        <div className="community-main">
          <div className="tabs" role="tablist">
            {['discussions', 'events', 'live', 'members'].map((t) => (
              <button
                key={t} role="tab" aria-selected={tab === t}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'discussions' && <><Icon name="chat" size={15} /> Discussions ({posts.length})</>}
                {t === 'events' && <><Icon name="calendar" size={15} /> Events ({events.length})</>}
                {t === 'live' && <><Icon name="radio" size={15} /> Live {live && <span className="live-dot" />}</>}
                {t === 'members' && <><Icon name="users" size={15} /> Members</>}
              </button>
            ))}
          </div>

          {tab === 'discussions' && (
            <div className="stack">
              {joined ? (
                <form className="card composer-full" onSubmit={submitPost}>
                  <input className="composer-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Start a discussion in ${community.name}…`} aria-label="Post title" />
                  {(title || body) && (
                    <textarea className="composer-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add details (optional)…" rows={3} />
                  )}
                  <div className="composer-foot">
                    <span className="meta-dim">Posting as {user.name}</span>
                    <button className="btn primary small" disabled={!title.trim() || posting}>Post</button>
                  </div>
                </form>
              ) : (
                <div className="card sign-in-nudge">
                  <span className="meta-dim">{user ? 'Join this community to start a discussion.' : 'Sign in and join to post here.'}</span>
                  {!user && <Link to="/auth" className="btn primary small">Sign in</Link>}
                </div>
              )}
              {posts.length === 0 && <p className="meta-dim empty-note">No discussions yet — start the first one.</p>}
              {posts.map((p) => <PostCard key={p.id} post={p} community={community} />)}
            </div>
          )}

          {tab === 'events' && (
            <div className="card-grid two">
              {events.length ? events.map((e) => <EventCard key={e.id} event={e} />)
                : <p className="meta-dim">No upcoming events — members can propose one.</p>}
            </div>
          )}

          {tab === 'live' && <LiveTab community={community} isMember={joined} />}

          {tab === 'members' && (
            <div className="member-grid">
              {members.map((u) => (
                <Link key={u.id} to={`/profile/${u.id}`} className="card member-tile">
                  <Avatar user={u} size={44} />
                  <div>
                    <div className="connection-name">{u.name} {community.moderators.includes(u.id) && <span className="mod-badge">Mod</span>}</div>
                    <div className="meta-dim">{u.title}</div>
                  </div>
                </Link>
              ))}
              <div className="card member-tile ghost">
                <Icon name="users" size={20} />
                <div className="meta-dim">+ {(community.memberCount - members.length).toLocaleString()} more members in this demo city</div>
              </div>
            </div>
          )}
        </div>

        <aside className="community-side">
          {meta && <RatingWidget community={meta} onRated={setMeta} />}

          <div className="card side-card">
            <div className="side-card-head"><Icon name="book" size={15} /> About</div>
            <p className="card-desc">{community.description}</p>
          </div>

          <div className="card side-card">
            <div className="side-card-head"><Icon name="shield" size={15} /> Community rules</div>
            <ol className="rule-list">
              {community.rules.map((r) => <li key={r}>{r}</li>)}
            </ol>
            <div className="charter-note">
              <Icon name="shield" size={13} />
              <span>Independent culture, shared Charter: {CHARTER[0].toLowerCase()}</span>
            </div>
          </div>

          <div className="card side-card">
            <div className="side-card-head"><Icon name="sparkle" size={15} /> Moderators</div>
            <div className="connection-list">
              {moderators.map((u) => (
                <Link key={u.id} to={`/profile/${u.id}`} className="connection-row">
                  <Avatar user={u} size={30} />
                  <div>
                    <div className="connection-name">{u.name}</div>
                    <div className="meta-dim">{u.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
