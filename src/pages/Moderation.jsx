// Moderation queue — reports for the communities you moderate. Keeps the
// network safe: any member can report, moderators review and act.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'

export default function Moderation() {
  const { user, loading } = useApp()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [ready, setReady] = useState(false)

  const load = () => api.modReports().then((d) => setReports(d.reports)).finally(() => setReady(true))
  useEffect(() => { if (!loading && !user) navigate('/auth'); else if (user) load() }, [user, loading]) // eslint-disable-line

  const act = async (id, action) => { await api.resolveReport(id, action); load() }

  const open = reports.filter((r) => r.status === 'open')
  const done = reports.filter((r) => r.status !== 'open')

  return (
    <div className="page mod-page">
      <section className="discover-hero">
        <h1><Icon name="shield" size={22} /> Moderation</h1>
        <p className="meta-dim">
          Reports from the communities you moderate. Removing content hides it from everyone; dismissing keeps it up.
        </p>
      </section>

      {ready && reports.length === 0 && (
        <div className="card empty-mod">
          <Icon name="shield" size={26} />
          <p><strong>No communities to moderate yet.</strong></p>
          <p className="meta-dim">In this demo, the first community you join makes you its moderator so you can try these tools. <Link to="/" className="brand-text">Find a community →</Link></p>
        </div>
      )}

      {open.length > 0 && (
        <section className="section">
          <h2 className="section-title"><Icon name="flag" size={16} /> Open reports ({open.length})</h2>
          <div className="mod-list">
            {open.map((r) => (
              <div key={r.id} className="card mod-report">
                <div className="mod-report-main">
                  <div className="mod-meta">
                    <span className="scope-badge local" style={{ '--accent': r.community.accent, color: r.community.accent }}>{r.community.name}</span>
                    <span className="mod-type">{r.targetType}</span>
                    <span className="meta-dim">reported by {r.reporter?.name || 'a member'}</span>
                  </div>
                  <div className="mod-reason"><Icon name="flag" size={13} /> {r.reason}</div>
                  <div className="mod-preview">
                    “{r.preview?.slice(0, 180)}{r.preview?.length > 180 ? '…' : ''}”
                    {r.author && <span className="meta-dim"> — {r.author.name}</span>}
                  </div>
                </div>
                <div className="mod-actions">
                  <button className="btn danger small" onClick={() => act(r.id, 'remove')}><Icon name="trash" size={14} /> Remove</button>
                  <button className="btn ghost small" onClick={() => act(r.id, 'dismiss')}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="section">
          <h2 className="section-title meta-dim"><Icon name="check" size={16} /> Resolved ({done.length})</h2>
          <div className="mod-list">
            {done.map((r) => (
              <div key={r.id} className="card mod-report resolved">
                <div className="mod-report-main">
                  <div className="mod-meta">
                    <span className="scope-badge local" style={{ '--accent': r.community.accent, color: r.community.accent }}>{r.community.name}</span>
                    <span className={`mod-status ${r.action}`}>{r.action === 'remove' ? 'Removed' : 'Dismissed'}</span>
                  </div>
                  <div className="mod-preview meta-dim">“{r.preview?.slice(0, 120)}…”</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
