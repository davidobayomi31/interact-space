// Communities — the hub from Nuel's mockup: For You · My Communities ·
// Discover, a hero card, Popular Communities as photo cards with Join,
// and Suggested for You as a list. It's the "Community" tab on phones.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { useCommunities } from '../communities.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { Cover } from './Home.jsx'

const TABS = [
  { id: 'foryou', label: 'For You' },
  { id: 'mine', label: 'My Communities' },
  { id: 'discover', label: 'Discover' },
]
const members = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0))

function JoinButton({ c }) {
  const { user, profile, joinCommunity } = useApp()
  const navigate = useNavigate()
  const joined = profile.communities.includes(c.id)
  const [busy, setBusy] = useState(false)
  const join = async (e) => {
    e.preventDefault(); e.stopPropagation()
    if (!user) return navigate('/auth')
    setBusy(true)
    try { await joinCommunity(c.id) } catch { /* ignore */ }
    setBusy(false)
  }
  return joined
    ? <span className="cm-joined"><Icon name="check" size={12} /> Joined</span>
    : <button className="btn primary small cm-join" onClick={join} disabled={busy}>{busy ? '…' : 'Join'}</button>
}

function PopularCard({ c }) {
  return (
    <Link to={`/community/${c.id}`} className="cm-pop card-link" style={{ '--accent': c.accent }}>
      <div className="cm-pop-photo">
        <Icon name={c.icon ?? 'community'} size={30} />
        <Cover src={c.cover} />
      </div>
      <div className="cm-pop-body">
        <b>{c.name}</b>
        <span>{members(c.memberCount)} members</span>
        <JoinButton c={c} />
      </div>
    </Link>
  )
}

function SuggestRow({ c, why }) {
  return (
    <Link to={`/community/${c.id}`} className="card cm-row card-link" style={{ '--accent': c.accent }}>
      <span className="cm-row-photo">{c.cover ? <img src={c.cover} alt="" loading="lazy" /> : <Icon name={c.icon ?? 'community'} size={20} />}</span>
      <span className="cm-row-text">
        <b>{c.name}</b>
        <em>{members(c.memberCount)} members · {c.scope === 'global' ? 'Global' : c.city || 'Local'}</em>
        {why && <i>{why}</i>}
      </span>
      <JoinButton c={c} />
    </Link>
  )
}

export default function Communities() {
  const { profile } = useApp()
  const { all } = useCommunities()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'foryou'
  const setTab = (t) => setParams(t === 'foryou' ? {} : { tab: t }, { replace: true })
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()

  const interests = (profile.interests || []).map((i) => i.toLowerCase())
  const matchFor = (c) => (c.tags || []).find((t) => interests.some((i) => t.includes(i) || i.includes(t)))
  const filtered = all.filter((c) => !term || `${c.name} ${c.tagline} ${(c.tags || []).join(' ')}`.toLowerCase().includes(term))
  const mine = filtered.filter((c) => profile.communities.includes(c.id))
  const notMine = filtered.filter((c) => !profile.communities.includes(c.id))
  const popular = useMemo(() => [...filtered].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0)).slice(0, 8), [filtered])
  const suggested = [...notMine].sort((a, b) => (!!matchFor(b) - !!matchFor(a)) || ((b.memberCount ?? 0) - (a.memberCount ?? 0)))
  const faces = all.filter((c) => c.cover).slice(0, 4)

  return (
    <div className="page cm-page">
      <div className="seg cm-tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      <label className="search-pill"><Icon name="search" size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities" aria-label="Search communities" /></label>

      {tab === 'foryou' && !term && (
        <section className="cm-hero">
          <div className="cm-hero-text">
            <strong>Communities</strong>
            <span>People · Interests · Places</span>
            <button className="btn small cm-hero-btn" onClick={() => setTab('discover')}>Join communities <Icon name="arrow" size={14} /></button>
          </div>
          <div className="cm-hero-faces" aria-hidden="true">
            {faces.map((c, i) => <img key={c.id} src={c.cover} alt="" style={{ '--i': i }} />)}
          </div>
        </section>
      )}

      {tab === 'foryou' && (
        <>
          <section className="home-row">
            <div className="row-head"><h2>Popular Communities</h2><button className="link-btn" onClick={() => setTab('discover')}>See all <Icon name="arrow" size={13} /></button></div>
            <div className="rail cm-pop-rail">{popular.map((c) => <PopularCard key={c.id} c={c} />)}</div>
          </section>
          {suggested.length > 0 && (
            <section className="home-row">
              <div className="row-head"><h2>Suggested for You</h2></div>
              <div className="cm-list stagger">{suggested.slice(0, 6).map((c) => <SuggestRow key={c.id} c={c} why={matchFor(c) ? `Because you like ${matchFor(c)}` : null} />)}</div>
            </section>
          )}
        </>
      )}

      {tab === 'mine' && (
        <section className="cm-list stagger">
          {mine.length ? mine.map((c) => <SuggestRow key={c.id} c={c} />) : (
            <div className="card feed-empty">
              <IconTile name="community" tone="teal" size={52} />
              <strong>{term ? 'None of yours match that' : 'You haven’t joined a community yet'}</strong>
              <button className="btn primary small" onClick={() => setTab('discover')}>Discover communities</button>
            </div>
          )}
        </section>
      )}

      {tab === 'discover' && (
        <section className="cm-grid stagger">
          {filtered.map((c) => <PopularCard key={c.id} c={c} />)}
        </section>
      )}

      <Link to="/communities/new" className="card cm-create card-link">
        <IconTile name="plus" tone="grad" size={44} />
        <span><b>Start a community</b><em>Bring people together around a place or a passion</em></span>
        <Icon name="chevron-right" size={20} />
      </Link>
    </div>
  )
}
