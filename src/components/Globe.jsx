// A rotating globe of public events "pulled" from around the network —
// demo data styled by source platform (Eventbrite, Meetup, Ticketmaster…)
// rather than a live external feed. Rotation uses a plain orthographic
// projection recomputed every frame; positions are written straight to
// the DOM via refs so the animation never triggers a React re-render.
import { useEffect, useRef, useState } from 'react'
import { WORLD_EVENTS } from '../data/seed.js'
import { Icon } from './Icons.jsx'

function project(lat, lon, rotationDeg, radiusPx) {
  const latRad = (lat * Math.PI) / 180
  const lonRad = ((lon + rotationDeg) * Math.PI) / 180
  const x = Math.cos(latRad) * Math.sin(lonRad)
  const y = -Math.sin(latRad)
  const z = Math.cos(latRad) * Math.cos(lonRad)
  return {
    x: x * radiusPx,
    y: y * radiusPx,
    scale: 0.5 + 0.5 * Math.max(0, z),
    opacity: z > 0.08 ? 1 : Math.max(0, (z + 0.18) / 0.26) * 0.55,
    z,
  }
}

export function Globe() {
  const wrapRef = useRef(null)
  const pinRefs = useRef({})
  const rotRef = useRef(0)
  const [selected, setSelected] = useState(null)
  const [size, setSize] = useState(320)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setSize(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setSize(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const step = reduced ? 0 : 0.055
    const radius = size / 2 - 12
    let raf
    const tick = () => {
      rotRef.current = (rotRef.current + step) % 360
      for (const ev of WORLD_EVENTS) {
        const node = pinRefs.current[ev.id]
        if (!node) continue
        const p = project(ev.lat, ev.lon, rotRef.current, radius)
        node.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(${p.scale})`
        node.style.opacity = String(p.opacity)
        node.style.zIndex = String(Math.round((p.z + 1) * 100))
        node.style.pointerEvents = p.opacity > 0.5 ? 'auto' : 'none'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <div className="globe-block">
      <div className="globe-wrap" ref={wrapRef}>
        <div className="globe-sphere" />
        <div className="globe-grid" aria-hidden="true" />
        {WORLD_EVENTS.map((ev) => (
          <button
            key={ev.id}
            ref={(node) => { pinRefs.current[ev.id] = node }}
            className={`globe-pin ${selected?.id === ev.id ? 'active' : ''}`}
            style={{ left: '50%', top: '50%' }}
            onClick={() => setSelected(ev)}
            aria-label={`${ev.title}, ${ev.city}`}
          >
            <span className="globe-pin-dot" />
          </button>
        ))}
      </div>
      <div className="globe-caption">
        {selected ? (
          <div className="card globe-event-card">
            <div className="opp-type">via {selected.platform}</div>
            <div className="card-title">{selected.title}</div>
            <div className="meta-dim"><Icon name="map-pin" size={12} /> {selected.city}, {selected.country}</div>
            <div className="meta-dim"><Icon name="users" size={12} /> {selected.attending.toLocaleString()} attending</div>
          </div>
        ) : (
          <p className="meta-dim globe-hint">
            <strong>{WORLD_EVENTS.length} public events live on the network.</strong><br />Click a pin to see what’s happening, anywhere in the world.
          </p>
        )}
      </div>
    </div>
  )
}
