// Promote Post — screens 5 and 6 of Nuel's "Business on VOIDAJ" mockup:
// the listing, a goal, an audience, how long, a budget, and an estimate
// of how many people it reaches; then "Promotion Live!" with its numbers.
// Payments aren't live yet, so during the beta a promotion is free and
// the page says so before you confirm.
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { naira, useBusinessMeta } from '../components/BusinessBits.jsx'

// Same estimate as the server's (server/business.js estimateReach).
function estimateReach({ budget, days, audience }) {
  const spread = { city: 0.8, nearby: 1, nigeria: 1.6 }[audience] ?? 1
  const round = (n) => Math.max(500, Math.round(n / 500) * 500)
  const low = round((budget * 0.5 + days * 100) * spread)
  return { low, high: round(low * 3.1) }
}
const num = (n) => Number(n).toLocaleString('en-NG')

export default function Promote() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user, loading } = useApp()
  const meta = useBusinessMeta()
  const [biz, setBiz] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ listingId: params.get('listing') || '', goal: 'enquiries', audience: 'nearby', days: 7, budget: 15000 })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    api.getBusiness(id).then((b) => {
      setBiz(b)
      setForm((f) => ({ ...f, listingId: f.listingId || b.listings.find((l) => !l.promoted)?.id || '' }))
    }).catch((e) => setError(e.message))
  }, [id])

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  if (error && !biz) return <div className="page"><div className="card feed-empty"><strong>{error}</strong><Link to="/businesses">Explore businesses</Link></div></div>
  if (!biz || !meta) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!biz.isOwner) return <Navigate to={`/business/${id}`} replace />

  const listing = biz.listings.find((l) => l.id === form.listingId)
  const reach = estimateReach(form)
  const audienceLabel = (a) => (a.id === 'nearby' ? `${biz.city} and nearby areas` : a.id === 'city' ? biz.city : a.label)

  if (done) {
    return (
      <div className="page promo-page">
        <section className="card promo-live">
          <span className="promo-live-icon"><Icon name="megaphone" size={40} /><Icon name="check" size={18} className="promo-live-tick" /></span>
          <h1>Promotion Live!</h1>
          <p className="meta-dim">Your post is now being promoted across VOIDAJ.</p>
          {done.listing && (
            <div className="promo-listing">
              {done.listing.image && <img src={done.listing.image} alt="" />}
              <div><b>{done.listing.title}</b><span>{[naira(done.listing.price), done.listing.area].filter(Boolean).join(' · ')}</span><span className="biz-promoted inline">Promoted</span></div>
            </div>
          )}
          <div className="promo-numbers">
            <div><Icon name="eye" size={20} /><b>{num(done.views)}</b><span>Views</span></div>
            <div><Icon name="message-circle" size={20} /><b>{num(done.enquiries)}</b><span>Enquiries</span></div>
            <div><Icon name="clock" size={20} /><b>{done.days}</b><span>Days</span></div>
          </div>
          <p className="meta-dim">Estimated reach {num(done.reach.low)}–{num(done.reach.high)} people. Numbers fill in as people see and enquire.</p>
          <Link to={`/business/${biz.id}`} className="btn primary large full"><Icon name="trending-up" size={16} /> View performance</Link>
        </section>
      </div>
    )
  }

  const submit = async () => {
    setBusy(true); setError('')
    try { setDone(await api.promoteListing(biz.id, form)) } catch (e) { setError(e.message); setBusy(false) }
  }
  const Chips = ({ k, options, label }) => (
    <div className="promo-chips">
      {options.map((o) => <button key={o} type="button" className={form[k] === o ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, [k]: o }))}>{label(o)}</button>)}
    </div>
  )

  return (
    <div className="page promo-page">
      <header className="page-head">
        <Link to={`/business/${biz.id}`} className="back-link"><Icon name="chevron-left" size={16} /> {biz.name}</Link>
        <h1>Promote Post</h1>
      </header>

      <section className="card promo-form">
        {biz.listings.length === 0 ? (
          <div className="feed-empty"><strong>Post something first</strong><span className="meta-dim">Add a listing to your business, then promote it.</span><Link to={`/business/${biz.id}`} className="btn primary small">Back to your business</Link></div>
        ) : (
          <>
            <label className="field"><span>Listing</span>
              <select className="job-select" value={form.listingId} onChange={(e) => setForm((f) => ({ ...f, listingId: e.target.value }))}>
                {biz.listings.map((l) => <option key={l.id} value={l.id} disabled={l.promoted}>{l.title}{l.promoted ? ' (being promoted)' : ''}</option>)}
              </select>
            </label>
            {listing && (
              <div className="promo-listing">
                {listing.image && <img src={listing.image} alt="" />}
                <div><b>{listing.title}</b><span>{[naira(listing.price), listing.area].filter(Boolean).join(' · ')}</span></div>
              </div>
            )}

            <label className="field"><span><Icon name="trending-up" size={14} /> Promotion goal</span>
              <select className="job-select" value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}>
                {meta.promotion.goals.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </label>
            <label className="field"><span><Icon name="users" size={14} /> Audience</span>
              <select className="job-select" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
                {meta.promotion.audiences.map((a) => <option key={a.id} value={a.id}>{audienceLabel(a)}</option>)}
              </select>
            </label>
            <div className="field"><span><Icon name="calendar" size={14} /> Duration</span><Chips k="days" options={meta.promotion.days} label={(d) => `${d} Days`} /></div>
            <div className="field"><span><Icon name="wallet" size={14} /> Budget (NGN)</span><Chips k="budget" options={meta.promotion.budgets} label={(b) => naira(b)} /></div>

            <div className="promo-reach">
              <Icon name="trending-up" size={22} />
              <div><span>Estimated reach</span><b>{num(reach.low)} – {num(reach.high)} people</b></div>
            </div>
            <p className="promo-beta"><Icon name="info" size={14} /> Payments aren’t live yet, so promotions are free while VOIDAJ is in beta. You won’t be charged {naira(form.budget)}.</p>
            {error && <div className="auth-error"><Icon name="info" size={14} /> {error}</div>}
            <button className="btn primary large full" onClick={submit} disabled={busy || !listing || listing.promoted}>{busy ? 'Starting…' : <>Continue <Icon name="arrow" size={16} /></>}</button>
          </>
        )}
      </section>
    </div>
  )
}
