// Ads — local businesses that back the city. The rail is its own bar
// down the right side of the screen, top to bottom, with "Post advert"
// at its foot. The page makes room for it
// rather than sliding under it.
// One ad is enlarged at a time for 5s, then minimizes as the next
// takes its turn, looping continuously. Businesses pay to be listed;
// payment is simulated (no real processor wired up in this prototype).
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

const ACCENTS = ['#C0342A', '#1F5FA8', '#1B7F3B', '#6B3FA0', '#B45309', '#0F6E6E']

// Advertisers give us a name, not a logo file, so the rail draws a
// monogram from the name in their own accent colour.
export function AdMark({ ad }) {
  const initials = ad.businessName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return <span className="ad-mark" style={{ background: ad.accent }} aria-hidden="true">{initials}</span>
}

// Shown when the API is unreachable (e.g. a static-only deploy with no
// backend) or hasn't been seeded yet, so the rail is never empty in a demo.
export const FALLBACK_ADS = [
  { id: 'fallback-1', businessName: 'Kola Foods', tagline: 'Snacks made from grandma’s recipes', ctaLabel: 'Order now', accent: '#B4472A' },
  { id: 'fallback-2', businessName: 'Adire by Funke', tagline: 'Modern cuts, hand-dyed textiles', ctaLabel: 'Shop the drop', accent: '#A8306A' },
  { id: 'fallback-3', businessName: 'SunHome Solar', tagline: 'Off the generator in 3 weeks', ctaLabel: 'Get a quote', accent: '#7A5A0F' },
  { id: 'fallback-4', businessName: 'Folake Bakes', tagline: 'Small-chops for every occasion', ctaLabel: 'See menu', accent: '#8F5513' },
  { id: 'fallback-5', businessName: 'Naija Devs Bootcamp', tagline: 'Learn to code, get mentored, get hired', ctaLabel: 'Enroll now', accent: '#0F6E6E' },
  { id: 'fallback-6', businessName: 'Green Lagos Nursery', tagline: 'Seedlings and soil for your balcony farm', ctaLabel: 'Visit us', accent: '#1B7F3B' },
]

