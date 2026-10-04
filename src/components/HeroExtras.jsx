// Two small hands-on pieces under the hero pitch: a search that shows real
// communities as you type, and a demo of voices — one person, a different
// version of themselves for different people.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES } from '../data/seed.js'
import { Icon } from './Icons.jsx'
import { useAds, pickSearchAd, SearchAd } from './AdsRail.jsx'

const IDEAS = ['photography', 'coding', 'food', 'startups']

function score(c, q) {
  const hay = [c.name, c.tagline, ...c.tags].join(' ').toLowerCase()
  return q.split(/\s+/).filter(Boolean).reduce((n, w) => {
    if (c.tags.some((t) => t.startsWith(w))) return n + 3
    return hay.includes(w) ? n + 1 : n
  }, 0)
}

export function FindYourPeople({ onAsk }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const results = useMemo(() => (term.length < 2 ? [] : COMMUNITIES
    .map((c) => ({ c, s: score(c, term) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.c.memberCount - a.c.memberCount)
    .slice(0, 3)
    .map((x) => x.c)), [term])
  const ads = useAds()
  const ad = pickSearchAd(ads, term)

  return (
    <div className="hx-panel hx-find">
      <div className="hx-label"><Icon name="search" size={12} /> Find your people</div>
      <label className="hx-input">
        <span>I’m into</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="photography, tech, food…" maxLength={40} aria-label="What are you into?" />
      </label>
      {term.length < 2 ? (
        <div className="hx-ideas">
          {IDEAS.map((i) => <button key={i} type="button" onClick={() => setQ(i)}>{i}</button>)}
        </div>
      ) : results.length ? (
        <ul className="hx-results">
          {results.map((c) => (
            <li key={c.id}>
              <Link to={`/community/${c.id}`} style={{ '--accent': c.accent }}>
                <span className="hx-dot" aria-hidden="true" />
                <strong>{c.name}</strong>
                <span className="hx-count">{c.memberCount.toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hx-none">No group for that yet. <button type="button" onClick={onAsk}>Ask the Companion</button></p>
      )}
      {ad && <SearchAd ad={ad} />}
      <div className="hx-who"><Icon name="community" size={11} /> Real groups in Lagos and beyond</div>
    </div>
  )
}

// A made-up member, clearly labelled as an example.
const VOICES = [
  { id: 'main', tab: 'Main', handle: '@tolu', who: 'Everyone', line: 'Designer, runner, jollof critic.', label: 'Interests', pills: ['Design', 'Running', 'Food'] },
  { id: 'work', tab: 'Work', handle: '@tolu.work', who: 'Colleagues & clients', line: 'Product designer at Kola Foods.', label: 'Skills', pills: ['Figma', 'UX research', 'Branding'] },
  { id: 'creative', tab: 'Creative', handle: '@tolu.makes', who: 'Collaborators', line: 'Film photography around Lagos.', label: 'Portfolio', pills: ['Yaba at dusk', 'Market days', '+4'] },
]

export function VoiceSwitcher() {
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)

  // Cycles by itself until someone picks a tab.
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % VOICES.length), 3200)
    return () => clearInterval(t)
  }, [auto])

  const v = VOICES[i]
  return (
    <div className="hx-panel hx-voice">
      <div className="hx-label"><Icon name="layers" size={12} /> One person, many voices <em>Example</em></div>
      <div className="hx-tabs" role="tablist">
        {VOICES.map((x, n) => (
          <button key={x.id} type="button" role="tab" aria-selected={n === i} className={n === i ? 'on' : ''}
            onClick={() => { setAuto(false); setI(n) }}>{x.tab}</button>
        ))}
      </div>
      <div className="hx-card" key={v.id} role="tabpanel">
        <div className="hx-card-top">
          <span className="hx-avatar" aria-hidden="true">T</span>
          <div>
            <strong>Tolu A.</strong>
            <span className="hx-handle">{v.handle}</span>
          </div>
        </div>
        <p className="hx-line">{v.line}</p>
        <div className="hx-pills"><span className="hx-pill-label">{v.label}</span>{v.pills.map((p) => <span key={p} className="hx-pill">{p}</span>)}</div>
        <div className="hx-who"><Icon name="eye" size={11} /> Seen by: {v.who}</div>
      </div>
    </div>
  )
}

// On a laptop the two sit side by side under the pitch. On a phone they
// become a row you swipe through, with dots showing where you are.
export function HeroExtras({ onAsk, swipe = false }) {
  const rowRef = useRef(null)
  const [at, setAt] = useState(0)
  // One card plus the gap between cards.
  const step = () => {
    const card = rowRef.current?.firstElementChild
    return card ? card.getBoundingClientRect().width + 12 : 1
  }
  const onScroll = () => { if (rowRef.current) setAt(Math.round(rowRef.current.scrollLeft / step())) }
  const go = (n) => rowRef.current?.scrollTo({ left: n * step(), behavior: 'smooth' })
  if (!swipe) {
    return (
      <div className="hero-extras">
        <FindYourPeople onAsk={onAsk} />
        <VoiceSwitcher />
      </div>
    )
  }
  return (
    <div className="hero-extras-swipe">
      <div className="hero-extras swipe" ref={rowRef} onScroll={onScroll}>
        <FindYourPeople onAsk={onAsk} />
        <VoiceSwitcher />
      </div>
      <div className="hx-dots" role="tablist" aria-label="Cards">
        {[0, 1].map((n) => (
          <button key={n} type="button" role="tab" aria-selected={at === n} aria-label={n ? 'Many voices' : 'Find your people'}
            className={at === n ? 'on' : ''} onClick={() => go(n)} />
        ))}
      </div>
    </div>
  )
}
