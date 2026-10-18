// Small shared building blocks: avatars, trace chips, tag pills, cards.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from './Icons.jsx'
import { findCommunity } from '../communities.js'
import { tagLabel } from '../ai.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Vote } from './Vote.jsx'
import { ReportButton } from './ReportButton.jsx'
import { RatingSummary } from './Rating.jsx'
import { MediaView } from './Media.jsx'
import { useFavorites, isFavorite, toggleFavorite } from '../favorites.js'

// Local, dependency-free copy of the live badge markup — Live.jsx imports
// Avatar from this file, so importing LiveBadge back from Live.jsx here
// would create a circular module dependency.
const LiveBadge = () => <span className="live-badge"><span className="live-dot" /> LIVE</span>

// A member who's been around in the last few minutes gets a blinking green
// dot on their avatar. `active` comes from the API (see publicUser).
export function Avatar({ user, size = 40 }) {
  const color = user.color || '#888'
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${color}33, ${color}18)`,
        color, borderColor: `${color}55`,
      }}
      aria-label={user.active ? `${user.name}, active now` : user.name}
    >
      {initials}
      {user.active && <span className="active-dot" style={{ '--dot': `${Math.max(8, Math.round(size * 0.24))}px` }} aria-hidden="true" />}
    </div>
  )
}

// Heart that saves anything to Favorites. `item` is { kind, id, title,
// subtitle, href }. `label` shows the word beside the heart.
export function FavoriteButton({ item, label = false, className = '' }) {
  const on = isFavorite(useFavorites(), item.kind, item.id)
  const text = on ? 'Remove from favorites' : 'Add to favorites'
  return (
    <button
      type="button"
      className={`fav-btn ${label ? 'btn ghost small' : 'icon-btn'} ${on ? 'on' : ''} ${className}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item) }}
      aria-pressed={on} aria-label={text} title={text}
    >
      <Icon name="heart" size={label ? 14 : 16} />
      {label && <span>{on ? 'Favorited' : 'Favorite'}</span>}
    </button>
  )
}

// "Why you're seeing this" — the traceability chip on every recommendation.
// Prefers the companion's natural-language reason; falls back to shared tags.
export function Trace({ shared = [], source, because }) {
  const text = because
    || (shared.length ? `${source === 'said' ? 'Because you said' : 'Matches your profile'}: ${shared.map(tagLabel).join(', ')}` : '')
  if (!text) return null
  return (
    <div className="trace">
      <Icon name="zap" size={12} />
      <span>{text}</span>
    </div>
  )
}

export function TagPills({ tags, max = 4 }) {
  return (
    <div className="pills">
      {tags.slice(0, max).map((t) => <span key={t} className="pill">{tagLabel(t)}</span>)}
    </div>
  )
}

export function CommunityCard({ community, shared = [], source, because, compact = false }) {
  const { user, profile, joinCommunity } = useApp()
  const navigate = useNavigate()
  const joined = profile.communities.includes(community.id)
  const onJoin = () => (user ? joinCommunity(community.id) : navigate('/auth'))
  const [meta, setMeta] = useState(null)
  useEffect(() => { api.getCommunity(community.id).then(setMeta).catch(() => {}) }, [community.id])
  return (
    <div className={`card community-card card-link ${compact ? 'compact' : ''}`} style={{ '--accent': community.accent }}>
      <div className="community-card-head">
        <div className="community-glyph" style={{ color: community.accent }}>
          <Icon name={community.icon} size={compact ? 18 : 22} />
        </div>
        <div className="community-card-title">
          <Link to={`/community/${community.id}`} className="card-title stretched">{community.name}</Link>
          <div className="meta-row">
            <span className={`scope-badge ${community.scope}`}>
              <Icon name={community.scope === 'global' ? 'globe' : 'map-pin'} size={11} />
              {community.scope === 'global' ? 'Global' : community.city}
            </span>
            <span className="meta-dim">{community.memberCount.toLocaleString()} members</span>
            {meta && <RatingSummary rating={meta.rating} />}
            {meta?.live && <LiveBadge />}
          </div>
        </div>
      </div>
      {!compact && <p className="card-desc">{community.tagline}</p>}
      {!compact && <TagPills tags={community.tags} />}
      <Trace shared={shared} source={source} because={because} />
      <div className="card-actions">
        <button className={joined ? 'btn ghost small' : 'btn primary small'} onClick={onJoin} disabled={joined}>
          {joined ? <><Icon name="check" size={14} /> Joined</> : 'Join'}
        </button>
        <Link to={`/community/${community.id}`} className="btn ghost small">Visit</Link>
        <FavoriteButton item={{ kind: 'community', id: community.id, title: community.name, subtitle: community.tagline, href: `/community/${community.id}` }} />
      </div>
    </div>
  )
}

