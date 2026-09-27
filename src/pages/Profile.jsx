// Profile — works for the current user (/profile/me, editable privacy
// toggle) and any seeded member (/profile/:id).
import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import * as api from '../api.js'
import { useApp } from '../state.jsx'
import { USERS, COMMUNITIES } from '../data/seed.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, CommunityCard, TagPills } from '../components/bits.jsx'
import { PortfolioSection } from '../components/Portfolio.jsx'
import { JobHistory } from '../components/JobHistory.jsx'
import { VoicesSection, CopyLink } from '../components/Voices.jsx'
import { VoiceSections } from './Voice.jsx'

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

// Your own voices, as tabs across the top of your profile: Main is the
// full profile, each other tab shows exactly what that voice's @username
// shows. Voices are never listed on anyone else's profile — a work voice
// shouldn't lead back to the personal one.
function useMyVoices(enabled) {
  const [voices, setVoices] = useState([])
  const [max, setMax] = useState(4)
  useEffect(() => {
    if (!enabled) return
    api.listVoices().then((d) => { setVoices(d.voices); setMax(d.max) }).catch(() => {})
  }, [enabled])
  return { voices, max }
}

function useResolvedVoice(handle) {
  const [voice, setVoice] = useState(null)
  useEffect(() => {
    setVoice(null)
    if (!handle) return
    let live = true
    api.getVoice(handle).then((d) => { if (live) setVoice(d.voice) }).catch(() => {})
    return () => { live = false }
  }, [handle])
  return voice
}

function VoiceTabs({ voices, max, active, onPick }) {
  return (
    <div className="profile-voice-tabs" role="tablist" aria-label="Your voices">
      <button type="button" role="tab" aria-selected={active === 'main'} className={active === 'main' ? 'on' : ''} onClick={() => onPick('main')}>Main</button>
      {voices.map((v) => (
        <button key={v.id} type="button" role="tab" aria-selected={active === v.id} className={active === v.id ? 'on' : ''} onClick={() => onPick(v.id)}>{v.name}</button>
      ))}
      {voices.length + 1 < max && (
        <Link to="/voices/new" className="profile-voice-add"><Icon name="plus" size={12} /> Add a voice</Link>
      )}
    </div>
  )
}

export default function Profile() {
  const { id } = useParams()
  const { profile, loading, saveProfile, connect } = useApp()
  const isMe = id === 'me' || id === profile.id
  const { voices, max } = useMyVoices(isMe && !loading && profile.onboarded)
  const [activeVoice, setActiveVoice] = useState('main')
  const picked = isMe ? voices.find((v) => v.id === activeVoice) : null
  const resolved = useResolvedVoice(picked?.handle)
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
            <span className="meta-dim">{picked ? `@${picked.handle}` : user.handle ?? ''}</span>
          </div>
          <p className="profile-bio">{picked ? picked.headline || user.bio : user.bio}</p>
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

      {isMe && <VoiceTabs voices={voices} max={max} active={picked ? picked.id : 'main'} onPick={setActiveVoice} />}

      {picked ? (
        <section className="profile-voice-view" role="tabpanel">
          <div className="profile-voice-bar">
            <span className="meta-dim"><Icon name="eye" size={13} /> Seen by: anyone you give <strong>@{picked.handle}</strong></span>
            <div className="voice-actions">
              <Link to={`/v/${picked.handle}`} className="btn ghost small"><Icon name="eye" size={13} /> View as others</Link>
              <CopyLink handle={picked.handle} />
              <Link to={`/voices/${picked.id}`} className="btn ghost small"><Icon name="edit" size={13} /> Edit</Link>
            </div>
          </div>
          {resolved ? <VoiceSections voice={resolved} /> : <p className="meta-dim vv-empty">Loading…</p>}
        </section>
      ) : <>
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
      </>}
    </div>
  )
}
