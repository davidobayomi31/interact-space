// A geographical map of Nigeria (in place of the old world globe): the
// country's outline, the Niger and Benue rivers, and the cities on the
// network. Lagos is live; tapping another city says so honestly and
// invites someone to start the first community there.
// The outline is a simplified trace of the real border (lon/lat), drawn
// with a plain equirectangular projection — fine at a country's scale.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icons.jsx'

const BORDER = [
  [2.70, 6.37], [2.72, 7.05], [2.75, 7.90], [2.70, 8.50], [3.10, 9.10], [3.60, 10.30], [3.57, 11.33], [3.61, 11.70],
  [4.10, 13.48], [4.90, 13.75], [5.50, 13.88], [6.40, 13.60], [7.30, 13.10], [7.80, 13.34], [9.00, 12.82], [9.60, 12.80],
  [10.15, 13.27], [10.70, 13.25], [11.50, 13.33], [12.30, 13.08], [13.08, 13.60], [13.63, 13.71], [14.08, 13.08],
  [14.20, 12.40], [14.65, 12.20], [14.50, 11.60], [13.90, 11.00], [13.60, 10.25], [13.25, 9.95], [12.80, 8.75],
  [12.25, 8.40], [11.85, 7.10], [11.55, 6.55], [11.10, 6.45], [10.60, 7.05], [10.15, 6.88], [9.70, 6.50], [9.20, 6.45],
  [8.80, 5.60], [8.50, 4.77], [8.00, 4.55], [7.10, 4.40], [6.60, 4.30], [6.00, 4.27], [5.45, 4.95], [5.00, 5.75],
  [4.50, 6.30], [3.40, 6.40],
]
const NIGER = [[3.61, 11.70], [4.40, 10.60], [5.10, 9.10], [6.00, 8.60], [6.74, 7.80], [6.75, 6.10], [6.40, 5.20], [6.10, 4.60]]
const BENUE = [[13.30, 9.30], [12.40, 9.25], [10.60, 8.10], [8.53, 7.73], [6.74, 7.80]]

// photo: public/images/city — free Unsplash photos taken in each city
// (Kaduna's is the Eid durbar in Zaria, Kaduna State). Port Harcourt has
// no suitable one yet.
export const CITIES = [
  { id: 'lagos', name: 'Lagos', lon: 3.38, lat: 6.52, live: true, photo: '/images/city/lagos.jpg' },
  { id: 'ibadan', name: 'Ibadan', lon: 3.90, lat: 7.38, photo: '/images/city/ibadan.jpg' },
  { id: 'abuja', name: 'Abuja', lon: 7.49, lat: 9.06, photo: '/images/city/abuja.jpg' },
  { id: 'kano', name: 'Kano', lon: 8.52, lat: 12.00, photo: '/images/city/kano.jpg' },
  { id: 'kaduna', name: 'Kaduna', lon: 7.44, lat: 10.52, photo: '/images/city/kaduna.jpg' },
  { id: 'enugu', name: 'Enugu', lon: 7.50, lat: 6.45, photo: '/images/city/enugu.jpg' },
  { id: 'benin', name: 'Benin City', lon: 5.62, lat: 6.34, photo: '/images/city/benin-city.jpg' },
  { id: 'ph', name: 'Port Harcourt', lon: 7.01, lat: 4.82 },
]

const K = 30, W0 = 2.3, N0 = 14.2
const px = ([lon, lat]) => [(lon - W0) * K, (N0 - lat) * K]
const path = (pts, close) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p).map((n) => n.toFixed(1)).join(' ')}`).join(' ') + (close ? ' Z' : '')

// Controlled when `value` (a city name) and `onPick` are given: My City
// passes the city being looked at, so tapping a pin switches the page.
export function NigeriaMap({ liveCount = 0, startTo = '/auth', value, onPick, counts = {}, caption = true }) {
  const [own, setOwn] = useState('lagos')
  const picked = value ? (CITIES.find((c) => c.name.toLowerCase() === value.toLowerCase())?.id ?? own) : own
  const setPicked = (id) => { setOwn(id); onPick?.(CITIES.find((c) => c.id === id).name) }
  const city = CITIES.find((c) => c.id === picked)
  return (
    <div className="ng-map">
      <svg viewBox="0 0 384 310" role="img" aria-label="Map of Nigeria showing cities on VOIDAJ">
        <path className="ng-land" d={path(BORDER, true)} />
        <path className="ng-river" d={path(NIGER)} />
        <path className="ng-river" d={path(BENUE)} />
        {CITIES.map((c) => {
          const [x, y] = px([c.lon, c.lat])
          return (
            <g key={c.id} className={`ng-city ${c.live ? 'live' : ''} ${picked === c.id ? 'on' : ''}`}
              transform={`translate(${x} ${y})`} tabIndex={0} role="button" aria-label={c.name}
              onClick={() => setPicked(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked(c.id) } }}>
              {(c.live || picked === c.id) && <circle className="ng-pulse" r="11" />}
              <circle className="ng-dot" r={c.live || picked === c.id ? 6 : 4} />
              {counts[c.name] > 0 && <text className="ng-count" x="0" y="-10" textAnchor="middle">{counts[c.name]}</text>}
              <text x={c.id === 'lagos' || c.id === 'ibadan' ? -9 : 9} y="4" textAnchor={c.id === 'lagos' || c.id === 'ibadan' ? 'end' : 'start'}>{c.name}</text>
            </g>
          )
        })}
      </svg>
      {caption && <div className="ng-caption" aria-live="polite">
        {city.live ? (
          <p className="meta-dim"><strong><Icon name="map-pin" size={12} /> {city.name} is live</strong> — {liveCount} local communities and counting. Tap another city to look around.</p>
        ) : (
          <p className="meta-dim"><strong>{city.name}</strong> has no communities yet. <Link to={startTo}>Start the first one</Link>.</p>
        )}
      </div>}
    </div>
  )
}
