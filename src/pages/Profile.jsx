// Profile — laid out like the VOIDAJ app's profile screen: a cover, the
// photo with a verified tick, name, @username, headline and location,
// counts (connections, communities, events), actions, badges, then tabs:
// About · Activity · Communities · Impact.
// Works for everyone: your own (/profile/me), any member (/profile/:id)
// and shareable links (/u/:handle). Your own adds the VIS tabs, location
// privacy, editing, and your private job tracker.
import { useEffect, useState } from 'react'
import { useParams, Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import * as api from '../api.js'
import { useApp } from '../state.jsx'
import { COMMUNITIES } from '../data/seed.js'
import { useCommunities } from '../communities.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, CommunityCard, TagPills, FavoriteButton } from '../components/bits.jsx'
import { PortfolioSection } from '../components/Portfolio.jsx'
import { JobHistory } from '../components/JobHistory.jsx'
import { VoicesSection, CopyLink } from '../components/Voices.jsx'
import { VoiceSections } from './Voice.jsx'
import { AboutSection } from '../components/Socials.jsx'
import { OCCUPATIONS } from '../components/JobPeople.jsx'

const PRIVACY_LEVELS = [
  { id: 'exact', label: 'Exact area' },
  { id: 'city-only', label: 'City only' },
  { id: 'hidden', label: 'Hidden' },
]
const TABS = [
  { id: 'about', label: 'About' },
  { id: 'activity', label: 'Activity' },
  { id: 'communities', label: 'Communities' },
  { id: 'impact', label: 'Impact' },
]
const ACTIVITY_ICON = { post: 'chat', community: 'community', event: 'calendar', job: 'wrench' }

// "Active now", or roughly when they were last around.
function presenceText(user) {
  if (user.active) return 'Active now'
  if (!user.lastSeenAt) return null
  const m = Math.floor((Date.now() - user.lastSeenAt) / 60000)
  if (m < 60) return `Active ${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `Active ${h}h ago`
  const d = Math.floor(h / 24)
  return d < 7 ? `Active ${d}d ago` : null
}
const ago = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 60) return `${Math.max(1, m)}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
const joined = (ts) => (ts ? new Date(ts).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null)

function locationFor(user, isMe) {
  if (isMe) {
    if (user.privacy === 'hidden') return 'Location hidden'
    if (user.privacy === 'city-only') return user.city
    return [user.area, user.city].filter(Boolean).join(', ')
  }
  return [user.area, user.city].filter(Boolean).join(', ') || 'Location hidden'
}

// Your own VIS, as tabs above your profile: Main is the full profile, the
// other shows exactly what that VIS's @username shows. A VIS is never
// listed on anyone else's view of you.
function useMyVoices(enabled) {
  const [voices, setVoices] = useState([])
  const [max, setMax] = useState(2)
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
    <div className="profile-voice-tabs" role="tablist" aria-label="Your VIS">
      <button type="button" role="tab" aria-selected={active === 'main'} className={active === 'main' ? 'on' : ''} onClick={() => onPick('main')}>Main</button>
      {voices.map((v) => (
        <button key={v.id} type="button" role="tab" aria-selected={active === v.id} className={active === v.id ? 'on' : ''} onClick={() => onPick(v.id)}>{v.name}</button>
      ))}
      {voices.length + 1 < max && (
        <Link to="/voices/new" className="profile-voice-add" aria-label="Add a VIS"><Icon name="plus" size={12} /> VIS</Link>
      )}
    </div>
  )
}

// Share: the phone's share sheet where there is one, otherwise copy.
function ShareButton({ user }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${user.handle ? `/u/${user.handle.replace(/^@/, '')}` : `/profile/${user.id}`}`
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${user.name} on VOIDAJ`, url }); return } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { window.prompt('Copy this link:', url) }
  }
  return (
    <button type="button" className="btn ghost" onClick={share}>
      <Icon name={copied ? 'check' : 'send'} size={15} /> {copied ? 'Link copied' : 'Share'}
    </button>
  )
}

// A flat cover in the person's colour with a few hand-placed shapes:
// no stock photo. (Cover photos come with photo uploads.)
function Cover({ color }) {
  return (
    <div className="pf-cover" style={{ '--pf': color || '#c2462e' }} aria-hidden="true">
      <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice">
        <circle cx="330" cy="30" r="46" fill="rgba(255,255,255,0.12)" />
        <circle cx="365" cy="95" r="22" fill="rgba(0,0,0,0.12)" />
        <path d="M0 96 L60 70 L110 88 L170 54 L240 84 L300 62 L400 92 L400 120 L0 120 Z" fill="rgba(0,0,0,0.16)" />
        <path d="M0 108 L80 92 L150 104 L230 86 L320 100 L400 90 L400 120 L0 120 Z" fill="rgba(0,0,0,0.2)" />
      </svg>
    </div>
  )
}

