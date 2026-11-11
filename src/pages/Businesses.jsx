// Explore Businesses — the laptop screen of Nuel's "Business on VOIDAJ"
// mockup: search, a featured business up top, category chips, and a grid
// of businesses. Promoted ones come first. Your own businesses and a way
// to start one sit at the top for members.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { BusinessCard, BusinessLogo, Verified, useBusinessMeta } from '../components/BusinessBits.jsx'

export default function Businesses() {
  const { user, place } = useApp()
  const meta = useBusinessMeta()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  // The search is in the URL (?q=) so the header search box drives it.
  const query = params.get('q') || ''
  const setQuery = (v) => setParams((p) => { v ? p.set('q', v) : p.delete('q'); return p }, { replace: true })
  const [list, setList] = useState(null)
  const [mine, setMine] = useState([])
  const [moreCats, setMoreCats] = useState(false)

  useEffect(() => {
    setList(null)
    const t = setTimeout(() => api.listBusinesses({ category, q: query.trim() }).then(setList).catch(() => setList([])), query ? 250 : 0)
    return () => clearTimeout(t)
  }, [category, query])
  useEffect(() => { if (user) api.myBusinesses().then(setMine).catch(() => {}) }, [user])

  const pick = (id) => setParams((p) => { id ? p.set('category', id) : p.delete('category'); return p }, { replace: true })
  const cats = meta?.categories ?? []
  const shownCats = moreCats ? cats : cats.slice(0, 5)
  const featured = list?.find((b) => b.promoted && b.cover) || list?.find((b) => b.cover)

  return (
    <div className="page biz-explore">
      <header className="page-head biz-explore-head">
        <div>
          <h1>Explore Businesses</h1>
          <p className="meta-dim">Discover businesses, services and offers around you{place ? ` in ${place}` : ''}.</p>
        </div>
        {user && <Link to="/business/new" className="btn primary"><Icon name="plus" size={15} /> Create business</Link>}
      </header>

      <label className="home-search biz-search page-search">
        <Icon name="search" size={17} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search businesses, services and offers…" aria-label="Search businesses" />
      </label>

      {mine.length > 0 && (
        <section className="biz-mine">
          <span className="meta-dim">Your businesses</span>
          <div className="biz-mine-list">
            {mine.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} className="biz-mine-chip"><BusinessLogo business={b} size={28} /> {b.name}</Link>
            ))}
          </div>
        </section>
      )}

      {featured && !category && !query && (
        <Link to={`/business/${featured.id}`} className="biz-featured" style={{ '--img': `url(${featured.cover})` }}>
          <div className="biz-featured-text">
            <BusinessLogo business={featured} size={58} />
            <div>
              <b>{featured.name} <Verified on={featured.verified} /></b>
              <span>{featured.categoryLabel}{featured.city ? ` · ${featured.city}` : ''}</span>
            </div>
          </div>
          <span className="btn small biz-featured-btn">View business <Icon name="arrow" size={13} /></span>
        </Link>
      )}

      <div className="chip-row biz-cats" role="tablist" aria-label="Categories">
        <button className={!category ? 'on' : ''} onClick={() => pick('')}>All</button>
        {shownCats.map((c) => (
          <button key={c.id} className={category === c.id ? 'on' : ''} onClick={() => pick(c.id)}><Icon name={c.icon} size={13} /> {c.label}</button>
        ))}
        {cats.length > 5 && <button onClick={() => setMoreCats((m) => !m)}>{moreCats ? 'Less' : 'More'} <Icon name="chevron-down" size={13} /></button>}
      </div>

      {list === null ? (
        <p className="meta-dim">Loading…</p>
      ) : list.length === 0 ? (
        <section className="card feed-empty">
          <Icon name="store" size={30} />
          <strong>{query || category ? 'No businesses match that yet' : 'No businesses here yet'}</strong>
          <span className="meta-dim">Set up your business identity on VOIDAJ so people nearby can find you, follow you and enquire.</span>
          {user ? <Link to="/business/new" className="btn primary small">Create your business</Link> : <Link to="/auth" className="btn primary small">Step into VOIDAJ</Link>}
        </section>
      ) : (
        <div className="biz-grid-list stagger">
          {list.map((b) => <BusinessCard key={b.id} business={b} />)}
        </div>
      )}

      <section className="card biz-how">
        <h2>How it works</h2>
        <ol>
          {[
            ['store', 'Create identity', 'Set up your business profile: name, category, details and location.'],
            ['image', 'Post & share', 'Showcase your products, services, properties or offers.'],
            ['megaphone', 'Promote (optional)', 'Get more visibility and reach the right people.'],
            ['compass', 'Get discovered', 'Appear on Home, Explore and My City.'],
            ['message-circle', 'Connect', 'People view, enquire and contact you through Chat.'],
          ].map(([icon, t, s]) => <li key={t}><Icon name={icon} size={18} /><b>{t}</b><span>{s}</span></li>)}
        </ol>
      </section>
    </div>
  )
}
