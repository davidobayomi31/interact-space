// My City's map: a real, zoomable map in place of the flat Nigeria
// outline. It opens on a globe and flies in to Nigeria; tapping a city pin
// (or picking a city on the page) flies there and switches the page.
// The base is OpenFreeMap's dark vector map (free, no key), recoloured to
// deep indigo-black: indigo land, near-black water, lit violet roads, bright borders,
// and street names only once you're close.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CITIES } from './NigeriaMap.jsx'

const STYLE = 'https://tiles.openfreemap.org/styles/dark'
// Colours laid over the dark style, by layer id.
const PAINT = {
  background: { 'background-color': '#15152A' },
  water: { 'fill-color': '#06060D' },
  waterway: { 'line-color': '#10102A' },
  landcover_wood: { 'fill-color': '#16213A' },
  landuse_park: { 'fill-color': '#16213A' },
  landuse_residential: { 'fill-color': '#1A1A33' },
  building: { 'fill-color': '#232345', 'fill-outline-color': '#2E2E58' },
  highway_minor: { 'line-color': '#34346A' },
  highway_major_inner: { 'line-color': '#46468C' },
  highway_major_casing: { 'line-color': '#2B2B5A' },
  highway_major_subtle: { 'line-color': '#3C3C7A' },
  highway_motorway_inner: { 'line-color': '#7B6CF0' },
  highway_motorway_casing: { 'line-color': '#35356E' },
  highway_motorway_subtle: { 'line-color': '#40407E' },
  boundary_state: { 'line-color': '#2C2C58' },
  'boundary_country_z0-4': { 'line-color': '#A596FF' },
  'boundary_country_z5-': { 'line-color': '#A596FF' },
}
const LABEL = { 'text-color': '#B4B0DA', 'text-halo-color': 'rgba(8, 8, 16, 0.92)' }
// Nigeria's bounds; the bottom padding keeps cities clear of the city card.
const BOUNDS = [[2.6, 4.2], [14.7, 13.9]]
const PAD = { top: 70, left: 40, right: 40, bottom: 130 }
const CITY_ZOOM = 10.5
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function pin(city, count, onPick) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `cm-pin${city.live ? ' live' : ''}`
  el.setAttribute('aria-label', `${city.name}${count ? `, ${count} things on` : ''}`)
  // A glass pill (photo, name, count) with a small tail down to the spot.
  el.innerHTML = `
    <span class="cm-pin-pill">
      <span class="cm-pin-face">${city.photo ? `<img src="${city.photo}" alt="" />` : '<i></i>'}</span>
      <b></b>${count ? `<em>${count}</em>` : ''}
    </span>
    <span class="cm-pin-dot"></span>`
  el.querySelector('b').textContent = city.name
  el.addEventListener('click', (e) => { e.stopPropagation(); onPick(city.name) })
  return el
}

