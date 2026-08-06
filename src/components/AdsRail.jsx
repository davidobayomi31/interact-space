// Ads rail — a stationary panel pinned to the far right of the screen.
// One ad is enlarged at a time for 5s, then minimizes as the next ad
// takes its turn, looping continuously. Businesses pay to post; payment
// is simulated (no real processor wired up in this prototype).
import { useEffect, useState } from 'react'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'

const ACCENTS = ['#D8A63A', '#4A90E8', '#27AE60', '#9B59B6', '#E8734A', '#4AE8D4']
const EMOJIS = ['✨', '🛍️', '🍜', '🎨', '🔧', '📸', '🌿', '🚀']

// Shown when the API is unreachable (e.g. a static-only deploy with no
// backend) or hasn't been seeded yet, so the rail is never empty in a demo.
const FALLBACK_ADS = [
  { id: 'fallback-1', businessName: 'Kola Foods', tagline: 'Snacks made from grandma’s recipes', ctaLabel: 'Order now', accent: '#E8734A', emoji: '🥟' },
  { id: 'fallback-2', businessName: 'Adire by Funke', tagline: 'Modern cuts, hand-dyed textiles', ctaLabel: 'Shop the drop', accent: '#E84A8A', emoji: '🧵' },
  { id: 'fallback-3', businessName: 'SunHome Solar', tagline: 'Off the generator in 3 weeks', ctaLabel: 'Get a quote', accent: '#F2C94C', emoji: '☀️' },
  { id: 'fallback-4', businessName: 'Folake Bakes', tagline: 'Small-chops for every occasion', ctaLabel: 'See menu', accent: '#E8A24A', emoji: '🧁' },
  { id: 'fallback-5', businessName: 'Naija Devs Bootcamp', tagline: 'Learn to code, get mentored, get hired', ctaLabel: 'Enroll now', accent: '#4AE8D4', emoji: '💻' },
  { id: 'fallback-6', businessName: 'Green Lagos Nursery', tagline: 'Seedlings and soil for your balcony farm', ctaLabel: 'Visit us', accent: '#27AE60', emoji: '🌱' },
]

function AdvertiseForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ businessName: '', tagline: '', ctaLabel: 'Learn more', accent: ACCENTS[0], emoji: EMOJIS[0] })
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
              <select className="job-select" value={form.emoji} onChange={set('emoji')}>
                {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
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
              <span className="ad-emoji">{ad.emoji}</span>
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

export function AdsRail() {
  const { user } = useApp()
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

  return (
    <aside className="ads-rail" aria-label="Sponsored">
      <div className="ads-rail-label"><Icon name="tag" size={12} /> Sponsored</div>
      <div className="ads-stack">
        {ads.length === 0 && (
          <div className="card ad-card empty">
            <Icon name="tag" size={18} />
            <span className="meta-dim">Your business could be here.</span>
          </div>
        )}
        {ads.map((ad, i) => (
          <div key={ad.id} className={`card ad-card ${i === active ? 'enlarged' : 'minimized'}`} style={{ '--accent': ad.accent }}>
            <span className="ad-emoji">{ad.emoji}</span>
            <strong>{ad.businessName}</strong>
            {i === active && <>
              <span className="meta-dim">{ad.tagline}</span>
              <span className="btn primary small ad-cta">{ad.ctaLabel}</span>
            </>}
          </div>
        ))}
      </div>
      {user && <button className="btn gold-outline small ads-rail-cta" onClick={() => setShowForm(true)}><Icon name="plus" size={13} /> Advertise here</button>}
      {showForm && <AdvertiseForm onClose={() => setShowForm(false)} onCreated={(ad) => setAds((a) => [ad, ...a])} />}
    </aside>
  )
}
