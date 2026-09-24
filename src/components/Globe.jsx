// A rotating globe of public events "pulled" from around the network —
// demo data styled by source platform (Eventbrite, Meetup, Ticketmaster…)
// rather than a live external feed. Rotation uses a plain orthographic
// projection recomputed every frame; positions are written straight to
// the DOM via refs so the animation never triggers a React re-render.
import { useEffect, useRef, useState } from 'react'
import { WORLD_EVENTS } from '../data/seed.js'
import { Icon } from './Icons.jsx'
import { CompanionBack, CompanionFront, FRAME, GLOBE_HELD, GLOBE_OPEN } from './Companion.jsx'

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

// How far through the pinned hero the visitor has scrolled drives the whole
// hand-off: he fades out first, the globe grows into the space he leaves,
// and the page announces the progress so the ads rail can follow.
const HERO_EVENT = 'voida:hero-progress'
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x) }
const lerp = (a, b, t) => a + (b - a) * t
// Phones run a vertical version of the hand-off (see styles.css).
const PHONE = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 699px)') : { matches: false }
const DOCK_H = 112 // room under the grown globe for the caption and sponsored card

export function Globe({ withCompanion = false, footer = null }) {
  const stageRef = useRef(null)
  const captionRef = useRef(null)
  const backRef = useRef(null)
  const frontRef = useRef(null)
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
    if (!withCompanion) return
    const stage = stageRef.current, wrap = wrapRef.current
    const hero = stage?.closest('.hero'), pin = stage?.closest('.hero-pin')
    if (!stage || !wrap) return
    let frame = 0, lastP = -1
    const apply = () => {
      frame = 0
      // Only animate when the hero is actually pinned (wide, tall screens
      // with motion allowed); otherwise he simply stands holding it.
      const pinned = !!pin && getComputedStyle(pin).position === 'sticky'
      let p = 0
      if (pinned && hero) {
        const travel = hero.offsetHeight - pin.offsetHeight
        const into = pin.getBoundingClientRect().top - hero.getBoundingClientRect().top
        p = travel > 0 ? Math.min(1, Math.max(0, into / travel)) : 0
      }
      // He goes quickly. The arm is its own layer over the globe, so it leaves
      // first — two half-faded layers on top of each other show the join
      // between arm and body.
      const armFade = smooth(0, 0.05, p)
      const bodyFade = smooth(0.01, 0.16, p)
      const grow = smooth(0.06, 0.8, p)
      const k = stage.clientWidth / FRAME.w
      const W = stage.clientWidth, H = stage.clientHeight
      // Where the globe sits in his arm, and where it ends up, in px.
      const from = { x: (GLOBE_HELD.cx - GLOBE_HELD.r - FRAME.x) * k, y: (GLOBE_HELD.cy - GLOBE_HELD.r - FRAME.y) * k, d: 2 * GLOBE_HELD.r * k }
      let to
      if (pinned && PHONE.matches) {
        // On a phone the stage is narrower than the screen, so the globe
        // grows past it to nearly full width, leaving room underneath for
        // the caption and the sponsored card.
        const d = Math.max(from.d, Math.min(pin.clientWidth - 40, 330, H - DOCK_H))
        to = { x: (W - d) / 2, y: Math.max(0, (H - DOCK_H - d) / 2), d }
      } else {
        to = { x: (GLOBE_OPEN.cx - GLOBE_OPEN.r - FRAME.x) * k, y: (GLOBE_OPEN.cy - GLOBE_OPEN.r - FRAME.y) * k, d: 2 * GLOBE_OPEN.r * k }
      }
      wrap.style.left = `${lerp(from.x, to.x, grow)}px`
      wrap.style.top = `${lerp(from.y, to.y, grow)}px`
      wrap.style.width = `${lerp(from.d, to.d, grow)}px`
      const cap = captionRef.current
      if (cap) {
        // Docked over his legs on a phone, so it only shows once he's gone.
        const docked = pinned && PHONE.matches
        const show = docked ? smooth(0.7, 0.9, p) : 1
        cap.style.opacity = String(show)
        cap.style.visibility = show > 0 ? 'visible' : 'hidden'
      }
      for (const [el, fade] of [[backRef.current, bodyFade], [frontRef.current, armFade]]) {
        if (!el) continue
        el.style.opacity = String(1 - fade)
        el.style.transform = `translateY(${bodyFade * 18}px)`
        el.style.visibility = fade >= 1 ? 'hidden' : 'visible'
      }
      if (Math.abs(p - lastP) > 0.002) { lastP = p; window.dispatchEvent(new CustomEvent(HERO_EVENT, { detail: p })) }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply) }
    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const ro = new ResizeObserver(schedule)
    ro.observe(stage)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro.disconnect()
      window.dispatchEvent(new CustomEvent(HERO_EVENT, { detail: 0 }))
    }
  }, [withCompanion])

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
    <div className={`globe-block ${withCompanion ? 'with-companion' : ''}`}>
      <div className="globe-stage" ref={stageRef}>
      {withCompanion && <div className="companion-slot back" ref={backRef}><CompanionBack /></div>}
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
      {withCompanion && <div className="companion-slot front" ref={frontRef}><CompanionFront /></div>}
      </div>
      <div className="globe-caption" ref={captionRef}>
        {selected ? (
          <div className="card globe-event-card">
            <div className="opp-type">via {selected.platform}</div>
            <div className="card-title">{selected.title}</div>
            <div className="meta-dim"><Icon name="map-pin" size={12} /> {selected.city}, {selected.country}</div>
            <div className="meta-dim"><Icon name="users" size={12} /> {selected.attending.toLocaleString()} attending</div>
          </div>
        ) : (
          <p className="meta-dim globe-hint">
            <strong>{WORLD_EVENTS.length} public events live on the network.</strong><br /><span className="hint-long">Click a pin to see what’s happening, anywhere in the world.</span><span className="hint-short">Tap a pin.</span>
          </p>
        )}
        {footer}
      </div>
    </div>
  )
}
