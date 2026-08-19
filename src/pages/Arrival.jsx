// Stage 1 — Arrival. The open city: explorable without an account.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES, EVENTS, PURPOSE, CHARTER } from '../data/seed.js'
import { CommunityCard, EventCard, PostCard, SectionHead } from '../components/bits.jsx'
import { Icon } from '../components/Icons.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { LiveNowRow } from '../components/Live.jsx'
import { Globe } from '../components/Globe.jsx'

export default function Arrival() {
  const { user, profile, setAssistantOpen } = useApp()
  const [discussions, setDiscussions] = useState([])

  useEffect(() => { api.listPosts({ pinned: 1, limit: 3 }).then(setDiscussions).catch(() => setDiscussions([])) }, [])

  const localTrending = COMMUNITIES.filter((c) => c.scope === 'local' && c.trending)
  const globalTrending = COMMUNITIES.filter((c) => c.scope === 'global')
  const upcoming = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
  const enterTo = !user ? '/auth' : '/welcome'

  return (
    <div className="page arrival">
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-main">
          <div className="hero-content">
            <div className="hero-badge">
              <Icon name="map-pin" size={13} /> You’re looking at <strong>Lagos, Nigeria</strong> · Local Network → Nigeria → Lagos
            </div>
            <h1>A connected world<br />of <span className="gold-text">communities</span></h1>
            <p className="hero-sub">{PURPOSE}</p>
            <div className="hero-actions">
              {user && profile.onboarded ? (
                <Link to="/space" className="btn primary large">Go to My Space <Icon name="arrow" size={17} /></Link>
              ) : (
                <Link to={enterTo} className="btn primary large">Enter the city <Icon name="arrow" size={17} /></Link>
              )}
              <button className="btn gold-outline large" onClick={() => setAssistantOpen(true)}>
                <Icon name="sparkle" size={16} /> Ask the Companion
              </button>
            </div>
            <div className="pillar-row">
              <span><Icon name="users" size={14} /> People</span>
              <span><Icon name="community" size={14} /> Communities</span>
              <span><Icon name="sparkle" size={14} /> Opportunities</span>
            </div>
          </div>

          <div className="hero-globe-col">
            <Globe />
          </div>
        </div>
      </section>

      <LiveNowRow />

      <section className="section">
        <SectionHead icon="map-pin" title="Trending in Lagos" sub="Local communities with the most life this week" />
        <div className="card-grid three">
          {localTrending.map((c) => <CommunityCard key={c.id} community={c} />)}
        </div>
      </section>

      <section className="section">
        <SectionHead icon="globe" title="Trending beyond Lagos" sub="Communities connecting Nigerian cities and the wider region" />
        <div className="card-grid two">
          {globalTrending.map((c) => <CommunityCard key={c.id} community={c} />)}
          <div className="card ghost-card">
            <Icon name="globe" size={26} />
            <p><strong>Starting in Lagos. Built to grow.</strong><br />
            Every community is independent — all share one Charter.</p>
            <ul className="charter-list">
              {CHARTER.slice(0, 3).map((c) => <li key={c}><Icon name="shield" size={12} /> {c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead icon="calendar" title="Happening soon" sub="Real rooms, real people — the city meets in person" />
        <div className="card-grid two">
          {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </section>

      <section className="section">
        <SectionHead icon="chat" title="Public discussions" sub="What communities are talking about right now" />
        <div className="stack">
          {discussions.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>

      {!(user && profile.onboarded) && (
        <section className="section cta-band">
          <h2>Find your place in the city</h2>
          <p className="meta-dim">A two-minute conversation with your AI companion — no forms, no feeds.</p>
          <Link to={enterTo} className="btn primary large">Start the conversation <Icon name="arrow" size={16} /></Link>
        </section>
      )}
    </div>
  )
}
