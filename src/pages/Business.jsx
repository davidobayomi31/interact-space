// A business's page — screen 9 of Nuel's mockup: cover, logo, Follow and
// Message, counts, About · Menu · Posts · Reviews, and Call · Website ·
// Directions. Business pages are coming soon, so for now this is built
// from the business's ad (every ad opens it) and says so; Message works.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { AdMark } from '../components/AdsRail.jsx'

const TABS = ['About', 'Menu', 'Posts', 'Reviews']

export default function Business() {
  const { id } = useParams()
  const { user } = useApp()
  const [ad, setAd] = useState(null)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState('About')
  useEffect(() => { setAd(null); api.getAd(id).then(setAd).catch(() => setMissing(true)) }, [id])

  if (missing) return <div className="page"><div className="card feed-empty"><strong>We couldn’t find that business.</strong><Link to="/city">Back to My City</Link></div></div>
  if (!ad) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>

  return (
    <div className="page biz-page" style={{ '--accent': ad.accent }}>
      <div className="biz-soon"><Icon name="sparkle" size={14} /> Business pages are coming soon — this is a preview built from {ad.businessName}’s ad.</div>
      <div className="biz-grid">
      <section className="card biz-hero">
        <div className="biz-cover"><span>{ad.emoji}</span></div>
        <div className="biz-logo"><AdMark ad={ad} /></div>
        <h1>{ad.businessName} <Icon name="badge-check" size={18} className="fp-tick" /></h1>
        <p className="meta-dim">{ad.tagline}</p>
        <span className="biz-where"><Icon name="map-pin" size={13} /> {ad.city}{ad.reach === 'universal' ? ' · serves everywhere' : ''}</span>
        <div className="biz-actions">
          <button className="btn primary" disabled title="Coming soon"><Icon name="user-plus" size={15} /> Follow</button>
          <Link to={user ? `/chats?dm=${ad.ownerId}` : '/auth'} className="btn ghost"><Icon name="message-circle" size={15} /> Message</Link>
        </div>
        <div className="pf2-stats biz-stats">
          <div><b>—</b><span>Posts</span></div>
          <div><b>—</b><span>Followers</span></div>
          <div><b>—</b><span>Reviews</span></div>
        </div>
      </section>

      <div className="biz-content">
      <div className="seg">
        {TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'About' ? (
        <section className="card biz-about">
          <p>{ad.tagline}</p>
          <ul>
            <li><Icon name="map-pin" size={15} /> {ad.city}, Nigeria</li>
            {ad.owner && <li><Icon name="user" size={15} /> Run by <Link to={`/profile/${ad.owner.id}`}>{ad.owner.name}</Link></li>}
            <li><Icon name="clock" size={15} /> Opening hours coming soon</li>
          </ul>
          <div className="biz-buttons">
            {[['phone', 'Call'], ['globe', 'Website'], ['navigation', 'Directions']].map(([icon, label]) => (
              <button key={label} className="btn ghost small" disabled title="Coming soon"><Icon name={icon} size={14} /> {label}</button>
            ))}
            <span className="btn primary small ad-cta">{ad.ctaLabel}</span>
          </div>
        </section>
      ) : (
        <section className="card feed-empty">
          <IconTile name={{ Menu: 'book', Posts: 'edit', Reviews: 'star' }[tab]} tone="grad" size={48} />
          <strong>{tab} are coming with Business pages</strong>
          <span className="meta-dim">Businesses will be able to show their {tab.toLowerCase()} here.</span>
        </section>
      )}
      </div>
      </div>
    </div>
  )
}
