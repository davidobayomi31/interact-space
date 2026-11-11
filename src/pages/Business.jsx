// A business's page — screen 4 of Nuel's "Business on VOIDAJ" mockup:
// cover, logo, name with its verified tick, category and place, Chat and
// Follow, then Posts · About · Reviews. Posts are the business's listings
// (properties, services, products, offers), filtered by kind.
//
// The owner also sees how the page is doing (views, enquiries,
// followers), can add listings, edit the page and promote a listing.
// /business/ad-… is an older ad link and still opens the ad's preview.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, FavoriteButton } from '../components/bits.jsx'
import { RatingScale } from '../components/Rating.jsx'
import { CoverPicker } from '../components/CoverPicker.jsx'
import { BusinessLogo, ListingCard, LISTING_KIND, LISTING_STATUS, Verified, naira } from '../components/BusinessBits.jsx'
import AdBusiness from './AdBusiness.jsx'

const TABS = ['Posts', 'About', 'Reviews']

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div className="sheet biz-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{title}</strong>
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// One listing, opened: photo, price, details, and Enquire (a chat with
// the owner that carries the listing) or, for the owner, Promote / Delete.
function ListingSheet({ business, listing, onClose, onDeleted }) {
  const { user } = useApp()
  const navigate = useNavigate()
  useEffect(() => { if (!business.isOwner) api.viewListing(business.id, listing.id) }, [business.id, business.isOwner, listing.id])
  const enquire = () => navigate(user ? `/chats?dm=${business.ownerId}&business=${business.id}&listing=${listing.id}` : '/auth')
  const remove = async () => {
    if (!window.confirm(`Delete “${listing.title}”?`)) return
    await api.deleteListing(business.id, listing.id)
    onDeleted(listing.id)
  }
  const status = LISTING_STATUS[listing.status]
  return (
    <Sheet title={LISTING_KIND[listing.kind]?.label || 'Listing'} onClose={onClose}>
      <div className="lst-detail">
        {listing.image && <img className="lst-detail-photo" src={listing.image} alt="" />}
        <div className="lst-detail-tags">
          {status && <span className="lst-status inline">{status}</span>}
          {listing.promoted && <span className="biz-promoted inline">Promoted</span>}
        </div>
        <h2>{listing.title}</h2>
        {listing.price != null && <div className="lst-price big">{naira(listing.price)}</div>}
        {listing.area && <div className="meta-dim"><Icon name="map-pin" size={13} /> {listing.area}</div>}
        {listing.description && <p>{listing.description}</p>}
        {business.isOwner ? (
          <>
            <div className="lst-detail-stats meta-dim"><Icon name="eye" size={13} /> {listing.views} views · <Icon name="message-circle" size={13} /> {listing.enquiries} enquiries</div>
            <div className="biz-actions">
              {listing.promoted
                ? <span className="btn ghost" aria-disabled="true"><Icon name="megaphone" size={15} /> Being promoted</span>
                : <Link to={`/business/${business.id}/promote?listing=${listing.id}`} className="btn primary"><Icon name="megaphone" size={15} /> Promote</Link>}
              <button className="btn danger" onClick={remove}><Icon name="trash" size={15} /> Delete</button>
            </div>
          </>
        ) : (
          <div className="biz-actions">
            <button className="btn primary" onClick={enquire}><Icon name="message-circle" size={15} /> Enquire</button>
            <FavoriteButton label item={{ kind: 'business', id: listing.id, title: listing.title, subtitle: business.name, href: `/business/${business.id}?listing=${listing.id}`, collection: 'businesses' }} />
          </div>
        )}
      </div>
    </Sheet>
  )
}

function AddListing({ business, onClose, onAdded }) {
  const kinds = business.listingKinds?.length ? business.listingKinds : ['product', 'service', 'offer']
  const [form, setForm] = useState({ kind: kinds[0], title: '', price: '', status: kinds[0] === 'property' ? 'for-sale' : '', area: business.area ? `${business.area}, ${business.city}` : business.city, description: '', image: '' })
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { onAdded(await api.addListing(business.id, form)) } catch (err) { setError(err.message); setBusy(false) }
  }
  return (
    <Sheet title="Post & share" onClose={onClose}>
      <form className="biz-form plain" onSubmit={submit}>
        <div className="seg">
          {kinds.map((k) => <button type="button" key={k} className={form.kind === k ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, kind: k, status: k === 'property' ? f.status || 'for-sale' : '' }))}>{LISTING_KIND[k].label}</button>)}
        </div>
        <CoverPicker kind="listing" label="Photo" value={form.image} onChange={(image) => setForm((f) => ({ ...f, image }))} onBusy={setUploading} />
        <label className="field"><span>Title</span><input value={form.title} onChange={set('title')} placeholder={form.kind === 'property' ? '4 Bedroom Duplex' : form.kind === 'offer' ? '20% off this weekend' : 'What you’re offering'} maxLength={100} required autoFocus /></label>
        <div className="settings-row">
          <label className="field"><span>Price in naira (optional)</span><input value={form.price} onChange={set('price')} placeholder="220,000,000" inputMode="numeric" /></label>
          {form.kind === 'property' && (
            <label className="field"><span>Status</span>
              <select className="job-select" value={form.status} onChange={set('status')}>
                <option value="for-sale">For Sale</option><option value="for-rent">For Rent</option><option value="sold">Sold</option>
              </select>
            </label>
          )}
        </div>
        <label className="field"><span>Where (optional)</span><input value={form.area} onChange={set('area')} placeholder="Lekki, Lagos" maxLength={60} /></label>
        <label className="field"><span>Details (optional)</span><textarea rows={3} value={form.description} onChange={set('description')} maxLength={600} /></label>
        {error && <div className="auth-error"><Icon name="info" size={14} /> {error}</div>}
        <button className="btn primary full" disabled={busy || uploading || !form.title.trim()}>{busy ? 'Posting…' : 'Post'}</button>
      </form>
    </Sheet>
  )
}