export default function Profile() {
  const { id: idParam, handle } = useParams()
  const { profile, user: me, loading, saveProfile, connect } = useApp()
  const navigate = useNavigate()
  const key = handle ? `@${handle}` : idParam
  const isMe = key === 'me' || (!!me && (key === me.id || key?.toLowerCase() === me.handle?.toLowerCase()))
  const [person, setPerson] = useState(null)
  const [missing, setMissing] = useState(false)
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'about'
  const setTab = (t) => setParams((p) => { t === 'about' ? p.delete('tab') : p.set('tab', t); return p }, { replace: true })
  const { all: allCommunities } = useCommunities()

  const { voices, max } = useMyVoices(isMe && !loading && profile.onboarded)
  const [activeVoice, setActiveVoice] = useState('main')
  const picked = isMe ? voices.find((v) => v.id === activeVoice) : null
  const resolved = useResolvedVoice(picked?.handle)

  // Everyone's profile comes from the server: counts, activity, and (for
  // other people) only what their privacy settings allow.
  useEffect(() => {
    setPerson(null); setMissing(false)
    const target = isMe ? me?.id : key
    if (!target) return
    api.getUser(target).then(setPerson).catch(() => setMissing(true))
  }, [key, isMe, me?.id])

  if (isMe && loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (key === 'me' && !me) return <Navigate to="/auth?mode=login" replace />
  if (isMe && !profile.onboarded) return <Navigate to="/welcome" replace />
  if (missing) {
    return (
      <div className="page">
        <div className="card ghost-card left" style={{ marginTop: 40 }}>
          <Icon name="user" size={22} />
          <p><strong>We couldn’t find that person.</strong><br />The link may be old, or they may have left VOIDAJ. <Link to="/explore?type=people">Find people in Explore</Link>.</p>
        </div>
      </div>
    )
  }
  if (!person && !isMe) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>

  // Your own view uses your live account (so edits show at once), with the
  // server's counts and activity on top.
  const user = isMe ? { ...person, ...profile, stats: person?.stats, activity: person?.activity, joinedAt: person?.joinedAt ?? profile.createdAt } : person
  const stats = user.stats ?? { connections: profile.connections.length, communities: profile.communities.length, events: 0, posts: 0, jobsPosted: 0, jobsDone: 0 }
  const seen = presenceText(user)
  const connected = !isMe && profile.connections.includes(user.id)
  const memberOf = [...COMMUNITIES, ...allCommunities.filter((c) => !COMMUNITIES.some((s) => s.id === c.id))]
    .filter((c) => (user.communities ?? []).includes(c.id))
  const recentlyActive = user.active || (user.lastSeenAt && Date.now() - user.lastSeenAt < 7 * 24 * 3600 * 1000)
  const badges = [
    user.idVerified && { id: 'verified', icon: 'badge-check', label: 'Verified', tone: 'green' },
    recentlyActive && { id: 'active', icon: 'zap', label: 'Active', tone: 'terracotta' },
    stats.posts >= 5 && { id: 'top', icon: 'star', label: 'Top Contributor', tone: 'gold', title: '5 or more posts' },
    user.jobSkills?.length > 0 && { id: 'pro', icon: 'wrench', label: OCCUPATIONS[user.jobSkills[0]]?.role ?? 'Pro', tone: 'ink' },
  ].filter(Boolean)

  return (
    <div className="page profile-page pf">
      <section className="pf-hero">
        <Cover color={user.color} />
        {isMe && <Link to="/settings" className="pf-gear" aria-label="Settings"><Icon name="edit" size={16} /></Link>}
        <div className="pf-photo">
          <Avatar user={user} size={104} />
          {user.idVerified && <span className="pf-tick" title="ID verified"><Icon name="badge-check" size={18} /></span>}
        </div>
        <div className="pf-id">
          <h1>{user.name} {isMe && <span className="you-badge">You</span>}</h1>
          <div className="pf-handle">{picked ? `@${picked.handle}` : user.handle}</div>
          {(picked?.headline || user.title) && <p className="pf-headline">{picked ? picked.headline || user.title : user.title}</p>}
          <div className="pf-meta">
            <span><Icon name="map-pin" size={13} /> {locationFor(user, isMe)}</span>
            {joined(user.joinedAt) && <span><Icon name="calendar" size={13} /> Joined {joined(user.joinedAt)}</span>}
            {seen && <span className={`presence-text ${user.active ? 'on' : ''}`}>{user.active && <span className="presence-dot" aria-hidden="true" />}{seen}</span>}
          </div>
        </div>

        <div className="pf-stats">
          <div><b>{stats.connections}</b><span>Connections</span></div>
          <div><b>{stats.communities}</b><span>Communities</span></div>
          <div><b>{stats.events}</b><span>Events</span></div>
        </div>

        <div className="pf-actions">
          {isMe ? (
            <>
              <button type="button" className="btn primary" onClick={() => { setTab('about'); setTimeout(() => document.querySelector('.about-card .btn')?.click(), 50) }}>
                <Icon name="edit" size={15} /> Edit profile
              </button>
              <ShareButton user={user} />
            </>
          ) : (
            <>
              <button className={connected ? 'btn ghost' : 'btn primary'} onClick={() => (me ? connect(user.id) : navigate('/auth'))} disabled={connected}>
                {connected ? <><Icon name="check" size={15} /> Connected</> : 'Connect'}
              </button>
              <Link to={me ? `/chats?dm=${user.id}` : '/auth'} className="btn ghost"><Icon name="message-circle" size={15} /> Message</Link>
              <FavoriteButton item={{ kind: 'person', id: user.id, title: user.name, subtitle: user.title, href: `/profile/${user.id}` }} />
            </>
          )}
        </div>
        {isMe && <Link to="/id" className="pf-id-link"><Icon name="badge-check" size={14} /> Your VOIDAJ ID card <Icon name="arrow" size={13} /></Link>}

        {badges.length > 0 && (
          <div className="pf-badges">
            {badges.map((b) => (
              <span key={b.id} className={`pf-badge tone-${b.tone}`} title={b.title}><Icon name={b.icon} size={13} /> {b.label}</span>
            ))}
          </div>
        )}
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
        <nav className="pf-tabs" role="tablist" aria-label="Profile">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>

        {tab === 'about' && (
          <div className="pf-panel">
            <AboutSection bio={user.bio} socials={user.socials} editable={isMe} onSave={saveProfile} />

            <section className="card pf-facts">
              {user.title && <div><Icon name="briefcase" size={16} /><div><strong>Work</strong><span>{user.title}</span></div></div>}
              {user.jobSkills?.length > 0 && (
                <div><Icon name="wrench" size={16} /><div><strong>Does quick jobs</strong><span>{user.jobSkills.map((s) => OCCUPATIONS[s]?.role ?? s).join(', ')}</span></div></div>
              )}
              <div><Icon name="heart" size={16} /><div><strong>Interests</strong>{user.interests?.length ? <TagPills tags={user.interests} max={10} /> : <span>Not set yet</span>}</div></div>
              {user.skills?.length > 0 && <div><Icon name="zap" size={16} /><div><strong>Skills</strong><span>{user.skills.join(', ')}</span></div></div>}
              {user.goals?.length > 0 && <div><Icon name="sparkle" size={16} /><div><strong>Goals</strong><span>{user.goals.join(' · ')}</span></div></div>}
              {joined(user.joinedAt) && <div><Icon name="calendar" size={16} /><div><strong>Joined</strong><span>{joined(user.joinedAt)}</span></div></div>}
            </section>

            {isMe && (
              <section className="card privacy-card">
                <div className="side-card-head"><Icon name="eye" size={15} /> Location privacy</div>
                <p className="meta-dim">Control what other members see. The server only sends other people what this setting allows.</p>
                <div className="privacy-toggle" role="radiogroup" aria-label="Location privacy level">
                  {PRIVACY_LEVELS.map((p) => (
                    <button key={p.id} role="radio" aria-checked={profile.privacy === p.id}
                      className={`toggle-seg ${profile.privacy === p.id ? 'active' : ''}`} onClick={() => saveProfile({ privacy: p.id })}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <PortfolioSection items={user.portfolio} editable={isMe} onSave={(portfolio) => saveProfile({ portfolio })} />
            {isMe && <VoicesSection profile={profile} />}
          </div>
        )}

        {tab === 'activity' && (
          <div className="pf-panel">
            <section className="card pf-activity">
              <div className="side-card-head"><Icon name="clock" size={15} /> Recent activity</div>
              {user.activity?.length ? (
                <ul>
                  {user.activity.map((a, i) => (
                    <li key={i}>
                      <span className="pf-activity-icon"><Icon name={ACTIVITY_ICON[a.kind] ?? 'zap'} size={14} /></span>
                      <Link to={a.to}>{a.text}</Link>
                      <span className="meta-dim">{ago(a.at)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="meta-dim">Nothing yet. Posts, communities joined and events will show here.</p>}
            </section>
            {isMe && <JobHistory profile={profile} />}
          </div>
        )}

        {tab === 'communities' && (
          <div className="pf-panel">
            {memberOf.length ? (
              <div className="card-grid three">{memberOf.map((c) => <CommunityCard key={c.id} community={c} compact />)}</div>
            ) : <p className="meta-dim">{isMe ? <>You haven’t joined a community yet. <Link to="/explore?type=communities">Find one</Link>.</> : 'No communities yet.'}</p>}
          </div>
        )}

        {tab === 'impact' && (
          <div className="pf-panel">
            <div className="pf-impact">
              {[
                ['chat', stats.posts, 'Posts'],
                ['calendar', stats.events, 'Events hosted'],
                ['community', stats.communities, 'Communities'],
                ['users', stats.connections, 'Connections'],
                ['briefcase', stats.jobsPosted, 'Jobs posted'],
                ['wrench', stats.jobsDone, 'Jobs done'],
              ].map(([icon, n, label]) => (
                <div key={label} className="pf-impact-tile"><Icon name={icon} size={18} /><b>{n}</b><span>{label}</span></div>
              ))}
            </div>
            <Link to="/vision" className="card vision-teaser">
              <div className="vision-banner-tag"><Icon name="sparkle" size={13} /> Coming next</div>
              <div>
                <strong>Reviews and reputation</strong>
                <p className="meta-dim">Ratings from people you’ve worked with, contributions to communities, and badges you earn, all shown here.</p>
              </div>
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        )}
      </>}
    </div>
  )
}
