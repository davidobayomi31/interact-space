// Community ratings — a trust signal members leave so newcomers can tell
// a community is real and active, not a scam or an abandoned shell.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

export function RatingStars({ value, size = 13, onRate }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <span className="rating-stars" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" className="rating-star-btn"
          disabled={!onRate}
          onMouseEnter={() => onRate && setHover(n)}
          onClick={() => onRate?.(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Icon name="star" size={size} className={n <= shown ? 'star-filled' : 'star-empty'} />
        </button>
      ))}
    </span>
  )
}

export function RatingSummary({ rating }) {
  if (!rating || !rating.count) return <span className="meta-dim rating-summary unrated"><Icon name="star" size={12} /> Not yet rated</span>
  return (
    <span className="meta-dim rating-summary">
      <RatingStars value={Math.round(rating.avg)} size={12} />
      <strong>{rating.avg}</strong> ({rating.count})
    </span>
  )
}

export function RatingWidget({ community, onRated }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const rate = async (stars) => {
    if (!user) return navigate('/auth')
    setBusy(true)
    try { const { community: c } = await api.rateCommunity(community.id, stars); onRated(c) }
    finally { setBusy(false) }
  }
  return (
    <div className="card side-card">
      <div className="side-card-head"><Icon name="star" size={15} /> Community trust rating</div>
      <div className="rating-widget-row">
        <RatingStars value={Math.round(community.rating?.avg || 0)} size={17} />
        <strong>{community.rating?.avg || '—'}</strong>
        <span className="meta-dim">({community.rating?.count || 0} ratings)</span>
      </div>
      <p className="meta-dim">
        {community.rating?.mine ? 'Your rating:' : 'Vouch for this community — is it real and active?'}
      </p>
      <RatingStars value={community.rating?.mine || 0} size={19} onRate={busy ? undefined : rate} />
    </div>
  )
}
