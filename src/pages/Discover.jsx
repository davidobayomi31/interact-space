// Discovery — bounded, curated sections tied to the user's profile.
// Explicitly not an infinite feed: every block is capped and explained.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { COMMUNITIES, EVENTS } from '../data/seed.js'
import { matchCommunities, matchPeople, matchEvents, matchOpportunities, tagLabel } from '../ai.js'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { CommunityCard, PersonCard, EventCard, OpportunityCard, PostCard, SectionHead } from '../components/bits.jsx'

const COMM_TAGS = Object.fromEntries(COMMUNITIES.map((c) => [c.id, c.tags]))

export default function Discover() {
  const { profile, setAssistantOpen } = useApp()
  const tags = profile.interests
  const personalized = profile.onboarded && tags.length > 0
  const [posts, setPosts] = useState([])

  useEffect(() => { api.listPosts().then(setPosts).catch(() => setPosts([])) }, [])

  let communities = personalized ? matchCommunities(tags, profile, 3) : COMMUNITIES.slice(0, 3).map((c) => ({ item: c, shared: [] }))
  if (personalized && communities.length < 3) {
    const shown = new Set([...communities.map((r) => r.item.id), ...profile.communities])
    const extras = COMMUNITIES.filter((c) => !shown.has(c.id) && c.trending)
      .slice(0, 3 - communities.length)
      .map((c) => ({ item: c, shared: [], trending: true }))
    communities = [...communities, ...extras]
  }
  const people = personalized ? matchPeople(tags, profile, 3) : []
  const events = personalized ? matchEvents(tags, profile, 4) : EVENTS.slice(0, 4).map((e) => ({ item: e, shared: [] }))
  const opportunities = personalized ? matchOpportunities(tags, profile, 3) : []

  const discussions = personalized
    ? posts
        .map((p) => ({ item: p, shared: (COMM_TAGS[p.communityId] || []).filter((t) => tags.includes(t)) }))
        .filter((r) => r.shared.length)
        .sort((a, b) => b.shared.length - a.shared.length)
        .slice(0, 3)
    : posts.filter((p) => p.pinned).slice(0, 3).map((p) => ({ item: p, shared: [] }))

  const traceText = (shared) => (shared.length ? `Matches your interest in ${shared.map(tagLabel).join(', ')}` : undefined)

  return (
    <div className="page discover">
      <section className="discover-hero">
        <h1><Icon name="compass" size={24} /> Discover</h1>
        {personalized ? (
          <p className="meta-dim">
            Curated for you from your interests — {tags.slice(0, 5).map(tagLabel).join(', ')}. Five bounded sections, no endless feed.
          </p>
        ) : (
          <p className="meta-dim">
            A taste of the city. <Link to="/auth" className="gold-text">Talk to the companion</Link> to make this page yours.
          </p>
        )}
      </section>

      <section className="section">
        <SectionHead icon="community" title="Communities you may like" />
        <div className="card-grid three">
          {communities.map(({ item, shared }) => (
            <CommunityCard key={item.id} community={item} because={traceText(shared)} />
          ))}
        </div>
      </section>

      {people.length > 0 && (
        <section className="section">
          <SectionHead icon="users" title="People with shared interests" sub="Introductions, not follower counts" />
          <div className="card-grid three">
            {people.map(({ item, shared }) => (
              <PersonCard key={item.id} user={item} because={traceText(shared)} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHead icon="calendar" title="Events" sub="Where the network meets in person" />
        <div className="card-grid two">
          {events.map(({ item, shared }) => (
            <EventCard key={item.id} event={item} because={traceText(shared)} />
          ))}
        </div>
      </section>

      {opportunities.length > 0 && (
        <section className="section">
          <SectionHead icon="sparkle" title="Opportunities" sub="Jobs, grants, gigs and mentorship flowing through your communities" />
          <div className="card-grid three">
            {opportunities.map(({ item, shared }) => (
              <OpportunityCard key={item.id} opp={item} because={traceText(shared)} />
            ))}
          </div>
        </section>
      )}

      {discussions.length > 0 && (
        <section className="section">
          <SectionHead icon="chat" title="Helpful discussions" />
          <div className="stack">
            {discussions.map(({ item, shared }) => (
              <PostCard key={item.id} post={item} because={traceText(shared)} />
            ))}
          </div>
        </section>
      )}

      <section className="section cta-band">
        <h2>That’s everything for today</h2>
        <p className="meta-dim">Discovery here is bounded by design. Want more? Ask your companion for something specific.</p>
        <button className="btn gold-outline" onClick={() => setAssistantOpen(true)}>
          <Icon name="sparkle" size={15} /> Ask the Companion
        </button>
      </section>
    </div>
  )
}
