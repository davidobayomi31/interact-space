// Community page — independent identity (accent color, glyph, rules) over
// a shared layout: discussions (real posts + votes), events, members.
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom'
import { ModerationPanel } from './Moderation.jsx'
import { useEffect, useState } from 'react'
import { USERS, EVENTS, CHARTER } from '../data/seed.js'
import { useCommunities, findCommunity, setCommunityCover } from '../communities.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, EventCard, PostCard, FavoriteButton } from '../components/bits.jsx'
import { LiveTab, LiveBadge } from '../components/Live.jsx'
import { RatingWidget, RatingSummary } from '../components/Rating.jsx'
import { MediaButtons, MediaTray, compressPhoto } from '../components/Media.jsx'
import { EventForm } from '../components/EventForm.jsx'

export default function Community() {
  const { id } = useParams()
  const { user, profile, joinCommunity, leaveCommunity } = useApp()
  const [params, setParams] = useSearchParams()
  const tabFromUrl = () => (['live', 'events', 'members', 'manage'].includes(params.get('tab')) ? params.get('tab') : 'discussions')
  const [tab, setTabState] = useState(tabFromUrl)
  useEffect(() => setTabState(tabFromUrl()), [params]) // eslint-disable-line
  // Keep the open tab in the URL so Manage (and the rest) can be linked to.
  const setTab = (t) => setParams(t === 'discussions' ? {} : { tab: t }, { replace: true })
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [media, setMedia] = useState([])
  const [posting, setPosting] = useState(false)
  const [live, setLive] = useState(null)
  const [meta, setMeta] = useState(null)
  const [madeEvents, setMadeEvents] = useState([])
  const [creator, setCreator] = useState(null)

  const { loaded } = useCommunities()
  const community = findCommunity(id)
  const known = !!community

  useEffect(() => { if (known) api.listPosts({ community: id }).then(setPosts).catch(() => setPosts([])) }, [id, known])
  useEffect(() => { if (known) api.getCommunityLive(id).then(setLive).catch(() => {}) }, [id, known])
  useEffect(() => { if (known) api.getCommunity(id).then(setMeta).catch(() => {}) }, [id, known])
  useEffect(() => { api.listEvents({ community: id }).then(setMadeEvents).catch(() => setMadeEvents([])) }, [id])
  useEffect(() => {
    if (meta?.createdBy) api.getUser(meta.createdBy).then(setCreator).catch(() => {})
  }, [meta?.createdBy])

  if (!community) {
    if (!loaded) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
    return <Navigate to="/" replace />
  }

  const joined = profile.communities.includes(community.id)
  const isMod = user?.moderatorOf?.includes(community.id)
  const myRole = user?.roles?.[community.id]
  const events = [...EVENTS.filter((e) => e.communityId === community.id), ...madeEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
  const members = USERS.filter((u) => community.memberIds.includes(u.id))
  const moderators = USERS.filter((u) => community.moderators.includes(u.id))
  if (creator && !moderators.some((u) => u.id === creator.id)) moderators.unshift(creator)

  const submitPost = async (e) => {
    e.preventDefault()
    if (!title.trim() || posting) return
    setPosting(true)
    try {
      const post = await api.createPost({ communityId: community.id, title, body, media })
      setPosts((p) => [post, ...p]); setTitle(''); setBody(''); setMedia([])
    } catch (err) { alert(err.message) }
    setPosting(false)
  }

  return (
    <div className="page community-page" style={{ '--accent': community.accent }}>
      <section className={`community-banner ${community.cover ? 'has-cover' : ''}`}>
        <div className="community-banner-art" aria-hidden="true" />
        {community.cover && <img className="community-cover" src={community.cover} alt="" />}
        {isMod && <CoverEdit community={community} />}
        <div className="community-banner-content">
          <div className="community-glyph large"><Icon name={community.icon} size={30} /></div>
          <div className="community-banner-text">
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
              {isMod && <button className="mod-badge-link" onClick={() => setTab('manage')}><Icon name="shield" size={12} /> {myRole === 'owner' ? 'You own this' : myRole === 'admin' ? 'You’re an admin here' : 'You moderate this'}</button>}
            </div>
          </div>
          <div className="community-banner-actions">
            <FavoriteButton label item={{ kind: 'community', id: community.id, title: community.name, subtitle: community.tagline, href: `/community/${community.id}` }} />
            {joined ? (
              <>
                <span className="joined-note"><Icon name="check" size={14} /> You’re a member</span>
                {myRole !== 'owner' && <button className="btn ghost small" onClick={() => leaveCommunity(community.id)}>Leave</button>}
              </>
            ) : (
              <button className="btn primary" onClick={() => (user ? joinCommunity(community.id) : (window.location.href = '/auth'))}>Join community</button>
            )}
          </div>
        </div>
      </section>

      <div className={`community-body ${tab === 'manage' ? 'managing' : ''}`}>
        <div className="community-main">
          <div className="tabs" role="tablist">
            {['discussions', 'events', 'live', 'members', ...(isMod ? ['manage'] : [])].map((t) => (
              <button
                key={t} role="tab" aria-selected={tab === t}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'discussions' && <><Icon name="chat" size={15} /> Discussions ({posts.length})</>}
                {t === 'events' && <><Icon name="calendar" size={15} /> Events ({events.length})</>}
                {t === 'live' && <><Icon name="radio" size={15} /> Live {live && <span className="live-dot" />}</>}
                {t === 'members' && <><Icon name="users" size={15} /> Members</>}
                {t === 'manage' && <><Icon name="shield" size={15} /> Manage</>}
              </button>
            ))}
          </div>

          {tab === 'discussions' && (
            <div className="stack">
              {joined ? (
                <form className="card composer-full" onSubmit={submitPost}>
                  <input className="composer-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Start a discussion in ${community.name}…`} aria-label="Post title" />
                  {(title || body || media.length > 0) && (
                    <textarea className="composer-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add details (optional)…" rows={3} />
                  )}
                  <MediaTray media={media} setMedia={setMedia} />
                  <div className="composer-foot">
                    <span className="composer-foot-left">
                      <MediaButtons media={media} setMedia={setMedia} />
                      <span className="meta-dim">Posting as {user.name}</span>
                    </span>
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
            <div className="stack">
              {joined ? (
                <NewEvent community={community} onCreated={(ev) => setMadeEvents((list) => [...list, ev])} />
              ) : (
                <div className="card sign-in-nudge">
                  <span className="meta-dim">{user ? 'Join this community to create an event.' : 'Sign in and join to create an event here.'}</span>
                  {!user && <Link to="/auth" className="btn primary small">Sign in</Link>}
                </div>
              )}
              <div className="card-grid two">
                {events.length ? events.map((e) => <EventCard key={e.id} event={e} />)
                  : <p className="meta-dim">No upcoming events yet — be the first to plan one.</p>}
              </div>
            </div>
          )}

          {tab === 'live' && <LiveTab community={community} isMember={joined} />}

          {tab === 'manage' && (isMod
            ? <ModerationPanel communityId={community.id} />
            : <p className="meta-dim empty-note">Only this community’s owner, admins and moderators can manage it.</p>)}

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
            <ModRules community={meta} isMod={isMod} onSaved={setMeta} />
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

// Staff can change the cover photo from the banner itself.
function CoverEdit({ community }) {
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const photo = await compressPhoto(file)
      const url = await api.uploadImage(photo.src, 'community')
      const saved = await api.setCommunityCover(community.id, url)
      setCommunityCover(community.id, saved.cover)
    } catch (err) { alert(err.message) }
    setBusy(false)
  }
  return (
    <label className={`cover-edit ${community.cover ? '' : 'no-cover'}`}>
      <Icon name={busy ? 'clock' : 'image'} size={14} /> {busy ? 'Uploading…' : community.cover ? 'Change cover' : 'Add cover photo'}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={pick} disabled={busy} />
    </label>
  )
}

// Any member can put an event on the community's calendar.
function NewEvent({ community, onCreated }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button className="card create-row" onClick={() => setOpen(true)}>
        <Icon name="plus-circle" size={18} />
        <span><strong>Create an event</strong><br /><span className="meta-dim">Meetups, workshops, walks — bring {community.name} together in person.</span></span>
      </button>
    )
  }
  return <EventForm community={community} heading={`New event in ${community.name}`} onCancel={() => setOpen(false)} onCreated={(ev) => { onCreated(ev); setOpen(false) }} />
}

