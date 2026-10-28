// ── The Home feed ────────────────────────────────────────────────────
// Posts look like the mockup: face, name, when and who it's for, the
// words, the photos, then like · comment · share · save. The composer
// at the top posts to Public (everyone), City (people in your city) or
// one of your communities — Nuel: "what if I just wanted to make a
// public post", "people can either post public or post city".
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Avatar, FavoriteButton } from './bits.jsx'
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

// Like is an upvote: the heart fills and the count goes up.
function Like({ post }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [state, setState] = useState({ score: post.score, mine: post.myVote })
  const [pop, setPop] = useState(false)
  const toggle = async () => {
    if (!user) return navigate('/auth')
    const next = state.mine === 1 ? 0 : 1
    setState((s) => ({ score: s.score + (next - s.mine), mine: next }))
    if (next) { setPop(true); setTimeout(() => setPop(false), 400) }
    try { const r = await api.vote('post', post.id, next); setState({ score: r.score, mine: r.myVote }) } catch { /* keep the optimistic count */ }
  }
  return (
    <button className={`fp-act ${state.mine === 1 ? 'liked' : ''} ${pop ? 'pop' : ''}`} onClick={toggle} aria-pressed={state.mine === 1} aria-label="Like">
      <Icon name="heart" size={19} /> <span>{fmt(state.score)}</span>
    </button>
  )
}

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.max(0, n)))

function Share({ post }) {
  const [done, setDone] = useState(false)
  const share = async () => {
    const url = `${location.origin}/post/${post.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'VOIDAJ', text: post.title || post.body?.slice(0, 80), url })
      else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1600) }
    } catch { /* closed the share sheet */ }
  }
  return <button className="fp-act" onClick={share} aria-label="Share"><Icon name="share" size={18} /> <span>{done ? 'Copied' : 'Share'}</span></button>
}

export function FeedPost({ post }) {
  const c = post.community ?? findCommunity(post.communityId)
  return (
    <article className="card feed-post">
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
      <Link to={`/post/${post.id}`} className="fp-text">
        {post.title && <strong>{post.title}</strong>}
        {post.body && <p>{post.body}</p>}
      </Link>
      <MediaView media={post.media} />
      <footer className="fp-actions">
        <Like post={post} />
        <Link to={`/post/${post.id}`} className="fp-act" aria-label="Comments"><Icon name="chat" size={18} /> <span>{post.commentCount}</span></Link>
        <Share post={post} />
        <FavoriteButton className="fp-save" item={{ kind: 'post', id: post.id, title: post.title || post.body?.slice(0, 60) || 'Post', subtitle: c ? `in ${c.name}` : post.audience === 'city' ? post.city : 'Public', href: `/post/${post.id}` }} />
      </footer>
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
    return (
      <button className="card composer-teaser" onClick={() => setOpen(true)}>
        <Avatar user={user} size={36} />
        <span>What’s happening in {city}?</span>
        <Icon name="image" size={18} />
      </button>
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
            placeholder={audience === 'city' ? `Tell ${city} what’s happening…` : audience === 'community' ? 'Start the discussion…' : 'Share with everyone…'} />
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
