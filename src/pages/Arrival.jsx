// Stage 1 — Arrival. The open city: explorable without an account.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES, EVENTS, PURPOSE, CHARTER, CITY_LINES } from '../data/seed.js'
import { CommunityCard, EventCard, PostCard, SectionHead, CityLine } from '../components/bits.jsx'
import { useCommunities } from '../communities.js'
import { Icon } from '../components/Icons.jsx'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Globe } from '../components/Globe.jsx'
import { HeroExtras } from '../components/HeroExtras.jsx'
import { PhoneHeroAd } from '../components/AdsRail.jsx'

// Phones get their own arrangement of the hero (see styles.css).
const PHONE_QUERY = '(max-width: 699px)'
function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}
const SHORT_PITCH = 'Find your people, share your voice, and see what’s happening around you.'

export default function Arrival() {
  const { user, profile, setAssistantOpen } = useApp()
  const [discussions, setDiscussions] = useState([])
  const [madeEvents, setMadeEvents] = useState([])
  const { created } = useCommunities()
  const phone = useIsPhone()

  useEffect(() => { api.listPosts({ pinned: 1, limit: 3 }).then(setDiscussions).catch(() => setDiscussions([])) }, [])
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    api.listEvents().then((list) => setMadeEvents(list.filter((e) => e.date >= today))).catch(() => {})
  }, [])

  const localTrending = COMMUNITIES.filter((c) => c.scope === 'local' && c.trending)
  const globalTrending = COMMUNITIES.filter((c) => c.scope === 'global')
  // Events members have planned come first, then the demo calendar.
  const upcoming = [...madeEvents.slice(0, 4), ...[...EVENTS].sort((a, b) => a.date.localeCompare(b.date))].slice(0, 4)
  const enterTo = !user ? '/auth' : '/welcome'
  const startTo = user ? '/communities/new' : '/auth'

  return (
    <div className="page arrival">
      <section className="hero scrolly">
        <div className="hero-pin">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-main">
          <div className="hero-content">
            <div className="hero-badge">
              <Icon name="map-pin" size={13} /> You’re looking at <strong>Lagos, Nigeria</strong>
            </div>
            <h1 className="hero-title"><span>Voices Of Individuals,</span> <span>Discovered Anywhere</span></h1>
            <p className="hero-sub">{phone ? SHORT_PITCH : PURPOSE}</p>
            <div className="hero-actions">
              {user && profile.onboarded ? (
                <Link to="/space" className="btn primary large">Go to My Space <Icon name="arrow" size={17} /></Link>
              ) : (
                <Link to={enterTo} className="btn primary large">Enter the city <Icon name="arrow" size={17} /></Link>
              )}
              <button className="btn brand-outline large" onClick={() => setAssistantOpen(true)}>
                <Icon name="sparkle" size={16} /> {phone ? 'Ask' : 'Ask the Companion'}
              </button>
            </div>
            <div className="pillar-row">
              <span><Icon name="users" size={14} /> People</span>
              <span><Icon name="community" size={14} /> Communities</span>
              <span><Icon name="sparkle" size={14} /> Opportunities</span>
            </div>
            {!phone && <HeroExtras onAsk={() => setAssistantOpen(true)} />}
          </div>

          <div className="hero-globe-col">
            <Globe withCompanion footer={phone ? <PhoneHeroAd /> : null} />
          </div>
        </div>
        </div>
      </section>

      {phone && (
        <section className="section hx-phone">
          <div className="hx-phone-label">Start here · swipe <Icon name="arrow" size={12} /></div>
          <HeroExtras swipe onAsk={() => setAssistantOpen(true)} />
        </section>
      )}

      <section className="section" id="trending-lagos">
        <SectionHead icon="map-pin" title="Trending in Lagos" sub="Local communities with the most life this week"
          action={<Link to={startTo} className="btn brand-outline small"><Icon name="plus" size={14} /> Start a community</Link>} />
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

      {created.length > 0 && (
        <section className="section">
          <SectionHead icon="sparkle" title="New in the city" sub="Communities members started recently" />
          <div className="card-grid three">
            {created.slice(-3).reverse().map((c) => <CommunityCard key={c.id} community={c} />)}
          </div>
        </section>
      )}

      <section className="section">
        <CityLine {...CITY_LINES.meet} />
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

      <section className="section city-lines">
        <CityLine {...CITY_LINES.voice} />
        <CityLine {...CITY_LINES.roots} />
        <CityLine {...CITY_LINES.trust} />
      </section>

    </div>
  )
}