export function CityMap({ value, onPick, counts = {} }) {
  const box = useRef(null)
  const map = useRef(null)
  const pins = useRef({})
  const pick = useRef(onPick)
  pick.current = onPick
  const current = CITIES.find((c) => c.name.toLowerCase() === (value || '').toLowerCase())

  // Build the map once.
  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current, style: STYLE, center: [8.2, 9.1], zoom: 2.6,
      attributionControl: false,
      dragRotate: false, pitchWithRotate: false, maxPitch: 0,
    })
    map.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    // On a computer, a trackpad pinch zooms the map but a plain two-finger
    // scroll still scrolls the page. Browsers send a pinch as a wheel event
    // with ctrlKey set, so plain wheel events are stopped before they reach
    // the map (the page scrolls as usual). Safari sends pinches as its own
    // gesture events instead, handled below.
    const wrap = box.current.parentElement
    const wheel = (e) => { if (!e.ctrlKey) e.stopPropagation() }
    wrap.addEventListener('wheel', wheel, { capture: true })
    let startZoom = 0
    const gStart = (e) => { e.preventDefault(); startZoom = m.getZoom() }
    const gChange = (e) => {
      e.preventDefault()
      const r = box.current.getBoundingClientRect()
      m.zoomTo(startZoom + Math.log2(e.scale), { duration: 0, around: m.unproject([e.clientX - r.left, e.clientY - r.top]) })
    }
    wrap.addEventListener('gesturestart', gStart)
    wrap.addEventListener('gesturechange', gChange)
    // Far out, pins crowd together; on phones the CSS then drops their names.
    const far = () => box.current?.parentElement.classList.toggle('cm-far', m.getZoom() < 6.5)
    m.on('zoom', far); far()
    // MapLibre opens the compact attribution on load; keep it folded to its (i).
    const fold = () => box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    fold(); m.once('load', fold); m.once('idle', fold)
    m.on('style.load', () => {
      m.setProjection({ type: 'globe' })
      m.setSky?.({ 'atmosphere-blend': 0 })
      const style = m.getStyle()
      Object.entries(PAINT).forEach(([id, paint]) => {
        if (m.getLayer(id)) Object.entries(paint).forEach(([k, v]) => m.setPaintProperty(id, k, v))
      })
      style.layers.filter((l) => l.type === 'symbol' && l.paint?.['text-color']).forEach((l) =>
        Object.entries(LABEL).forEach(([k, v]) => m.setPaintProperty(l.id, k, v)))
      const target = CITIES.find((c) => c.name.toLowerCase() === (value || '').toLowerCase())
      // Street and area names only once you're close; the pins name the cities.
      style.layers.filter((l) => l.type === 'symbol').forEach((l) => m.setLayerZoomRange(l.id, Math.max(l.minzoom ?? 0, 7.5), l.maxzoom ?? 24))
      if (target && !target.live) m.flyTo({ center: [target.lon, target.lat], zoom: CITY_ZOOM, duration: reduced() ? 0 : 1800, essential: true })
      else m.fitBounds(BOUNDS, { padding: PAD, duration: reduced() ? 0 : 1600, essential: true })
    })
    return () => {
      wrap.removeEventListener('wheel', wheel, { capture: true })
      wrap.removeEventListener('gesturestart', gStart)
      wrap.removeEventListener('gesturechange', gChange)
      m.remove(); map.current = null; pins.current = {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pins, rebuilt when the counts change.
  useEffect(() => {
    const m = map.current
    if (!m) return
    Object.values(pins.current).forEach((p) => p.remove())
    pins.current = Object.fromEntries(CITIES.map((c) => [c.id,
      new maplibregl.Marker({ element: pin(c, counts[c.name], (n) => pick.current?.(n)), anchor: 'bottom', offset: [0, 4] }).setLngLat([c.lon, c.lat]).addTo(m)]))
  }, [JSON.stringify(counts)]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight the city being looked at…
  useEffect(() => {
    Object.entries(pins.current).forEach(([id, p]) => p.getElement().classList.toggle('on', id === current?.id))
  }, [current?.id, JSON.stringify(counts)]) // eslint-disable-line react-hooks/exhaustive-deps

  // …and fly to it when it changes (not on the first render: the map
  // opens on all of Nigeria).
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const m = map.current
    if (!m || !current) return
    const to = { center: [current.lon, current.lat], zoom: CITY_ZOOM }
    if (reduced()) m.jumpTo(to)
    else m.flyTo({ ...to, duration: 1800, essential: true })
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const zoomOut = () => map.current?.fitBounds(BOUNDS, { padding: PAD, duration: reduced() ? 0 : 1400 })

  return (
    <div className="cm">
      <div ref={box} className="cm-canvas" role="region" aria-label="Map of Nigeria with the cities on VOIDAJ" />
      <button type="button" className="cm-all" onClick={zoomOut}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>All of Nigeria</button>
    </div>
  )
}
