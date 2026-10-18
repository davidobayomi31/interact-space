// Admin — the CEO's view of everyone on VOIDAJ: sign-up numbers at a
// glance, then every account in a sortable, searchable table that
// downloads as a spreadsheet. Only accounts marked admin can open it (the
// server checks; this page just explains if you aren't one).
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { AdminAccounts } from '../components/AdminAccounts.jsx'

const DAY = 24 * 3600 * 1000
const fmt = (ts) => (ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const ago = (ts) => {
  if (!ts) return 'Never'
  const d = Math.floor((Date.now() - ts) / DAY)
  return d < 1 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : fmt(ts)
}

const COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'city', label: 'Location' },
  { id: 'joinedAt', label: 'Joined' },
  { id: 'lastActiveAt', label: 'Last active' },
  { id: 'idVerified', label: 'Verified' },
  { id: 'communities', label: 'Communities' },
  { id: 'posts', label: 'Posts' },
  { id: 'jobsPosted', label: 'Jobs' },
]

export default function Admin() {
  const { user, loading } = useApp()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [samples, setSamples] = useState(false)
  const [sort, setSort] = useState({ by: 'joinedAt', desc: true })
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'accounts' ? 'accounts' : 'members'
  const setTab = (t) => setParams((p) => { t === 'accounts' ? p.set('tab', 'accounts') : p.delete('tab'); return p }, { replace: true })

  useEffect(() => {
    if (!user?.isAdmin) return
    api.adminUsers().then(setUsers).catch((e) => setError(e.message))
  }, [user?.isAdmin])

  const real = useMemo(() => (users ?? []).filter((u) => !u.sample), [users])
  const stats = useMemo(() => {
    const now = Date.now()
    const since = (days) => real.filter((u) => u.joinedAt && now - u.joinedAt < days * DAY).length
    return [
      { label: 'Members', value: real.length, sub: 'real accounts' },
      { label: 'Joined today', value: since(1) },
      { label: 'This week', value: since(7) },
      { label: 'This month', value: since(30) },
      { label: 'Active this week', value: real.filter((u) => u.lastActiveAt && now - u.lastActiveAt < 7 * DAY).length },
      { label: 'Finished sign-up', value: real.length ? `${Math.round((real.filter((u) => u.onboarded).length / real.length) * 100)}%` : '—' },
      { label: 'ID verified', value: real.filter((u) => u.idVerified).length },
    ]
  }, [real])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = (samples ? users ?? [] : real).filter((u) =>
      !term || [u.name, u.handle, u.email, u.phone, u.city, u.area].join(' ').toLowerCase().includes(term))
    const text = ['name', 'email', 'phone', 'city'].includes(sort.by)
    return [...list].sort((a, b) => {
      const c = text
        ? String(a[sort.by] || '').localeCompare(String(b[sort.by] || ''))
        : Number(a[sort.by] || 0) - Number(b[sort.by] || 0)
      return sort.desc ? -c : c
    })
  }, [users, real, samples, q, sort])

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth?mode=login" replace />
  if (!user.isAdmin) {
    return (
      <div className="page admin-page">
        <div className="card ghost-card left" style={{ marginTop: 40 }}>
          <Icon name="lock" size={22} />
          <p><strong>Admins only.</strong><br />This page lists every account on VOIDAJ. Ask the VOIDAJ team if you need access.</p>
        </div>
      </div>
    )
  }

  const toggleSort = (by) => setSort((s) => (s.by === by ? { by, desc: !s.desc } : { by, desc: true }))

  return (
    <div className="page admin-page">
      <section className="page-head">
        <div>
          <h1><Icon name="shield" size={22} /> Admin</h1>
          <p className="meta-dim">Only admins can see this page.</p>
        </div>
        {tab === 'members' && <a href={api.adminUsersCsvUrl} className="btn primary small" download><Icon name="arrow-down" size={14} /> Download CSV</a>}
      </section>

      <div className="view-switch" role="tablist" aria-label="Admin">
        <button role="tab" aria-selected={tab === 'members'} className={tab === 'members' ? 'on' : ''} onClick={() => setTab('members')}>
          <Icon name="users" size={15} /> Members
        </button>
        <button role="tab" aria-selected={tab === 'accounts'} className={tab === 'accounts' ? 'on' : ''} onClick={() => setTab('accounts')}>
          <Icon name="lock" size={15} /> Company accounts
        </button>
      </div>

      {tab === 'accounts' ? <AdminAccounts /> : <>

      <div className="admin-stats">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat">
            <b>{users ? s.value : '…'}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="admin-tools">
        <form className="search-pill" role="search" onSubmit={(e) => e.preventDefault()}>
          <Icon name="search" size={16} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, area…" aria-label="Search accounts" />
        </form>
        <label className="admin-check">
          <input type="checkbox" checked={samples} onChange={(e) => setSamples(e.target.checked)} /> Show sample accounts
        </label>
        <span className="meta-dim">{shown.length} {shown.length === 1 ? 'account' : 'accounts'}</span>
      </div>

      {error && <p className="auth-error">{error}</p>}
      {users === null && !error ? <p className="meta-dim">Loading accounts…</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.id} aria-sort={sort.by === c.id ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
                    <button type="button" onClick={() => toggleSort(c.id)}>
                      {c.label} {sort.by === c.id && <Icon name={sort.desc ? 'arrow-down' : 'arrow-up'} size={12} />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to={`/profile/${u.id}`} className="admin-name">{u.name}</Link>
                    <span className="meta-dim">{u.handle}{u.sample && ' · sample'}{u.admin && ' · admin'}{!u.onboarded && ' · didn’t finish sign-up'}</span>
                  </td>
                  <td>{u.email ? <a href={`mailto:${u.email}`}>{u.email}</a> : '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td>{[u.area, u.city].filter(Boolean).join(', ') || '—'}</td>
                  <td>{fmt(u.joinedAt)}</td>
                  <td>{ago(u.lastActiveAt)}</td>
                  <td>{u.idVerified ? <span className="verified-tag"><Icon name="badge-check" size={12} /> Yes</span> : 'No'}</td>
                  <td className="num">{u.communities}</td>
                  <td className="num">{u.posts}</td>
                  <td className="num">{u.jobsPosted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>}
    </div>
  )
}
