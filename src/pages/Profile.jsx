// Profile — laid out like Nuel's mockup: a cover photo, the profile photo
// in a glowing ring with a verified tick, name, @username, headline and
// location, then Posts · Followers · Following · Connections, actions,
// badges, the VOIDAJ ID card, and tabs: Posts · About · Communities ·
// Activity · Badges (· Saved on your own).
// Followers and connections are different things (Nuel, Oct 25):
// followers are anyone who follows you; connections are the people you
// pick out — "I would wanna check out your connections not your followers".
// Works for everyone: your own (/profile/me), any member (/profile/:id)
// and shareable links (/u/:handle). Your own adds the VIS tabs, location
// privacy, editing, and your private job tracker.
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useParams, Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import * as api from '../api.js'
import { useApp } from '../state.jsx'
import { COMMUNITIES } from '../data/seed.js'
import { useCommunities } from '../communities.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { Avatar, CommunityCard, TagPills, FavoriteButton } from '../components/bits.jsx'
import { VoidajMark } from '../components/VoidajMark.jsx'
import { CoverPicker } from '../components/CoverPicker.jsx'
import { FeedPost } from '../components/Feed.jsx'
import { useFavorites } from '../favorites.js'
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
  { id: 'posts', label: 'Posts' },
  { id: 'about', label: 'About' },
  { id: 'communities', label: 'Communities' },
  { id: 'activity', label: 'Activity' },
  { id: 'badges', label: 'Badges' },
  { id: 'saved', label: 'Saved', mine: true },
]
const LISTS = [
  { id: 'followers', label: 'Followers' },
  { id: 'following', label: 'Following' },
  { id: 'connections', label: 'Connections' },
]
const listOfWords = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean)
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

// The cover: their photo if they've added one, otherwise a city at night
// in their colour.
function Cover({ user }) {
  return (
    <div className="pf2-cover" style={{ '--pf': user.color || '#3B82F6' }} aria-hidden="true">
      {user.cover ? <img src={user.cover} alt="" /> : (
        <svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice">
          <defs><linearGradient id="pfsky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0B1F3B" /><stop offset="0.6" stopColor="var(--pf)" /><stop offset="1" stopColor="#7C3AED" /></linearGradient></defs>
          <rect width="400" height="140" fill="url(#pfsky)" />
          <circle cx="320" cy="34" r="40" fill="rgba(255,255,255,0.10)" />
          {[[10, 70, 26], [40, 52, 20], [64, 84, 30], [98, 40, 18], [120, 62, 26], [150, 30, 20], [174, 74, 28], [206, 46, 22], [232, 66, 30], [266, 36, 20], [290, 80, 26], [320, 54, 24], [348, 70, 30], [380, 44, 20]].map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height={140 - y} fill="rgba(3,8,23,0.55)" />
          ))}
        </svg>
      )}
    </div>
  )
}

