// Ads rail — its own bar down the right side of the screen, top to bottom,
// with "Advertise here" at its foot. The page makes room for it rather
// than sliding under it.
// One ad is enlarged at a time for 5s, then minimizes as the next ad
// takes its turn, looping continuously. Businesses pay to post; payment
// is simulated (no real processor wired up in this prototype).
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

const ACCENTS = ['#C0342A', '#1F5FA8', '#1B7F3B', '#6B3FA0', '#B45309', '#0F6E6E']

// Advertisers give us a name, not a logo file, so the rail draws a
// monogram from the name in their own accent colour.
function AdMark({ ad }) {
  const initials = ad.businessName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return <span className="ad-mark" style={{ background: ad.accent }} aria-hidden="true">{initials}</span>
}

// Shown when the API is unreachable (e.g. a static-only deploy with no
// backend) or hasn't been seeded yet, so the rail is never empty in a demo.
const FALLBACK_ADS = [
  { id: 'fallback-1', businessName: 'Kola Foods', tagline: 'Snacks made from grandma’s recipes', ctaLabel: 'Order now', accent: '#B4472A' },
  { id: 'fallback-2', businessName: 'Adire by Funke', tagline: 'Modern cuts, hand-dyed textiles', ctaLabel: 'Shop the drop', accent: '#A8306A' },
  { id: 'fallback-3', businessName: 'SunHome Solar', tagline: 'Off the generator in 3 weeks', ctaLabel: 'Get a quote', accent: '#7A5A0F' },
  { id: 'fallback-4', businessName: 'Folake Bakes', tagline: 'Small-chops for every occasion', ctaLabel: 'See menu', accent: '#8F5513' },
  { id: 'fallback-5', businessName: 'Naija Devs Bootcamp', tagline: 'Learn to code, get mentored, get hired', ctaLabel: 'Enroll now', accent: '#0F6E6E' },
  { id: 'fallback-6', businessName: 'Green Lagos Nursery', tagline: 'Seedlings and soil for your balcony farm', ctaLabel: 'Visit us', accent: '#1B7F3B' },
]

function AdvertiseForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ businessName: '', tagline: '', ctaLabel: 'Learn more', accent: ACCENTS[0] })
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
        <div className="side-card-head"><Icon name="tag" size={16} /> Advertise your business</div>
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
              <button className="btn primary small" onClick={pay} disabled={busy}>{busy ? 'Processing…' : 'Pay ₦8,000 & post'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Ads shouldn't be the first thing a visitor meets. On the landing page the
// rail stays hidden until the visitor has actually scrolled AND Trending in
// Lagos has risen into the upper part of the screen — then it fades in.
// "Visible at all" wasn't enough: once the hero got shorter, the section
// peeked in on load and the rail appeared with the hero still on screen.
// Scrolling back up hides it again. Pages with no anchor show it at once.
const AD_ANCHOR = '#trending-lagos'
const REVEAL_LINE = 0.7   // anchor's top must pass 70% of the viewport height
const MIN_SCROLL = 40     // and the visitor must have scrolled at least this far

function useAnchorReached() {
  const { pathname } = useLocation()
  const [reached, setReached] = useState(false)

  useEffect(() => {
    let anchor = null
    let frame = 0
    const check = () => {
      frame = 0
      if (!anchor) return
      const top = anchor.getBoundingClientRect().top
      setReached(window.scrollY > MIN_SCROLL && top < window.innerHeight * REVEAL_LINE)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check) }

    // The route's own markup mounts alongside this effect, so look for the
    // anchor on the next frame rather than racing it.
    const boot = requestAnimationFrame(() => {
      anchor = document.querySelector(AD_ANCHOR)
      if (!anchor) { setReached(true); return }
      check()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
    })
    return () => {
      cancelAnimationFrame(boot)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pathname])

  return reached
}

export function AdsRail() {
  const { user } = useApp()
  const { pathname } = useLocation()
  const anchorReached = useAnchorReached()
  // On the landing page the hero hands off from the companion to the globe
  // as you scroll; the rail arrives as that hand-off finishes.
  const [heroDone, setHeroDone] = useState(false)
  useEffect(() => {
    const on = (e) => setHeroDone(e.detail >= 0.85)
    window.addEventListener('voida:hero-progress', on)
    return () => window.removeEventListener('voida:hero-progress', on)
  }, [])
  useEffect(() => { setHeroDone(false) }, [pathname])
  const adsVisible = anchorReached || heroDone
  const [ads, setAds] = useState([])
  const [active, setActive] = useState(0)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    api.listAds()
      .then((a) => setAds(a.length ? a : FALLBACK_ADS))
      .catch(() => setAds(FALLBACK_ADS))
  }, [])
  useEffect(() => {
    if (ads.length < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % ads.length), 5000)
    return () => clearInterval(t)
  }, [ads.length])

  const navigate = useNavigate()
  // No ads over private conversations.
  const hidden = pathname.startsWith('/chats')

  // The bar is part of the layout, so the page needs to know to make room.
  useEffect(() => {
    if (hidden) return
    document.body.classList.add('has-ads-rail')
    return () => document.body.classList.remove('has-ads-rail')
  }, [hidden])

  if (hidden) return null

  // The bar itself is always there; on the landing page the ads inside it
  // wait until the visitor is past the hero.
  return (
    <aside className="ads-rail" aria-label="Sponsored">
      <div className="ads-rail-label"><Icon name="tag" size={12} /> Sponsored</div>
      <div className={`ads-stack ${adsVisible ? 'shown' : ''}`}>
        {ads.length === 0 && (
          <div className="card ad-card empty">
            <Icon name="tag" size={18} />
            <span className="meta-dim">Your business could be here.</span>
          </div>
        )}
        {ads.map((ad, i) => (
          <div key={ad.id} className={`card ad-card ${i === active ? 'enlarged' : 'minimized'}`} style={{ '--accent': ad.accent }}>
            <AdMark ad={ad} />
            <strong>{ad.businessName}</strong>
            {i === active && <>
              <span className="meta-dim">{ad.tagline}</span>
              <span className="btn primary small ad-cta">{ad.ctaLabel}</span>
            </>}
          </div>
        ))}
      </div>
      <div className="ads-rail-foot">
        <span className="meta-dim">Your business here</span>
        <button className="btn brand-outline small ads-rail-cta" onClick={() => (user ? setShowForm(true) : navigate('/auth'))}>
          <Icon name="plus" size={13} /> Advertise here
        </button>
      </div>
      {showForm && <AdvertiseForm onClose={() => setShowForm(false)} onCreated={(ad) => setAds((a) => [ad, ...a])} />}
    </aside>
  )
}

// Phones have no room for the rail, so the landing page shows a single
// sponsored card under the globe instead, cycling through the same ads.
// It is placed inside the hero's caption, which only appears once the
// companion has handed the globe over.
export function PhoneHeroAd() {
  const [ads, setAds] = useState(FALLBACK_ADS)
  const [i, setI] = useState(0)
  useEffect(() => {
    api.listAds().then((a) => { if (a.length) setAds(a) }).catch(() => {})
  }, [])
  useEffect(() => {
    if (ads.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % ads.length), 5000)
    return () => clearInterval(t)
  }, [ads.length])
  const ad = ads[i % ads.length]
  return (
    <div className="phone-ad" key={ad.id} style={{ '--accent': ad.accent }} aria-label="Sponsored">
      <AdMark ad={ad} />
      <div className="phone-ad-text">
        <small>Sponsored</small>
        <strong>{ad.businessName}</strong>
        <span>{ad.tagline}</span>
      </div>
    </div>
  )
}
