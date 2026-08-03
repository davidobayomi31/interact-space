// Report control — any member can flag a post or comment. Reports land in
// the moderation queue for that community's moderators.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

const REASONS = ['Spam or self-promotion', 'Harassment or abuse', 'Off-topic', 'Misinformation', 'Breaks community rules']

export function ReportButton({ targetType, targetId, size = 13 }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  const file = async (reason) => {
    try { await api.report(targetType, targetId, reason); setDone(true) } catch { /* ignore */ }
    setOpen(false)
  }

  if (done) return <span className="report-done"><Icon name="check" size={size} /> Reported</span>

  return (
    <span className="report-wrap">
      <button
        className="report-btn"
        onClick={() => (user ? setOpen((o) => !o) : navigate('/auth'))}
        aria-label="Report"
      >
        <Icon name="flag" size={size} /> Report
      </button>
      {open && (
        <div className="report-menu" role="menu">
          <div className="report-menu-head">Why are you reporting this?</div>
          {REASONS.map((r) => (
            <button key={r} className="report-reason" onClick={() => file(r)}>{r}</button>
          ))}
        </div>
      )}
    </span>
  )
}