// Followers, following or connections, as a sheet with a search box.
function PeopleSheet({ user, list, onList, onClose }) {
  const { user: me, profile, follow } = useApp()
  const navigate = useNavigate()
  const [people, setPeople] = useState(null)
  const [q, setQ] = useState('')
  useEffect(() => { setPeople(null); api.people(user.id, list).then(setPeople).catch(() => setPeople([])) }, [user.id, list])
  const term = q.trim().toLowerCase()
  const shown = (people || []).filter((p) => !term || `${p.name} ${p.handle} ${p.title}`.toLowerCase().includes(term))
  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div className="sheet people-sheet" role="dialog" aria-label={`${user.name}’s ${list}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{user.name}</strong>
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="seg" role="tablist">
          {LISTS.map((l) => <button key={l.id} role="tab" aria-selected={list === l.id} className={list === l.id ? 'on' : ''} onClick={() => onList(l.id)}>{l.label}</button>)}
        </div>
        {list === 'connections' && <p className="meta-dim people-note">People {user.id === me?.id ? 'you’ve' : `${user.name.split(' ')[0]} has`} picked out from everyone they follow and meet.</p>}
        <label className="search-pill"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></label>
        <ul className="people-list">
          {people === null && <li className="meta-dim">Loading…</li>}
          {people && shown.length === 0 && <li className="meta-dim">{term ? 'No one matches that.' : 'No one here yet.'}</li>}
          {shown.map((p) => {
            const following = (profile.following ?? []).includes(p.id)
            return (
              <li key={p.id}>
                <Link to={`/profile/${p.id}`} onClick={onClose} className="people-row">
                  <Avatar user={p} size={42} />
                  <span><b>{p.name}{p.idVerified && <Icon name="badge-check" size={13} className="fp-tick" />}</b><em>{p.title || p.handle}</em></span>
                </Link>
                {p.id !== me?.id && (
                  <button className={`btn small ${following ? 'ghost' : 'primary'}`} onClick={() => (me ? follow(p.id) : navigate('/auth'))}>
                    {following ? 'Following' : 'Follow'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// Edit everything on the profile in one sheet.
function EditSheet({ onClose }) {
  const { profile, saveProfile } = useApp()
  const [f, setF] = useState({
    name: profile.name, title: profile.title || '', bio: profile.bio || '', area: profile.area || '', city: profile.city || '',
    interests: (profile.interests || []).join(', '), skills: (profile.skills || []).join(', '), goals: (profile.goals || []).join(', '),
    photo: profile.photo || '', cover: profile.cover || '',
  })
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await saveProfile({ ...f, interests: listOfWords(f.interests), skills: listOfWords(f.skills), goals: listOfWords(f.goals) })
      onClose()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }
  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <form className="sheet edit-sheet" onSubmit={save} onClick={(e) => e.stopPropagation()} aria-label="Edit profile">
        <div className="sheet-head">
          <IconTile name="edit" tone="grad" size={36} />
          <strong>Edit profile</strong>
          <button type="button" className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="edit-photos">
          <CoverPicker value={f.photo} onChange={(v) => setF((x) => ({ ...x, photo: v }))} kind="avatar" onBusy={setUploading} label="Profile photo" />
          <CoverPicker value={f.cover} onChange={(v) => setF((x) => ({ ...x, cover: v }))} kind="profile-cover" onBusy={setUploading} label="Cover photo" />
        </div>
        <label className="field"><span>Name</span><input value={f.name} onChange={set('name')} maxLength={60} /></label>
        <label className="field"><span>Headline</span><input value={f.title} onChange={set('title')} placeholder="e.g. Plumber in Yaba · Photographer" maxLength={80} /></label>
        <label className="field"><span>Bio</span><textarea value={f.bio} onChange={set('bio')} rows={3} maxLength={300} placeholder="A line or two about you" /></label>
        <div className="field-row">
          <label className="field"><span>Area</span><input value={f.area} onChange={set('area')} placeholder="e.g. Yaba" /></label>
          <label className="field"><span>City</span><input value={f.city} onChange={set('city')} placeholder="e.g. Lagos" /></label>
        </div>
        <label className="field"><span>Interests <em>separate with commas</em></span><input value={f.interests} onChange={set('interests')} placeholder="music, art, tech" /></label>
        <label className="field"><span>Skills</span><input value={f.skills} onChange={set('skills')} placeholder="photography, web design" /></label>
        <label className="field"><span>Goals</span><input value={f.goals} onChange={set('goals')} placeholder="Meet people, find work" /></label>
        {error && <p className="auth-error">{error}</p>}
        <div className="composer-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || uploading}>{busy ? 'Saving…' : uploading ? 'Uploading photo…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}

// Work, interests, skills and goals, each editable right where they are
// (Nuel: "there is no edit for this").
function FactsCard({ user, isMe }) {
  const { saveProfile } = useApp()
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const start = () => { setF({ title: user.title || '', interests: (user.interests || []).join(', '), skills: (user.skills || []).join(', '), goals: (user.goals || []).join(', ') }); setEditing(true) }
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await saveProfile({ title: f.title, interests: listOfWords(f.interests), skills: listOfWords(f.skills), goals: listOfWords(f.goals) }); setEditing(false) } catch { /* keep the form open */ }
    setBusy(false)
  }
  if (editing) {
    return (
      <form className="card pf-facts editing" onSubmit={save}>
        <div className="pf-facts-head"><strong>Work & interests</strong></div>
        <label className="field"><span><Icon name="briefcase" size={14} /> Work</span><input value={f.title} onChange={set('title')} placeholder="What you do" /></label>
        <label className="field"><span><Icon name="heart" size={14} /> Interests</span><input value={f.interests} onChange={set('interests')} placeholder="music, art" /></label>
        <label className="field"><span><Icon name="zap" size={14} /> Skills</span><input value={f.skills} onChange={set('skills')} placeholder="photography" /></label>
        <label className="field"><span><Icon name="sparkle" size={14} /> Goals</span><input value={f.goals} onChange={set('goals')} placeholder="Meet people, find opportunities" /></label>
        <div className="composer-foot">
          <button type="button" className="btn ghost small" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn primary small" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    )
  }
  return (
    <section className="card pf-facts">
      <div className="pf-facts-head">
        <strong>Work & interests</strong>
        {isMe && <button className="btn ghost small" onClick={start}><Icon name="edit" size={13} /> Edit</button>}
      </div>
      <div><Icon name="briefcase" size={16} /><div><strong>Work</strong><span>{user.title || 'Not set yet'}</span></div></div>
      {user.jobSkills?.length > 0 && (
        <div><Icon name="wrench" size={16} /><div><strong>Does quick jobs</strong><span>{user.jobSkills.map((s) => OCCUPATIONS[s]?.role ?? s).join(', ')}</span></div></div>
      )}
      <div><Icon name="heart" size={16} /><div><strong>Interests</strong>{user.interests?.length ? <TagPills tags={user.interests} max={10} /> : <span>Not set yet</span>}</div></div>
      <div><Icon name="zap" size={16} /><div><strong>Skills</strong><span>{user.skills?.length ? user.skills.join(', ') : 'Not set yet'}</span></div></div>
      <div><Icon name="sparkle" size={16} /><div><strong>Goals</strong><span>{user.goals?.length ? user.goals.join(' · ') : 'Not set yet'}</span></div></div>
      {joined(user.joinedAt) && <div><Icon name="calendar" size={16} /><div><strong>Joined</strong><span>{joined(user.joinedAt)}</span></div></div>}
    </section>
  )
}

// The VOIDAJ ID, right on the profile, as in the mockup.
function IdMini({ user, isMe }) {
  const [qr, setQr] = useState('')
  const url = `${window.location.origin}${user.handle ? `/u/${user.handle.replace(/^@/, '')}` : `/profile/${user.id}`}`
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1F3Bff', light: '#ffffffff' } }).then(setQr).catch(() => {})
  }, [url])
  const since = user.joinedAt ? new Date(user.joinedAt).getFullYear() : null
  const card = (
    <>
      <div className="idm-left">
        <span className="idm-label"><Icon name="badge-check" size={12} /> VOIDAJ ID</span>
        <VoidajMark size={14} light />
        <strong>{user.name}</strong>
        <span>{user.handle}{since ? ` · Member since ${since}` : ''}</span>
      </div>
      <div className="idm-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code to this profile" />
    </>
  )
  return isMe ? <Link to="/id" className="pf2-idcard">{card}</Link> : <div className="pf2-idcard">{card}</div>
}

function SavedTab() {
  const saved = useFavorites()
  if (!saved.length) return <p className="meta-dim">Nothing saved yet. Tap the bookmark on a post, event or person to keep it here.</p>
  return (
    <ul className="card pf-saved">
      {saved.map((f) => (
        <li key={`${f.kind}-${f.id}`}><Link to={f.href}><Icon name={{ post: 'chat', event: 'calendar', person: 'user', community: 'community', job: 'wrench' }[f.kind] ?? 'bookmark'} size={15} /><span><b>{f.title}</b>{f.subtitle && <em>{f.subtitle}</em>}</span></Link></li>
      ))}
    </ul>
  )
}

export default function Profile() {
  const { id: idParam, handle } = useParams()
  const { profile, user: me, loading, saveProfile, connect, follow } = useApp()
  const navigate = useNavigate()
  const key = handle ? `@${handle}` : idParam
  const isMe = key === 'me' || (!!me && (key === me.id || key?.toLowerCase() === me.handle?.toLowerCase()))
  const [person, setPerson] = useState(null)
  const [missing, setMissing] = useState(false)
  const [params, setParams] = useSearchParams()
  const visibleTabs = TABS.filter((t) => !t.mine || isMe)
  const tab = visibleTabs.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'posts'
  const setTab = (t) => setParams((p) => { t === 'posts' ? p.delete('tab') : p.set('tab', t); return p }, { replace: true })
  const { all: allCommunities } = useCommunities()
  const [list, setList] = useState(null)
  const [editing, setEditing] = useState(false)
  const [posts, setPosts] = useState(null)
  const [followers, setFollowers] = useState(null)

  const { voices, max } = useMyVoices(isMe && !loading && profile.onboarded)
  const [activeVoice, setActiveVoice] = useState('main')
  const picked = isMe ? voices.find((v) => v.id === activeVoice) : null
  const resolved = useResolvedVoice(picked?.handle)

  // Everyone's profile comes from the server: counts, activity, and (for
  // other people) only what their privacy settings allow.
  useEffect(() => {
    setPerson(null); setMissing(false); setFollowers(null)
    const target = isMe ? me?.id : key
    if (!target) return
    api.getUser(target).then(setPerson).catch(() => setMissing(true))
  }, [key, isMe, me?.id])
  useEffect(() => {
    setPosts(null)
    if (person?.id) api.listPosts({ author: person.id }).then(setPosts).catch(() => setPosts([]))
  }, [person?.id])

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
  const stats = user.stats ?? { connections: profile.connections.length, followers: 0, following: (profile.following ?? []).length, communities: profile.communities.length, events: 0, posts: 0, jobsPosted: 0, jobsDone: 0 }
  const seen = presenceText(user)
  const connected = !isMe && profile.connections.includes(user.id)
  const following = !isMe && (profile.following ?? []).includes(user.id)
  const memberOf = [...COMMUNITIES, ...allCommunities.filter((c) => !COMMUNITIES.some((s) => s.id === c.id))]
    .filter((c) => (user.communities ?? []).includes(c.id))
  const recentlyActive = user.active || (user.lastSeenAt && Date.now() - user.lastSeenAt < 7 * 24 * 3600 * 1000)
  const badges = [
    user.idVerified && { id: 'verified', icon: 'badge-check', label: 'Verified', tone: 'green', note: 'ID checked' },
    recentlyActive && { id: 'active', icon: 'zap', label: 'Active', tone: 'blue', note: 'Around this week' },
    stats.posts >= 5 && { id: 'top', icon: 'star', label: 'Top Contributor', tone: 'yellow', note: '5 or more posts' },
    (followers ?? stats.followers) >= 10 && { id: 'known', icon: 'users', label: 'Well Known', tone: 'violet', note: '10+ followers' },
    stats.communities >= 3 && { id: 'connector', icon: 'community', label: 'Connector', tone: 'teal', note: 'In 3+ communities' },
    user.jobSkills?.length > 0 && { id: 'pro', icon: 'wrench', label: OCCUPATIONS[user.jobSkills[0]]?.role ?? 'Pro', tone: 'orange', note: 'Does quick jobs' },
  ].filter(Boolean)
  const counts = [
    { id: 'posts', n: stats.posts, label: 'Posts', onClick: () => setTab('posts') },
    { id: 'followers', n: followers ?? stats.followers ?? 0, label: 'Followers', onClick: () => setList('followers') },
    { id: 'following', n: isMe ? (profile.following ?? []).length : (stats.following ?? 0), label: 'Following', onClick: () => setList('following') },
    { id: 'connections', n: isMe ? profile.connections.length : stats.connections, label: 'Connections', onClick: () => setList('connections') },
  ]
  const doFollow = async () => {
    if (!me) return navigate('/auth')
    const r = await follow(user.id).catch(() => null)
    if (r) setFollowers(r.followers)
  }

  return (
    <div className="page profile-page pf pf2">
      <div className="pf2-side">
      <section className="card pf2-hero">
        <Cover user={user} />
        {isMe && <button className="pf2-cover-edit" onClick={() => setEditing(true)} aria-label="Change cover photo"><Icon name="camera" size={15} /></button>}
        <div className="pf2-photo">
          <Avatar user={user} size={112} />
          {user.idVerified && <span className="pf-tick" title="ID verified"><Icon name="badge-check" size={18} /></span>}
        </div>
        <div className="pf2-id">
          <h1>{user.name} {isMe && <span className="you-badge">You</span>}</h1>
          <div className="pf-handle">{picked ? `@${picked.handle}` : user.handle}</div>
          {(picked?.headline || user.title) && <p className="pf-headline">{picked ? picked.headline || user.title : user.title}</p>}
          {user.bio && !picked && <p className="pf2-bio">{user.bio}</p>}
          <div className="pf-meta">
            <span><Icon name="map-pin" size={13} /> {locationFor(user, isMe)}</span>
            {joined(user.joinedAt) && <span><Icon name="calendar" size={13} /> Joined {joined(user.joinedAt)}</span>}
            {seen && <span className={`presence-text ${user.active ? 'on' : ''}`}>{user.active && <span className="presence-dot" aria-hidden="true" />}{seen}</span>}
          </div>
        </div>

        <div className="pf2-stats">
          {counts.map((c) => <button key={c.id} onClick={c.onClick}><b>{c.n >= 1000 ? `${(c.n / 1000).toFixed(1)}k` : c.n}</b><span>{c.label}</span></button>)}
        </div>

        <div className="pf2-actions">
          {isMe ? (
            <>
              <button type="button" className="btn primary" onClick={() => setEditing(true)}><Icon name="edit" size={15} /> Edit profile</button>
              <ShareButton user={user} />
              <Link to="/settings" className="btn ghost icon-only" aria-label="Settings"><Icon name="settings" size={16} /></Link>
            </>
          ) : (
            <>
              <button className={following ? 'btn ghost' : 'btn primary'} onClick={doFollow}>
                {following ? <><Icon name="check" size={15} /> Following</> : <><Icon name="user-plus" size={15} /> Follow</>}
              </button>
              <button className={`btn ${connected ? 'ghost connected' : 'ghost'}`} onClick={() => (me ? connect(user.id) : navigate('/auth'))}
                title={connected ? 'Remove from your connections' : 'Add to your connections — the people you pick out'}>
                <Icon name={connected ? 'user-check' : 'users'} size={15} /> {connected ? 'Connected' : 'Connect'}
              </button>
              <Link to={me ? `/chats?dm=${user.id}&from=profile` : '/auth'} className="btn ghost"><Icon name="message-circle" size={15} /> Message</Link>
              <FavoriteButton item={{ kind: 'person', id: user.id, title: user.name, subtitle: user.title, href: `/profile/${user.id}` }} />
            </>
          )}
        </div>

        {badges.length > 0 && (
          <div className="pf-badges">
            {badges.slice(0, 4).map((b) => (
              <span key={b.id} className={`pf2-badge itone-${b.tone}`} title={b.note}><Icon name={b.icon} size={13} /> {b.label}</span>
            ))}
          </div>
        )}
      </section>

      <IdMini user={user} isMe={isMe} />
      </div>

      <div className="pf2-content">
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
        <nav className="pf-tabs pf2-tabs" role="tablist" aria-label="Profile">
          {visibleTabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>

        {tab === 'posts' && (
          <div className="pf-panel feed-list">
            {posts === null && <p className="meta-dim">Loading…</p>}
            {posts?.length === 0 && <p className="meta-dim">{isMe ? <>You haven’t posted yet. <Link to="/add?pick=post">Share something</Link>.</> : 'No posts yet.'}</p>}
            {posts?.map((p) => <FeedPost key={p.id} post={p} />)}
          </div>
        )}

        {tab === 'about' && (
          <div className="pf-panel">
            <AboutSection bio={user.bio} socials={user.socials} editable={isMe} onSave={saveProfile} />
            <FactsCard user={user} isMe={isMe} />

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
            ) : <p className="meta-dim">{isMe ? <>You haven’t joined a community yet. <Link to="/communities">Find one</Link>.</> : 'No communities yet.'}</p>}
          </div>
        )}

        {tab === 'badges' && (
          <div className="pf-panel">
            <div className="pf2-badge-grid">
              {badges.length ? badges.map((b) => (
                <div key={b.id} className="card pf2-badge-card"><IconTile name={b.icon} tone={b.tone} size={46} /><b>{b.label}</b><span className="meta-dim">{b.note}</span></div>
              )) : <p className="meta-dim">No badges yet. Verify your ID, post, and join communities to earn them.</p>}
            </div>
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

        {tab === 'saved' && isMe && <div className="pf-panel"><SavedTab /></div>}
      </>}
      </div>

      {list && <PeopleSheet user={user} list={list} onList={setList} onClose={() => setList(null)} />}
      {editing && <EditSheet onClose={() => setEditing(false)} />}
    </div>
  )
}
