// Community ratings — a trust signal members leave so newcomers can tell
// a community is real and active, not a scam or an abandoned shell.
// Scores are shown as a bare number out of 5 — no star glyphs, and no
// rating count next to it, which read as a confusing "(3)".
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

// The input side still needs five choices; numbered steps carry the same
// meaning as stars without the glyph.
export function RatingScale({ value, onRate, disabled }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <span className="rating-scale" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button"
          className={`rating-step ${n <= shown ? 'on' : ''}`}
          disabled={disabled || !onRate}
          onMouseEnter={() => onRate && setHover(n)}
          onClick={() => onRate?.(n)}
          aria-label={`Rate ${n} out of 5`}
        >
          {n}
        </button>
      ))}
    </span>
  )
}

export function RatingSummary({ rating }) {
  if (!rating || !rating.count) return <span className="meta-dim rating-summary unrated">Not yet rated</span>
  return (
    <span className="meta-dim rating-summary">
      <strong className="rating-score">{rating.avg}/5</strong>
    </span>
  )
}

export function RatingWidget({ community, onRated }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const count = community.rating?.count || 0
  const rate = async (stars) => {
    if (!user) return navigate('/auth')
    setBusy(true)
    try { const { community: c } = await api.rateCommunity(community.id, stars); onRated(c) }
    finally { setBusy(false) }
  }
  return (
    <div className="card side-card">
      <div className="side-card-head"><Icon name="shield" size={15} /> Community trust rating</div>
      <div className="rating-widget-row">
        <strong className="rating-score large">{community.rating?.avg ? `${community.rating.avg}/5` : '—'}</strong>
        <span className="meta-dim">from {count} {count === 1 ? 'rating' : 'ratings'}</span>
      </div>
      <p className="meta-dim">
        {community.rating?.mine ? 'Your rating:' : 'Vouch for this community — is it real and active?'}
      </p>
      <RatingScale value={community.rating?.mine || 0} onRate={rate} disabled={busy} />
    </div>
  )
}
