// ── Business on VOIDAJ: shared pieces ────────────────────────────────
// Cards and helpers used by Explore Businesses, a business's page, My City
// and Home. Laid out after Nuel's "Business on VOIDAJ" mockup (Nov 8).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icons.jsx'
import * as api from '../api.js'

export const naira = (n) => (n == null ? '' : `₦${Number(n).toLocaleString('en-NG')}`)

export const LISTING_KIND = {
  property: { label: 'Property', plural: 'Properties', icon: 'home' },
  service: { label: 'Service', plural: 'Services', icon: 'layers' },
  product: { label: 'Product', plural: 'Products', icon: 'tag' },
  offer: { label: 'Offer', plural: 'Offers', icon: 'ticket' },
}
export const LISTING_STATUS = {
  '': '', 'for-sale': 'For Sale', 'for-rent': 'For Rent', available: 'Available', sold: 'Sold',
}

// Categories, listing kinds and the Promote Post choices, from the server
// (fetched once and kept for the visit).
let metaCache = null
export function useBusinessMeta() {
  const [meta, setMeta] = useState(metaCache)
  useEffect(() => {
    if (metaCache) return
    api.businessMeta().then((m) => { metaCache = m; setMeta(m) }).catch(() => {})
  }, [])
  return meta
}

export function BusinessLogo({ business, size = 56 }) {
  const initials = business.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span className="biz-logo-img" style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}>
      {business.logo ? <img src={business.logo} alt="" /> : initials}
    </span>
  )
}

export const Verified = ({ on, size = 15 }) => (on ? <Icon name="badge-check" size={size} className="biz-verified" /> : null)

export function BusinessCard({ business }) {
  const shown = business.preview?.find((l) => l.image)?.image || business.cover
  return (
    <Link to={`/business/${business.id}`} className="card card-link biz-card">
      <span className="biz-card-cover">
        {shown ? <img src={shown} alt="" loading="lazy" /> : <Icon name="store" size={30} />}
        {business.promoted && <span className="biz-promoted">Promoted</span>}
      </span>
      <span className="biz-card-body">
        <BusinessLogo business={business} size={44} />
        <span className="biz-card-text">
          <b>{business.name} <Verified on={business.verified} size={14} /></b>
          <em>{business.categoryLabel}{business.city ? ` · ${business.city}` : ''}</em>
          <span className="biz-card-meta">
            {business.rating?.count ? `${business.rating.avg}/5` : 'New on VOIDAJ'}
            {' · '}{business.listingsCount} {business.listingsCount === 1 ? 'listing' : 'listings'}
          </span>
        </span>
      </span>
    </Link>
  )
}

export function ListingCard({ listing, business, onOpen, to }) {
  const body = (
    <>
      <span className="lst-photo">
        {listing.image ? <img src={listing.image} alt="" loading="lazy" /> : <Icon name={LISTING_KIND[listing.kind]?.icon || 'tag'} size={28} />}
        {listing.promoted && <span className="biz-promoted">Promoted</span>}
      </span>
      <span className="lst-text">
        {business && <span className="lst-biz">{business.name} <Verified on={business.verified} size={12} /></span>}
        <b>{listing.title}</b>
        {listing.price != null && <span className="lst-price">{naira(listing.price)}</span>}
        {listing.area && <span className="lst-area"><Icon name="map-pin" size={12} /> {listing.area}</span>}
      </span>
    </>
  )
  if (to) return <Link to={to} className="card card-link lst-card">{body}</Link>
  return <button type="button" className="card card-link lst-card" onClick={onOpen}>{body}</button>
}

// Listings businesses are promoting, for Home and My City.
export function PromotedListings({ city, title = 'Promoted near you' }) {
  const [list, setList] = useState(null)
  useEffect(() => { api.promotedListings(city).then(setList).catch(() => setList([])) }, [city])
  if (!list?.length) return null
  return (
    <section className="section promoted-row">
      <div className="row-head">
        <h2>{title}</h2>
      </div>
      <div className="lst-strip">
        {list.map((l) => <ListingCard key={l.id} listing={l} business={l.business} to={`/business/${l.business.id}?listing=${l.id}`} />)}
      </div>
    </section>
  )
}