function AdvertiseForm({ onClose, onCreated }) {
  const { place } = useApp()
  const [form, setForm] = useState({ businessName: '', tagline: '', ctaLabel: 'Learn more', accent: ACCENTS[0], city: place, reach: 'local' })
  const [step, setStep] = useState('form') // form | pay
  const [ad, setAd] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.businessName.trim() || busy) return
    setBusy(true)
    try { setAd(await api.createAd(form)); setStep('pay') }
    catch (err) { alert(err.message) }
    setBusy(false)
  }

  const pay = async () => {
    setBusy(true)
    try { const paid = await api.payForAd(ad.id); onCreated(paid); onClose() }
    catch (err) { alert(err.message) }
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="side-card-head"><Icon name="tag" size={16} /> Post an advert</div>
        {step === 'form' ? (
          <form className="composer-full" onSubmit={submit}>
            <input className="composer-title" value={form.businessName} onChange={set('businessName')} placeholder="Business name" autoFocus />
            <input className="job-input" value={form.tagline} onChange={set('tagline')} placeholder="One-line tagline" />
            <div className="job-form-row">
              <input className="job-input" value={form.ctaLabel} onChange={set('ctaLabel')} placeholder="Button text (e.g. Order now)" />
              <select className="job-select" value={form.accent} onChange={set('accent')}>
                {ACCENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="job-form-row">
              <input className="job-input" value={form.city} onChange={set('city')} placeholder="City (e.g. Lagos)" />
              <select className="job-select" value={form.reach} onChange={set('reach')} aria-label="Who sees it">
                <option value="local">Local: people in this city</option>
                <option value="universal">Universal: everywhere</option>
              </select>
            </div>
            <div className="composer-foot">
              <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>
              <button className="btn primary small" disabled={!form.businessName.trim() || busy}>{busy ? 'Saving…' : 'Continue to payment'}</button>
            </div>
          </form>
        ) : (
          <div className="composer-full">
            <p className="meta-dim">
              Preview:
            </p>
            <div className="card ad-card enlarged" style={{ '--accent': ad.accent }}>
              <AdMark ad={ad} />
              <strong>{ad.businessName}</strong>
              <span className="meta-dim">{ad.tagline}</span>
              <span className="btn primary small ad-cta">{ad.ctaLabel}</span>
            </div>
            <p className="meta-dim"><em>Demo checkout — no real payment is processed.</em></p>
            <div className="composer-foot">
              <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>
              <button className="btn primary small" onClick={pay} disabled={busy}>{busy ? 'Processing…' : 'Pay ₦8,000 & go live'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// The "⋯" in the rail's corner: pick Local (this city's businesses) or
// Universal (ads that run everywhere).
function ScopeMenu() {
  const { adScope, setAdScope, place } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])
  const pick = (s) => { setAdScope(s); setOpen(false) }
  return (
    <div className="ads-scope" ref={ref}>
      <button className="ads-scope-btn" aria-label="Choose which ads to show" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="more" size={18} />
      </button>
      {open && (
        <div className="ads-scope-menu" role="menu">
          <span className="ads-scope-title">Show ads from</span>
          <button role="menuitemradio" aria-checked={adScope === 'local'} className={adScope === 'local' ? 'on' : ''} onClick={() => pick('local')}>
            <Icon name="map-pin" size={15} /><span><b>Local</b><em>Businesses in {place}</em></span>{adScope === 'local' && <Icon name="check" size={14} />}
          </button>
          <button role="menuitemradio" aria-checked={adScope === 'universal'} className={adScope === 'universal' ? 'on' : ''} onClick={() => pick('universal')}>
            <Icon name="globe" size={15} /><span><b>Universal</b><em>Ads that run everywhere</em></span>{adScope === 'universal' && <Icon name="check" size={14} />}
          </button>
        </div>
      )}
    </div>
  )
}

export function AdsRail() {
  const { user, place, adScope, setAdScope } = useApp()
  const { pathname } = useLocation()
  const [ads, setAds] = useState([])
  const [active, setActive] = useState(0)
  const [showForm, setShowForm] = useState(false)

  // Follows the city being looked at (My City map) and the Local/Universal switch.
  useEffect(() => {
    api.listAds(adScope === 'universal' ? { scope: 'universal' } : { city: place, scope: 'local' })
      .then((a) => { setAds(a); setActive(0) })
      .catch(() => setAds(FALLBACK_ADS))
  }, [place, adScope])
  useEffect(() => {
    if (ads.length < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % ads.length), 5000)
    return () => clearInterval(t)
  }, [ads.length])

  const navigate = useNavigate()
  // No ads over private conversations or the admin table.
  const hidden = pathname.startsWith('/chats') || pathname.startsWith('/admin')

  // The bar is part of the layout, so the page needs to know to make room.
  useEffect(() => {
    if (hidden) return
    document.body.classList.add('has-ads-rail')
    return () => document.body.classList.remove('has-ads-rail')
  }, [hidden])

  if (hidden) return null

  return (
    <aside className="ads-rail" aria-label="Ads">
      <div className="ads-rail-head">
        <div className="ads-rail-label"><Icon name="tag" size={12} /> Ads</div>
        <ScopeMenu />
      </div>
      <div className="ads-rail-where">
        <Icon name={adScope === 'universal' ? 'globe' : 'map-pin'} size={12} /> {adScope === 'universal' ? 'Universal' : place}
      </div>
      <div className="ads-stack" key={`${adScope}-${place}`}>
        {ads.length === 0 && (
          <div className="card ad-card empty">
            <Icon name="tag" size={18} />
            <span className="meta-dim">No local ads in {place} yet.</span>
            <button className="link-btn" onClick={() => setAdScope('universal')}>See universal ads</button>
          </div>
        )}
        {ads.map((ad, i) => (
          // Every ad shows in full so the rail is filled, not half
          // empty; the rotating one is lifted slightly to draw the eye.
          <Link key={ad.id} to={ad.id.startsWith('fallback') ? '/city' : `/business/${ad.id}`} className={`card ad-card card-link ${i === active ? 'enlarged' : ''}`} style={{ '--accent': ad.accent }}>
            <AdMark ad={ad} />
            <strong>{ad.businessName}</strong>
            <span className="meta-dim">{ad.tagline}</span>
            <span className="btn primary small ad-cta">{ad.ctaLabel}</span>
          </Link>
        ))}
      </div>
      <div className="ads-rail-foot">
        <span className="meta-dim">Your business here</span>
        <button className="btn brand-outline small ads-rail-cta" onClick={() => (user ? setShowForm(true) : navigate('/auth'))}>
          <Icon name="plus" size={13} /> Post advert
        </button>
      </div>
      {showForm && <AdvertiseForm onClose={() => setShowForm(false)} onCreated={(ad) => setAds((a) => [ad, ...a])} />}
    </aside>
  )
}

// Ads inside the page itself — in My City on Home, where
// "Find your people" used to be. Phones have no room for the rail, so this
// is how they see ads too. The highlighted one rotates like the rail.
export function HomeAds({ max = 4 }) {
  const { user, place, adScope } = useApp()
  const navigate = useNavigate()
  const [ads, setAds] = useState(FALLBACK_ADS)
  const [i, setI] = useState(0)
  const [showForm, setShowForm] = useState(false)
  useEffect(() => {
    api.listAds(adScope === 'universal' ? { scope: 'universal' } : { city: place, scope: 'local' })
      .then(setAds).catch(() => {})
  }, [place, adScope])
  const shown = ads.slice(0, max)
  useEffect(() => {
    if (shown.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % shown.length), 5000)
    return () => clearInterval(t)
  }, [shown.length])
  return (
    <div className="partners-panel" aria-label="Ads">
      <div className="hx-label"><Icon name="tag" size={12} /> Ads <em>{adScope === 'universal' ? 'Universal' : `Local · ${place}`}</em><ScopeMenu /></div>
      <div className="partners-list">
        {shown.map((ad, n) => (
          <Link key={ad.id} to={ad.id.startsWith('fallback') ? '/city' : `/business/${ad.id}`} className={`phone-ad ${n === i % shown.length ? 'on' : ''}`} style={{ '--accent': ad.accent }}>
            <AdMark ad={ad} />
            <div className="phone-ad-text">
              <strong>{ad.businessName}</strong>
              <span>{ad.tagline}</span>
            </div>
          </Link>
        ))}
      </div>
      <button type="button" className="btn brand-outline small" onClick={() => (user ? setShowForm(true) : navigate('/auth'))}>
        <Icon name="plus" size={13} /> Post advert
      </button>
      {showForm && <AdvertiseForm onClose={() => setShowForm(false)} onCreated={(ad) => setAds((a) => [ad, ...a])} />}
    </div>
  )
}

// Ads in search. When someone searches, one ad sits under the real
// matches: an ad whose name or tagline matches the search if there is
// one, otherwise one of the paying advertisers in turn. It is always
// labelled.
let adsCache = null
export function useAds() {
  const [ads, setAds] = useState(adsCache || FALLBACK_ADS)
  useEffect(() => {
    if (adsCache) return
    api.listAds().then((a) => { adsCache = a.length ? a : FALLBACK_ADS; setAds(adsCache) }).catch(() => {})
  }, [])
  return ads
}

export function pickSearchAd(ads, term) {
  if (!ads.length || term.length < 2) return null
  const words = term.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
  const hit = ads.find((a) => words.some((w) => `${a.businessName} ${a.tagline}`.toLowerCase().includes(w)))
  if (hit) return hit
  const n = [...term].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)
  return ads[n % ads.length]
}

export function SearchAd({ ad }) {
  return (
    <div className="search-ad" style={{ '--accent': ad.accent }}>
      <AdMark ad={ad} />
      <div className="search-ad-text">
        <strong>{ad.businessName}</strong>
        <span>{ad.tagline}</span>
      </div>
      <span className="search-ad-tag">Ad</span>
    </div>
  )
}