function Reviews({ business }) {
  const { user } = useApp()
  const [list, setList] = useState(null)
  const [stars, setStars] = useState(0)
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState('')
  const load = () => api.businessReviews(business.id).then((r) => {
    setList(r)
    const mine = r.find((x) => x.mine)
    if (mine) { setStars(mine.stars); setBody(mine.body) }
  }).catch(() => setList([]))
  useEffect(() => { load() }, [business.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e) => {
    e.preventDefault()
    await api.reviewBusiness(business.id, { stars, body })
    setSaved('Thanks — your review is up.')
    load()
  }
  return (
    <section className="card biz-reviews">
      {user && !business.isOwner && (
        <form className="biz-review-form" onSubmit={submit}>
          <b>Your review</b>
          <RatingScale value={stars} onRate={setStars} />
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was it like?" maxLength={600} />
          <div className="settings-actions"><button className="btn primary small" disabled={!stars}>Post review</button>{saved && <span className="meta-dim">{saved}</span>}</div>
        </form>
      )}
      {list === null ? <p className="meta-dim">Loading…</p> : list.length === 0 ? <p className="meta-dim">No reviews yet.</p> : (
        <ul className="biz-review-list">
          {list.map((r) => (
            <li key={r.user.id}>
              <Avatar user={r.user} size={34} />
              <div><b>{r.user.name}</b> <span className="rating-score">{r.stars}/5</span>{r.body && <p>{r.body}</p>}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BusinessPage({ id }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [biz, setBiz] = useState(null)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState('Posts')
  const [kind, setKind] = useState('all')
  const [adding, setAdding] = useState(false)
  const [promos, setPromos] = useState([])

  useEffect(() => {
    setBiz(null); setMissing(false)
    api.getBusiness(id).then(setBiz).catch(() => setMissing(true))
  }, [id])
  useEffect(() => { if (biz?.isOwner) api.businessPromotions(biz.id).then(setPromos).catch(() => {}) }, [biz?.id, biz?.isOwner])

  if (missing) return <div className="page"><div className="card feed-empty"><strong>We couldn’t find that business.</strong><Link to="/businesses">Explore businesses</Link></div></div>
  if (!biz) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>

  const open = biz.listings.find((l) => l.id === params.get('listing'))
  const openListing = (l) => setParams(l ? { listing: l.id } : {}, { replace: !l })
  const kinds = [...new Set([...(biz.listingKinds || []), ...biz.listings.map((l) => l.kind)])]
  const shown = kind === 'all' ? biz.listings : biz.listings.filter((l) => l.kind === kind)
  const follow = async () => {
    if (!user) return navigate('/auth')
    const r = await api.followBusiness(biz.id, !biz.isFollowing)
    setBiz((b) => ({ ...b, isFollowing: r.following, followers: r.followers }))
  }
  const live = promos.filter((p) => p.live)

  return (
    <div className="page biz-page">
      <div className="biz-grid">
        <section className="card biz-hero">
          <div className="biz-cover">{biz.cover ? <img src={biz.cover} alt="" /> : <Icon name="store" size={34} />}</div>
          <div className="biz-logo"><BusinessLogo business={biz} size={88} /></div>
          <h1>{biz.name} <Verified on={biz.verified} size={18} /></h1>
          <p className="meta-dim">{biz.categoryLabel}</p>
          <span className="biz-where"><Icon name="map-pin" size={13} /> {[biz.area, biz.city].filter(Boolean).join(', ')}, Nigeria</span>
          {biz.isOwner ? (
            <div className="biz-actions">
              <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> Add listing</button>
              <Link to={`/business/${biz.id}/edit`} className="btn ghost"><Icon name="edit" size={15} /> Edit</Link>
            </div>
          ) : (
            <div className="biz-actions">
              <Link to={user ? `/chats?dm=${biz.ownerId}&business=${biz.id}` : '/auth'} className="btn ghost"><Icon name="message-circle" size={15} /> Chat</Link>
              <button className={`btn ${biz.isFollowing ? 'ghost' : 'primary'}`} onClick={follow}>
                <Icon name={biz.isFollowing ? 'check' : 'plus'} size={15} /> {biz.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          )}
          <div className="pf2-stats biz-stats">
            <div><b>{biz.listings.length}</b><span>Listings</span></div>
            <div><b>{biz.followers}</b><span>Followers</span></div>
            <div><b>{biz.rating.count ? `${biz.rating.avg}/5` : '—'}</b><span>Reviews</span></div>
          </div>
          {biz.isOwner && biz.stats && (
            <div className="biz-owner-stats">
              <span className="meta-dim">Only you see this</span>
              <div><Icon name="eye" size={15} /> <b>{biz.stats.views}</b> page views</div>
              <div><Icon name="message-circle" size={15} /> <b>{biz.stats.enquiries}</b> enquiries</div>
              {live.length > 0 && <div><Icon name="megaphone" size={15} /> <b>{live.length}</b> live {live.length === 1 ? 'promotion' : 'promotions'}</div>}
            </div>
          )}
        </section>

        <div className="biz-content">
          <div className="seg float-bar">
            {TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
          </div>

          {tab === 'Posts' && (
            <>
              <div className="biz-kinds">
                <button className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}><Icon name="grid" size={18} /><span>All</span></button>
                {kinds.map((k) => (
                  <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}><Icon name={LISTING_KIND[k].icon} size={18} /><span>{LISTING_KIND[k].plural}</span></button>
                ))}
              </div>
              {shown.length === 0 ? (
                <section className="card feed-empty">
                  <Icon name="image" size={28} />
                  <strong>{biz.isOwner ? 'Showcase what you offer' : 'Nothing listed here yet'}</strong>
                  <span className="meta-dim">{biz.isOwner ? 'Post your products, services, properties or offers. People can enquire through Chat.' : 'Follow to hear when they post.'}</span>
                  {biz.isOwner && <button className="btn primary small" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Add listing</button>}
                </section>
              ) : (
                <div className="lst-grid stagger">
                  {shown.map((l) => <ListingCard key={l.id} listing={l} onOpen={() => openListing(l)} />)}
                </div>
              )}
            </>
          )}

          {tab === 'About' && (
            <section className="card biz-about">
              {biz.description && <p>{biz.description}</p>}
              <ul>
                <li><Icon name="tag" size={15} /> {biz.categoryLabel}</li>
                <li><Icon name="map-pin" size={15} /> {[biz.area, biz.city].filter(Boolean).join(', ')}, Nigeria</li>
                {biz.hours && <li><Icon name="clock" size={15} /> {biz.hours}</li>}
                {biz.owner && <li><Icon name="user" size={15} /> Run by <Link to={`/profile/${biz.owner.id}`}>{biz.owner.name}</Link></li>}
                <li><Icon name="badge-check" size={15} /> {biz.verified ? 'Verified business' : 'Not verified yet'}</li>
              </ul>
              <div className="biz-buttons">
                {biz.phone && <a className="btn ghost small" href={`tel:${biz.phone.replace(/\s/g, '')}`}><Icon name="phone" size={14} /> Call</a>}
                {biz.website && <a className="btn ghost small" href={biz.website} target="_blank" rel="noopener noreferrer nofollow"><Icon name="globe" size={14} /> Website</a>}
                <a className="btn ghost small" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([biz.name, biz.area, biz.city, 'Nigeria'].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer"><Icon name="navigation" size={14} /> Directions</a>
              </div>
            </section>
          )}

          {tab === 'Reviews' && <Reviews business={biz} />}

          {biz.isOwner && promos.length > 0 && (
            <section className="card biz-promos">
              <h2>Promotions</h2>
              <ul>
                {promos.map((p) => (
                  <li key={p.id}>
                    <b>{p.listing?.title || 'Listing'}</b>
                    <span className="meta-dim">{p.live ? `Live until ${new Date(p.endsAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : 'Ended'} · {p.views} views · {p.enquiries} enquiries</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {open && <ListingSheet business={biz} listing={open} onClose={() => openListing(null)} onDeleted={(lid) => { setBiz((b) => ({ ...b, listings: b.listings.filter((l) => l.id !== lid) })); openListing(null) }} />}
      {adding && <AddListing business={biz} onClose={() => setAdding(false)} onAdded={(l) => { setBiz((b) => ({ ...b, listings: [l, ...b.listings] })); setAdding(false) }} />}
    </div>
  )
}

export default function Business() {
  const { id } = useParams()
  return id.startsWith('ad-') ? <AdBusiness /> : <BusinessPage id={id} />
}
