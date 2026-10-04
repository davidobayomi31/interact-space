// Stage 3 — My Space: the personal digital home, with an always-visible
// door back out into the wider city.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { COMMUNITIES, USERS, EVENTS, CITY_LINES } from '../data/seed.js'
import { useCommunities, findCommunity } from '../communities.js'
import { matchCommunities, matchPeople, tagLabel } from '../ai.js'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, CommunityCard, PersonCard, EventCard, PostCard, SectionHead, TagPills, CityLine } from '../components/bits.jsx'
import { LiveNowRow } from '../components/Live.jsx'

export default function MySpace() {
  const { user, profile, loading, setAssistantOpen } = useApp()
  const [digest, setDigest] = useState([])
  const { all: catalog } = useCommunities()

  useEffect(() => {
    if (!profile.communities.length) { setDigest([]); return }
    api.listPosts().then((all) => setDigest(all.filter((p) => profile.communities.includes(p.communityId)).slice(0, 3))).catch(() => {})
  }, [user]) // eslint-disable-line

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  if (!profile.onboarded) return <Navigate to="/welcome" replace />

  const myCommunities = catalog.filter((c) => profile.communities.includes(c.id))
  const myConnections = USERS.filter((u) => profile.connections.includes(u.id))
  const myEvents = EVENTS
    .filter((e) => profile.communities.includes(e.communityId) || e.tags.some((t) => profile.interests.includes(t)))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  // A member who hasn't told us an interest yet still deserves a starting
  // point — trending communities, labelled as exactly that rather than
  // dressed up as a match against a profile that is still empty.
  const noInterests = !profile.interests?.length
  const trendingBecause = 'Trending in Lagos — tell the companion what you’re into to tune this'
  const suggestedCommunities = noInterests
    ? COMMUNITIES.filter((c) => c.trending && !profile.communities.includes(c.id))
        .slice(0, 2).map((item) => ({ item, shared: [] }))
    : matchCommunities(profile.interests, profile, 2)
  const suggestedPeople = matchPeople(profile.interests, profile, 2)
  const first = profile.name.split(' ')[0]

  return (
    <div className="page myspace">
      {/* Identity band */}
      <section className="space-hero">
        <div className="space-hero-left">
          <Avatar user={profile} size={64} />
          <div>
            <h1>{first}’s Space</h1>
            <div className="meta-dim">
              <Icon name="map-pin" size={13} /> {profile.privacy === 'hidden' ? 'Location hidden' : profile.privacy === 'city-only' ? 'Lagos' : `${profile.area}, Lagos`}
              <span className="privacy-note"><Icon name="eye" size={12} /> {profile.privacy === 'hidden' ? 'hidden from members' : profile.privacy === 'city-only' ? 'city only' : 'exact area shown'}</span>
            </div>
            {profile.interests.length > 0 && <TagPills tags={profile.interests} max={5} />}
          </div>
        </div>
        <div className="space-hero-actions">
          <Link to="/" className="btn ghost"><Icon name="globe" size={15} /> Step out into the city</Link>
        </div>
      </section>

      <div className="space-grid">
        <div className="space-main">
          {/* My communities */}
          <section className="section">
            <SectionHead icon="community" title="My communities" sub={myCommunities.length ? undefined : 'You haven’t joined any yet — your companion has ideas below.'}
              action={<Link to="/communities/new" className="btn brand-outline small"><Icon name="plus" size={14} /> Start a community</Link>} />
            {myCommunities.length > 0 ? (
              <div className="card-grid two">
                {myCommunities.map((c) => <CommunityCard key={c.id} community={c} compact />)}
              </div>
            ) : (
              <div className="card-grid two">
                {suggestedCommunities.map(({ item, shared }) => (
                  <CommunityCard key={item.id} community={item} shared={shared} source="profile" because={noInterests ? trendingBecause : undefined} />
                ))}
              </div>
            )}
          </section>

          {/* Catch-up digest */}
          {digest.length > 0 && (
            <section className="section">
              <SectionHead
                icon="chat" title="While you were away"
                sub="A bounded digest from your communities — not a feed"
                action={<button className="btn ghost small" onClick={() => setAssistantOpen(true)}><Icon name="sparkle" size={13} /> Summarize for me</button>}
              />
              <div className="stack">
                {digest.map((p) => (
                  <PostCard key={p.id} post={p} community={findCommunity(p.communityId)} />
                ))}
              </div>
            </section>
          )}

          {/* Live now — renders nothing unless someone is streaming */}
          <LiveNowRow />

          {/* My events */}
          <section className="section">
            <SectionHead icon="calendar" title="My events" sub="From your communities and interests" />
            <div className="card-grid two">
              {myEvents.length ? myEvents.map((e) => {
                const shared = e.tags.filter((t) => profile.interests.includes(t))
                return <EventCard key={e.id} event={e} shared={shared} source="profile" />
              }) : <p className="meta-dim">Nothing on your calendar yet — <Link to="/">see what’s on in the city</Link>.</p>}
            </div>
          </section>

          {/* My projects — demo placeholder that stays honest */}
          <section className="section">
            <CityLine {...CITY_LINES.build} />
          </section>

          <section className="section">
            <SectionHead icon="zap" title="My projects" sub="Collaborations you start or join live here" />
            <div className="card ghost-card left">
              <Icon name="plus-circle" size={22} />
              <p><strong>No projects yet.</strong><br />Projects grow out of communities — ask your companion to help you start one with people who share your goals.</p>
              <button className="btn brand-outline small" onClick={() => setAssistantOpen(true)}>
                <Icon name="sparkle" size={14} /> Start with the Companion
              </button>
            </div>
          </section>
        </div>

        <aside className="space-side">
          {/* AI assistant card */}
          <div className="card companion-card">
            <div className="assistant-orb"><Icon name="sparkle" size={18} /></div>
            <strong>Your Companion</strong>
            <p className="meta-dim">Knows your goals{profile.goals.length ? `: ${profile.goals.slice(0, 2).join(', ')}` : ''}. Ask it anything about the network.</p>
            <button className="btn primary small" onClick={() => setAssistantOpen(true)}>Open chat</button>
          </div>

          {/* My connections */}
          <div className="card side-card">
            <div className="side-card-head"><Icon name="users" size={15} /> My connections</div>
            {myConnections.length ? (
              <div className="connection-list">
                {myConnections.map((u) => (
                  <Link key={u.id} to={`/profile/${u.id}`} className="connection-row">
                    <Avatar user={u} size={30} />
                    <div>
                      <div className="connection-name">{u.name}</div>
                      <div className="meta-dim">{u.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <p className="meta-dim">No connections yet. People with your interests:</p>
                <div className="stack tight">
                  {suggestedPeople.map(({ item, shared }) => (
                    <PersonCard key={item.id} user={item} shared={shared} source="profile" />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* My interests */}
          <div className="card side-card">
            <div className="side-card-head"><Icon name="heart" size={15} /> My interests</div>
            {profile.interests.length
              ? <TagPills tags={profile.interests} max={8} />
              : <p className="meta-dim">Tell the companion what you’re into and this fills up.</p>}
            {profile.goals.length > 0 && (
              <>
                <div className="side-card-head goals-head"><Icon name="sparkle" size={15} /> My goals</div>
                <ul className="goal-list">
                  {profile.goals.map((g) => <li key={g}>{g}</li>)}
                </ul>
              </>
            )}
            <Link to="/profile/me" className="btn ghost small">Edit profile</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
