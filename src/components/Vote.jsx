// Voting control — a quality signal that ranks answers, not feed fuel.
// Clicking the active arrow again clears the vote.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

export function Vote({ targetType, targetId, score, myVote = 0, layout = 'vertical' }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [s, setS] = useState(score)
  const [mv, setMv] = useState(myVote)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setS(score); setMv(myVote) }, [score, myVote, targetId])

  const cast = async (value) => {
    if (!user) return navigate('/auth')
    if (busy) return
    setBusy(true)
    try {
      const res = await api.vote(targetType, targetId, mv === value ? 0 : value)
      setS(res.score); setMv(res.myVote)
    } catch { /* ignore transient vote errors */ }
    setBusy(false)
  }

  return (
    <div className={`vote vote-${layout}`}>
      <button className={`vote-btn up ${mv === 1 ? 'active' : ''}`} onClick={() => cast(1)} aria-label="Upvote" aria-pressed={mv === 1}>
        <Icon name="arrow-up" size={15} />
      </button>
      <span className={`vote-score ${mv === 1 ? 'up' : mv === -1 ? 'down' : ''}`}>{s}</span>
      <button className={`vote-btn down ${mv === -1 ? 'active' : ''}`} onClick={() => cast(-1)} aria-label="Downvote" aria-pressed={mv === -1}>
        <Icon name="arrow-down" size={15} />
      </button>
    </div>
  )
}
