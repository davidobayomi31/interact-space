// ── The Home feed ────────────────────────────────────────────────────
// Posts look like the mockup: face, name, when and who it's for, the
// words (with #tags and @mentions as links), the photos, then the
// engagement bar: Spark · Take · Loom · Stash (see Engage.jsx). The composer
// at the top posts to Public (everyone), City (people in your city) or
// one of your communities — Nuel: "what if I just wanted to make a
// public post", "people can either post public or post city".
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Avatar } from './bits.jsx'
import { EngageBar, RichText } from './Engage.jsx'
import { MediaButtons, MediaTray, MediaView } from './Media.jsx'
import { ReportButton } from './ReportButton.jsx'
import { findCommunity } from '../communities.js'

export const AUDIENCES = [
  { id: 'public', icon: 'globe', label: 'Public', sub: 'Anyone on VOIDAJ' },
  { id: 'city', icon: 'map-pin', label: 'City', sub: 'People in your city' },
  { id: 'community', icon: 'community', label: 'Community', sub: 'Members of one community' },
]

function Audience({ post }) {
  if (post.community) return <Link to={`/community/${post.community.id}`} className="fp-aud" style={{ color: post.community.accent }}><Icon name="community" size={12} /> {post.community.name}</Link>
  if (post.audience === 'city') return <span className="fp-aud"><Icon name="map-pin" size={12} /> {post.city || 'City'}</span>
  return <span className="fp-aud"><Icon name="globe" size={12} /> Public</span>
}

// A Loom shows the post it spreads in a smaller card inside it.
function LoomedPost({ post }) {
  if (post.missing) return <div className="fp-loomed missing">The original post is no longer available.</div>
  return (
    <Link to={`/post/${post.id}`} className="fp-loomed">
      <span className="fp-loomed-who"><Avatar user={post.author} size={22} /> <b>{post.author.name}</b> <em>· {post.ago} ago</em></span>
      {post.title && <strong>{post.title}</strong>}
      {post.body && <p><RichText text={post.body} /></p>}
      <MediaView media={post.media} />
    </Link>
  )
}

export function FeedPost({ post, onLoomed }) {
  const c = post.community ?? findCommunity(post.communityId)
  const loomed = !!post.loomOf
  const stashItem = { kind: 'post', id: post.id, title: post.title || post.body?.slice(0, 60) || post.loomOf?.title || post.loomOf?.body?.slice(0, 60) || 'Post', subtitle: c ? `in ${c.name}` : post.audience === 'city' ? post.city : 'Public', href: `/post/${post.id}` }
  return (
    <article className="card feed-post">
      {loomed && <div className="fp-loom-tag"><Icon name="shuffle" size={13} /> {post.author.name.split(' ')[0]} loomed this</div>}
      <header className="fp-head">
        <Link to={`/profile/${post.author.id}`} className="fp-who">
          <Avatar user={post.author} size={42} />
          <span>
            <b>{post.author.name}{post.author.idVerified && <Icon name="badge-check" size={14} className="fp-tick" />}</b>
            <em>{post.ago} ago · <Audience post={{ ...post, community: c }} /></em>
          </span>
        </Link>
        <ReportButton targetType="post" targetId={post.id} />
      </header>
      {(post.body || (post.title && !loomed)) && (
        <div className="fp-text">
          {post.title && !loomed && <Link to={`/post/${post.id}`}><strong>{post.title}</strong></Link>}
          {post.body && <p><RichText text={post.body} /></p>}
        </div>
      )}
      <MediaView media={post.media} />
      {loomed && <LoomedPost post={post.loomOf} />}
      <EngageBar post={post} stashItem={stashItem} onLoomed={onLoomed} />
    </article>
  )
}

// `start` opens the composer already expanded (Add Hub → Post).
export function FeedComposer({ onPosted, onCancel, start = false, defaultAudience = 'public' }) {
  const { user, profile } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(start)
  const [audience, setAudience] = useState(defaultAudience)
  const [communityId, setCommunityId] = useState(profile.communities[0] ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [media, setMedia] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const city = profile.city || 'Lagos'
  const mine = profile.communities.map(findCommunity).filter(Boolean)

  const canPost = audience === 'community' ? title.trim() && communityId : (body.trim() || title.trim() || media.length)
  const submit = async (e) => {
    e.preventDefault()
    if (!canPost || busy) return
    setBusy(true); setError('')
    try {
      const post = await api.createPost({ audience, communityId: audience === 'community' ? communityId : undefined, title, body, media })
      setTitle(''); setBody(''); setMedia([]); setOpen(false)
      onPosted?.(post)
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  if (!user) {
    return (
      <button className="card composer-teaser" onClick={() => navigate('/auth')}>
        <span className="composer-teaser-face"><Icon name="user" size={18} /></span>
        <span>Step into VOIDAJ to post</span>
        <Icon name="image" size={18} />
      </button>
    )
  }
  if (!open) {
    // The desktop concepts put Photo · Video · Event · Opportunity under
    // "What's on your mind?"; a tap goes straight to the right place.
    return (
      <div className="card composer-teaser-wrap">
        <button className="composer-teaser" onClick={() => setOpen(true)}>
          <Avatar user={user} size={36} />
          <span>What’s happening in {city}?</span>
          <Icon name="image" size={18} />
        </button>
        <div className="composer-quick">
          <button type="button" onClick={() => setOpen(true)}><Icon name="image" size={15} className="q-photo" /> Photo</button>
          <button type="button" onClick={() => setOpen(true)}><Icon name="video" size={15} className="q-video" /> Video</button>
          <Link to="/add?pick=event"><Icon name="calendar" size={15} className="q-event" /> Event</Link>
          <Link to="/jobs?post=1"><Icon name="briefcase" size={15} className="q-job" /> Opportunity</Link>
        </div>
      </div>
    )
  }

  return (
    <form className="card feed-composer" onSubmit={submit}>
      <div className="fc-audience" role="radiogroup" aria-label="Who is this for?">
        {AUDIENCES.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={audience === a.id} className={audience === a.id ? 'on' : ''} onClick={() => setAudience(a.id)}>
            <Icon name={a.icon} size={14} /> {a.id === 'city' ? city : a.label}
          </button>
        ))}
      </div>
      {audience === 'community' && (
        mine.length ? (
          <select className="job-select" value={communityId} onChange={(e) => setCommunityId(e.target.value)} aria-label="Community">
            {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : <p className="meta-dim">Join a community first to post in it. <Link to="/communities">Find one</Link></p>
      )}
      <div className="fc-row">
        <Avatar user={user} size={36} />
        <div className="fc-fields">
          {audience === 'community' && <input className="fc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={140} />}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} autoFocus
            placeholder={audience === 'city' ? `Tell ${city} what’s happening… use #tags and @names` : audience === 'community' ? 'Start the discussion…' : 'Share with everyone… use #tags and @names'} />
        </div>
      </div>
      <MediaTray media={media} setMedia={setMedia} />
      {error && <p className="auth-error">{error}</p>}
      <div className="composer-foot">
        <MediaButtons media={media} setMedia={setMedia} />
        <span className="fc-spacer" />
        <button type="button" className="btn ghost small" onClick={() => (onCancel ? onCancel() : setOpen(false))}>Cancel</button>
        <button className="btn primary small" disabled={!canPost || busy}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </form>
  )
}
