// My City's map: a real, zoomable map in place of the flat Nigeria
// outline. It opens on a globe and flies in to Nigeria; tapping a city pin
// (or picking a city on the page) flies there and switches the page.
// Far out it shows NASA's Blue Marble shaded relief (public domain, via
// GIBS); closer in that fades into OpenFreeMap's dark street map (free,
// no key), so a city reads as streets and districts.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CITIES } from './NigeriaMap.jsx'

const STYLE = 'https://tiles.openfreemap.org/styles/dark'
const RELIEF = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
// Nigeria's bounds; the bottom padding keeps cities clear of the city card.
const BOUNDS = [[2.6, 4.2], [14.7, 13.9]]
const PAD = { top: 40, left: 30, right: 30, bottom: 110 }
const CITY_ZOOM = 10.5
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function pin(city, count, onPick) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `cm-pin${city.live ? ' live' : ''}`
  el.setAttribute('aria-label', `${city.name}${count ? `, ${count} things on` : ''}`)
  el.innerHTML = `
    <span class="cm-pin-face">${city.photo ? `<img src="${city.photo}" alt="" />` : '<i></i>'}</span>
    <span class="cm-pin-label"><b></b>${count ? `<em>${count}</em>` : ''}</span>`
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
      attributionControl: { compact: true, customAttribution: 'Relief: NASA Blue Marble' },
      dragRotate: false, pitchWithRotate: false, maxPitch: 0,
    })
    map.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
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
    m.on('style.load', () => {
      m.setProjection({ type: 'globe' })
      // Brand navy instead of black while tiles load and for open water.
      if (m.getLayer('background')) m.setPaintProperty('background', 'background-color', '#081634')
      // Relief over the land and water fills, under roads and labels.
      const before = m.getStyle().layers.find((l) => l.type === 'line' || l.type === 'symbol')?.id
      m.addSource('relief', { type: 'raster', tiles: [RELIEF], tileSize: 256, maxzoom: 8 })
      m.addLayer({ id: 'relief', type: 'raster', source: 'relief',
        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.95, 8.5, 0], 'raster-saturation': -0.15, 'raster-brightness-max': 0.85 } }, before)
      const target = CITIES.find((c) => c.name.toLowerCase() === (value || '').toLowerCase())
      // Street and area names only once you're close; the pins name the cities.
      m.getStyle().layers.filter((l) => l.type === 'symbol').forEach((l) => m.setLayerZoomRange(l.id, Math.max(l.minzoom ?? 0, 7.5), l.maxzoom ?? 24))
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
      new maplibregl.Marker({ element: pin(c, counts[c.name], (n) => pick.current?.(n)), anchor: 'bottom' }).setLngLat([c.lon, c.lat]).addTo(m)]))
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
      <button type="button" className="cm-all glass" onClick={zoomOut}>All of Nigeria</button>
    </div>
  )
}