// The community's standing rules stay put; moderators add their own
// beneath them, marked as coming from the moderators.
function ModRules({ community, isMod, onSaved }) {
  const rules = community?.modRules ?? []
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [busy, setBusy] = useState(false)
  if (!community || (!rules.length && !isMod)) return null

  const start = () => { setDraft(rules.length ? rules : ['']); setEditing(true) }
  const save = async () => {
    setBusy(true)
    try { onSaved(await api.setModRules(community.id, draft.map((r) => r.trim()).filter(Boolean))); setEditing(false) }
    catch (err) { alert(err.message) }
    setBusy(false)
  }

  return (
    <div className="mod-rules">
      <div className="mod-rules-head">
        <span><Icon name="sparkle" size={12} /> Added by moderators</span>
        {isMod && !editing && <button className="link-btn" onClick={start}><Icon name="edit" size={12} /> {rules.length ? 'Edit' : 'Add a rule'}</button>}
      </div>
      {editing ? (
        <div className="mod-rules-edit">
          {draft.map((r, i) => (
            <div key={i} className="mod-rule-row">
              <input className="job-input" value={r} maxLength={160} placeholder="A rule for this community"
                onChange={(e) => setDraft((d) => d.map((x, n) => (n === i ? e.target.value : x)))} aria-label={`Rule ${i + 1}`} />
              <button type="button" className="icon-btn subtle" onClick={() => setDraft((d) => d.filter((_, n) => n !== i))} aria-label="Remove rule"><Icon name="x" size={14} /></button>
            </div>
          ))}
          {draft.length < 10 && <button type="button" className="link-btn" onClick={() => setDraft((d) => [...d, ''])}><Icon name="plus" size={12} /> Another rule</button>}
          <div className="composer-foot">
            <button type="button" className="btn ghost small" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="btn primary small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save rules'}</button>
          </div>
        </div>
      ) : rules.length ? (
        <ul className="mod-rule-list">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
      ) : (
        <p className="meta-dim">You moderate this community — add rules of your own here.</p>
      )}
    </div>
  )
}