export function PersonCard({ user: person, shared = [], source, because }) {
  const { user, profile, connect } = useApp()
  const navigate = useNavigate()
  const connected = profile.connections.includes(person.id)
  const onConnect = () => (user ? connect(person.id) : navigate('/auth'))
  return (
    <div className="card person-card card-link">
      <div className="person-head">
        <Avatar user={person} size={44} />
        <div>
          <Link to={`/profile/${person.id}`} className="card-title stretched">{person.name}</Link>
          <div className="meta-dim">{person.title} · {person.area ?? person.city}</div>
        </div>
      </div>
      <TagPills tags={person.interests} max={3} />
      <Trace shared={shared} source={source} because={because} />
      <div className="card-actions">
        <button className={connected ? 'btn ghost small' : 'btn primary small'} onClick={onConnect} disabled={connected}>
          {connected ? <><Icon name="check" size={14} /> Connected</> : 'Connect'}
        </button>
        <Link to={`/profile/${person.id}`} className="btn ghost small">Profile</Link>
        <FavoriteButton item={{ kind: 'person', id: person.id, title: person.name, subtitle: person.title, href: `/profile/${person.id}` }} />
      </div>
    </div>
  )
}

export function EventCard({ event, shared = [], source, because }) {
  const community = findCommunity(event.communityId)
  const d = new Date(event.date + 'T00:00:00')
  const day = d.toLocaleDateString('en-GB', { day: 'numeric' })
  const month = d.toLocaleDateString('en-GB', { month: 'short' })
  return (
    <div className={`card event-card ${community ? 'card-link' : ''}`}>
      <div className="event-head">
        <div className="date-block" style={{ '--accent': community?.accent ?? 'var(--gold)' }}>
          <span className="date-day">{day}</span>
          <span className="date-month">{month}</span>
        </div>
        <div>
          {community
            ? <Link to={`/community/${community.id}?tab=events`} className="card-title stretched">{event.title}</Link>
            : <div className="card-title">{event.title}</div>}
          <div className="meta-dim">
            <Icon name="clock" size={12} /> {event.time} · <Icon name="map-pin" size={12} /> {event.venue}
          </div>
          {community && (
            <Link to={`/community/${community.id}`} className="event-community" style={{ color: community.accent }}>
              {community.name}
            </Link>
          )}
        </div>
      </div>
      <Trace shared={shared} source={source} because={because} />
      <div className="card-actions">
        <span className="meta-dim"><Icon name="users" size={13} /> {event.attending} attending</span>
        <span className="card-actions-end">
          <FavoriteButton item={{ kind: 'event', id: event.id, title: event.title, subtitle: `${event.date} · ${event.time}${community ? ` · ${community.name}` : ''}`, href: community ? `/community/${community.id}?tab=events` : '/home' }} />
          <button className="btn primary small">RSVP</button>
        </span>
      </div>
    </div>
  )
}

// Post preview card — with voting, comment count, report, and a link to the
// full thread. Resolves its community from the catalog when not given one.
export function PostCard({ post, community, because }) {
  const comm = community || findCommunity(post.communityId)
  return (
    <div className="card post-card card-link">
      <div className="post-card-row">
        <Vote targetType="post" targetId={post.id} score={post.score} myVote={post.myVote} layout="vertical" />
        <div className="post-card-body">
          {post.pinned && <span className="pin-badge">Pinned</span>}
          <div className="post-head">
            {post.author && <Avatar user={post.author} size={28} />}
            <div className="meta-dim">
              <strong className="post-author">{post.author?.name}</strong> · {post.ago} ago
              {comm && <> · in <Link to={`/community/${comm.id}`} style={{ color: comm.accent }}>{comm.name}</Link></>}
            </div>
          </div>
          <Link to={`/post/${post.id}`} className="post-title stretched">{post.title}</Link>
          {post.body && <p className="card-desc">{post.body}</p>}
          <MediaView media={post.media} compact />
          <Trace because={because} />
          <div className="post-stats">
            <Link to={`/post/${post.id}`} className="post-stat">
              <Icon name="chat" size={14} /> {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </Link>
            <ReportButton targetType="post" targetId={post.id} />
            <FavoriteButton item={{ kind: 'post', id: post.id, title: post.title, subtitle: comm ? `in ${comm.name}` : '', href: `/post/${post.id}` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function OpportunityCard({ opp, shared = [], source, because }) {
  const community = findCommunity(opp.via)
  return (
    <div className="card opp-card">
      <div className="opp-type">{opp.type}</div>
      <div className="card-title">{opp.title}</div>
      <div className="meta-dim">{opp.org}</div>
      <p className="card-desc">{opp.detail}</p>
      <Trace shared={shared} source={source} because={because} />
      <div className="card-actions">
        {community && (
          <Link to={`/community/${community.id}`} className="meta-dim">
            via <span style={{ color: community.accent }}>{community.name}</span>
          </Link>
        )}
        <button className="btn primary small">I’m interested</button>
      </div>
    </div>
  )
}

export function SectionHead({ icon, title, sub, action }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title"><Icon name={icon} size={18} /> {title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// A one-line statement of what the city stands for (see CITY_LINES).
export function CityLine({ line, sub, icon = 'globe', className = '' }) {
  return (
    <div className={`city-line ${className}`}>
      <span className="city-line-mark"><Icon name={icon} size={20} /></span>
      <p><strong>{line}</strong>{sub && <span> {sub}</span>}</p>
    </div>
  )
}
