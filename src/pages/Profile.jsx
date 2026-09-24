// Profile — works for the current user (/profile/me, editable privacy
// toggle) and any seeded member (/profile/:id).
import { useParams, Link, Navigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { USERS, COMMUNITIES } from '../data/seed.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, CommunityCard, TagPills } from '../components/bits.jsx'
import { PortfolioSection } from '../components/Portfolio.jsx'
import { JobHistory } from '../components/JobHistory.jsx'
import { VoicesSection } from '../components/Voices.jsx'

const PRIVACY_LEVELS = [
  { id: 'exact', label: 'Exact area' },
  { id: 'city-only', label: 'City only' },
  { id: 'hidden', label: 'Hidden' },
]

// What another member is allowed to see. The server already withholds
// area/city according to the owner's setting, so for other people this
// just renders whatever arrived; for yourself it previews your setting.
function locationFor(user, isMe) {
  if (isMe) {
    if (user.privacy === 'hidden') return 'Location hidden'
    if (user.privacy === 'city-only') return user.city
    return `${user.area}, ${user.city}`
  }
  if (user.area) return `${user.area}, ${user.city}`
  return user.city || 'Location hidden'
}

export default function Profile() {
  const { id } = useParams()
  const { profile, loading, saveProfile, connect } = useApp()
  const isMe = id === 'me' || id === profile.id
  if (isMe && loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  const user = isMe ? profile : USERS.find((u) => u.id === id)
  if (!user) return <Navigate to="/" replace />
  if (isMe && !profile.onboarded) return <Navigate to="/welcome" replace />

  const communities = COMMUNITIES.filter((c) =>
    isMe ? profile.communities.includes(c.id) : user.communities.includes(c.id))
  const connected = !isMe && profile.connections.includes(user.id)
  const locationText = locationFor(user, isMe)

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <Avatar user={user} size={84} />
        <div className="profile-hero-text">
          <h1>
            {user.name} {isMe && <span className="you-badge">You</span>}
            {user.idVerified && <span className="verified-tag"><Icon name="badge-check" size={13} /> Verified</span>}
          </h1>
          <div className="meta-dim">{user.title}</div>
          <div className="meta-row">
            <span className="meta-dim"><Icon name="map-pin" size={13} /> {locationText}</span>
            <span className="meta-dim">{user.handle ?? ''}</span>
          </div>
          <p className="profile-bio">{user.bio}</p>
        </div>
        <div className="profile-hero-actions">
          {isMe ? (
            <Link to="/space" className="btn ghost"><Icon name="home" size={15} /> My Space</Link>
          ) : (
            <>
              <Link to={`/chats?dm=${user.id}`} className="btn brand-outline"><Icon name="message-circle" size={15} /> Message</Link>
              <button className={connected ? 'btn ghost' : 'btn primary'} onClick={() => connect(user.id)} disabled={connected}>
                {connected ? <><Icon name="check" size={15} /> Connected</> : 'Connect'}
              </button>
            </>
          )}
        </div>
      </section>

      {isMe && (
        <section className="card privacy-card">
          <div className="side-card-head"><Icon name="eye" size={15} /> Location privacy</div>
          <p className="meta-dim">Control what other members see. The server only sends other people what this setting allows.</p>
          <div className="privacy-toggle" role="radiogroup" aria-label="Location privacy level">
            {PRIVACY_LEVELS.map((p) => (
              <button
                key={p.id} role="radio" aria-checked={profile.privacy === p.id}
                className={`toggle-seg ${profile.privacy === p.id ? 'active' : ''}`}
                onClick={() => saveProfile({ privacy: p.id })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="profile-grid">
        <div className="card side-card">
          <div className="side-card-head"><Icon name="heart" size={15} /> Interests</div>
          {user.interests.length ? <TagPills tags={user.interests} max={10} /> : <p className="meta-dim">Not set yet.</p>}
        </div>
        <div className="card side-card">
          <div className="side-card-head"><Icon name="zap" size={15} /> Skills</div>
          {user.skills?.length
            ? <div className="pills">{user.skills.map((s) => <span key={s} className="pill skill">{s}</span>)}</div>
            : <p className="meta-dim">Not set yet.</p>}
        </div>
        <div className="card side-card">
          <div className="side-card-head"><Icon name="sparkle" size={15} /> Goals</div>
          {user.goals?.length
            ? <ul className="goal-list">{user.goals.map((g) => <li key={g}>{g}</li>)}</ul>
            : <p className="meta-dim">Not set yet.</p>}
        </div>
      </div>

      <PortfolioSection
        items={user.portfolio}
        editable={isMe}
        onSave={(portfolio) => saveProfile({ portfolio })}
      />

      {isMe && <VoicesSection profile={profile} />}
      {isMe && <JobHistory profile={profile} />}

      <Link to="/vision" className="card vision-teaser">
        <div className="vision-banner-tag"><Icon name="sparkle" size={13} /> Coming in V1</div>
        <div>
          <strong>See what profiles become with the AI Identity Builder</strong>
          <p className="meta-dim">What you offer, what you need, verified badges, reputation — built by the AI in conversation, not a form.</p>
        </div>
        <Icon name="arrow" size={18} />
      </Link>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title"><Icon name="community" size={18} /> Communities</h2>
        </div>
        {communities.length ? (
          <div className="card-grid three">
            {communities.map((c) => <CommunityCard key={c.id} community={c} compact />)}
          </div>
        ) : (
          <p className="meta-dim">No communities yet.</p>
        )}
      </section>
    </div>
  )
}
