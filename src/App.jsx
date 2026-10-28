import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './state.jsx'
import { Icon } from './components/Icons.jsx'
import { VoidajLockup } from './components/VoidajMark.jsx'
import { Eagle } from './components/Eagle.jsx'
import { Avatar } from './components/bits.jsx'
import Assistant from './components/Assistant.jsx'
import { AdsRail } from './components/AdsRail.jsx'
import Home from './pages/Home.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Community from './pages/Community.jsx'
import Profile from './pages/Profile.jsx'
import Thread from './pages/Thread.jsx'
import Auth from './pages/Auth.jsx'
import Moderation from './pages/Moderation.jsx'
import Jobs from './pages/Jobs.jsx'
import Chats from './pages/Chats.jsx'
import ProfileVision from './pages/ProfileVision.jsx'
import Voice from './pages/Voice.jsx'
import VoiceBuilder from './pages/VoiceBuilder.jsx'
import NewCommunity from './pages/NewCommunity.jsx'
import Explore from './pages/Explore.jsx'
import Communities from './pages/Communities.jsx'
import Events from './pages/Events.jsx'
import Business from './pages/Business.jsx'
import AddHub from './pages/AddHub.jsx'
import Notifications from './pages/Notifications.jsx'
import Settings from './pages/Settings.jsx'
import Favorites from './pages/Favorites.jsx'
import MyCity from './pages/MyCity.jsx'
import Admin from './pages/Admin.jsx'
import IdCard from './pages/IdCard.jsx'
import * as api from './api.js'

const IMMERSIVE = ['/welcome', '/auth']

// The main places, down the left side on larger screens. Every icon sits
// in the same glass tile; the page you're on gets the glossy brand fill
// (David, Oct 28: one colour, not a different one each). Add Hub is the
// gradient button beneath them.
const PRIMARY = [
  { to: '/home', icon: 'home', tone: 'blue', label: 'Home' },
  { to: '/explore', icon: 'compass', tone: 'violet', label: 'Explore' },
  { to: '/city', icon: 'map-pin', tone: 'teal', label: 'My City' },
  { to: '/events', icon: 'calendar', tone: 'pink', label: 'Events' },
  { to: '/jobs', icon: 'briefcase', tone: 'orange', label: 'Quick Jobs' },
  { to: '/communities', icon: 'users', tone: 'indigo', label: 'Communities' },
  { to: '/chats', icon: 'message-circle', tone: 'green', label: 'Chat', unread: true },
]

// The phone's bottom bar, as in the mockups: Home · Chat · (+) · Community
// · Profile, with Add Hub as the raised centre button. Explore, My City,
// Events and Quick Jobs are one tap away from Home.
const MOBILE = [
  { to: '/home', icon: 'home', short: 'Home' },
  { to: '/chats', icon: 'message-circle', short: 'Chat', unread: true },
  { to: '/add', icon: 'plus', short: 'Add Hub', center: true },
  { to: '/communities', icon: 'community', short: 'Community' },
  { to: '/profile/me', icon: 'user', short: 'Profile' },
]

// Unread direct messages — the number on Chat.
function useUnreadMessages() {
  const { user } = useApp()
  const location = useLocation()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!user) { setCount(0); return }
    api.listConversations().then((cs) => setCount(cs.reduce((n, c) => n + (c.unread || 0), 0))).catch(() => setCount(0))
  }, [user, location.pathname])
  return count
}

// Unread messages plus open reports for moderators — the bell's number.
function useAttentionCount() {
  const { user } = useApp()
  const location = useLocation()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!user) { setCount(0); return }
    const mod = user.moderatorOf?.length > 0
    const notify = user.settings?.notify ?? {}
    Promise.all([
      notify.messages !== false ? api.listConversations().then((cs) => cs.reduce((n, c) => n + (c.unread || 0), 0)).catch(() => 0) : 0,
      mod && notify.community !== false ? api.modReports().then((d) => d.reports.filter((r) => r.status === 'open').length).catch(() => 0) : 0,
    ]).then(([dms, reports]) => setCount(dms + reports))
  }, [user, location.pathname])
  return count
}

// `inSide` is the side nav version: the avatar sits beside the member's
// name and the menu opens upward from the foot of the nav.
function ProfileMenu({ inSide = false }) {
  const { user, logout } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div className={`profile-menu ${inSide ? 'in-side' : ''}`} ref={ref}>
      <button className="me-chip" aria-label="Profile menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} title={user.name}>
        <Avatar user={user} size={32} />
        {inSide && <span className="me-chip-name"><strong>{user.name}</strong><em>{user.handle}</em></span>}
      </button>
      {open && (
        <div className="profile-menu-list" role="menu">
          <div className="profile-menu-head">
            <strong>{user.name}</strong>
            <span className="meta-dim">{user.handle}</span>
          </div>
          <Link role="menuitem" to="/profile/me"><Icon name="user" size={15} /> My Profile</Link>
          <Link role="menuitem" to="/id"><Icon name="badge-check" size={15} /> VOIDAJ ID</Link>
          <Link role="menuitem" to="/communities?tab=mine"><Icon name="community" size={15} /> My Communities</Link>
          <Link role="menuitem" to="/jobs"><Icon name="briefcase" size={15} /> My Jobs</Link>
          <Link role="menuitem" to="/saved"><Icon name="bookmark" size={15} /> Saved</Link>
          {user.moderatorOf?.length > 0 && <Link role="menuitem" to="/mod"><Icon name="shield" size={15} /> Moderation</Link>}
          {user.isAdmin && <Link role="menuitem" to="/admin"><Icon name="lock" size={15} /> Admin</Link>}
          <Link role="menuitem" to="/settings"><Icon name="edit" size={15} /> Settings</Link>
          <button role="menuitem" onClick={logout}><Icon name="log-out" size={15} /> Sign out</button>
        </div>
      )}
    </div>
  )
}

function Header() {
  const { user } = useApp()
  const location = useLocation()
  const attention = useAttentionCount()
  if (IMMERSIVE.includes(location.pathname)) return null

  return (
    <header className="topbar">
      {/* On larger screens the brand sits at the top of the side nav. */}
      <Link to="/home" className="brand topbar-brand" aria-label="VOIDAJ home">
        <VoidajLockup size={16} />
      </Link>

      <div className="topbar-right">
        <NavLink to="/explore" className="icon-btn subtle bar-icon" aria-label="Search">
          <Icon name="search" size={19} />
        </NavLink>
        {user ? (
          <>
            <NavLink to="/notifications" className="icon-btn subtle bar-icon" aria-label={attention ? `Notifications, ${attention} new` : 'Notifications'}>
              <Icon name="bell" size={19} />
              {attention > 0 && <span className="bar-badge">{attention > 9 ? '9+' : attention}</span>}
            </NavLink>
            <ProfileMenu />
          </>
        ) : (
          <Link to="/auth" className="btn primary small">Step into VOIDAJ</Link>
        )}
      </div>
    </header>
  )
}

// The main places, down the left side of the screen from top to bottom,
// with the Companion, notifications, chat and the member's own menu at its
// foot. On larger screens this replaces the top bar; phones keep the top
// bar and use the bottom bar for the main places (MobileNav).
function SideNav() {
  const { user, setAssistantOpen } = useApp()
  const location = useLocation()
  const attention = useAttentionCount()
  const unread = useUnreadMessages()
  const hidden = IMMERSIVE.includes(location.pathname)

  // Like the ads rail, the page makes room for the nav rather than sliding under it.
  useEffect(() => {
    if (hidden) return
    document.body.classList.add('has-sidenav')
    return () => document.body.classList.remove('has-sidenav')
  }, [hidden])

  if (hidden) return null
  return (
    <nav className="sidenav" aria-label="Primary">
      <Link to="/home" className="brand sidenav-brand" aria-label="VOIDAJ home">
        <VoidajLockup size={16} />
      </Link>
      <div className="sidenav-links">
        {PRIMARY.map((n) => (
          <NavLink key={n.to} to={n.to} title={n.label} className={`nav-${n.tone}`}>
            <span className="sidenav-icon">
              <span className="snav-ico"><Icon name={n.icon} size={17} /></span>
              {n.unread && unread > 0 && <b className="bar-badge">{unread > 9 ? '9+' : unread}</b>}
            </span>
            <span>{n.label}</span>
          </NavLink>
        ))}
        <NavLink to="/add" className="sidenav-add" title="Add Hub">
          <span className="sidenav-add-plus"><Icon name="plus" size={18} /></span><span>Add Hub</span>
        </NavLink>
      </div>
      <div className="sidenav-foot">
        <button className="sidenav-companion" onClick={() => setAssistantOpen(true)} title="Companion">
          <Eagle size={24} /> <span>Companion</span>
        </button>
        {user ? (
          <>
            <NavLink to="/notifications" title="Notifications" aria-label={attention ? `Notifications, ${attention} new` : 'Notifications'}>
              <span className="sidenav-icon"><Icon name="bell" size={18} />{attention > 0 && <b className="bar-badge">{attention > 9 ? '9+' : attention}</b>}</span>
              <span>Notifications</span>
            </NavLink>
            <NavLink to="/settings" title="Settings"><Icon name="settings" size={18} /> <span>Settings</span></NavLink>
            <ProfileMenu inSide />
          </>
        ) : (
          <Link to="/auth" className="btn primary small sidenav-join">Step into VOIDAJ</Link>
        )}
      </div>
    </nav>
  )
}

function MobileNav() {
  const location = useLocation()
  const unread = useUnreadMessages()
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <nav className="mobile-nav" aria-label="Primary (mobile)">
      {MOBILE.map((n) => n.center ? (
        <NavLink key={n.to} to={n.to} className="mobile-nav-add" aria-label={n.short}>
          <span className="mobile-nav-plus"><Icon name="plus" size={24} /></span><span>{n.short}</span>
        </NavLink>
      ) : (
        <NavLink key={n.to} to={n.to}>
          <span className="mobile-nav-icon"><Icon name={n.icon} size={21} />{n.unread && unread > 0 && <b className="bar-badge">{unread > 9 ? '9+' : unread}</b>}</span>
          <span>{n.short}</span>
        </NavLink>
      ))}
    </nav>
  )
}


function Footer() {
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <footer className="footer">
      <span className="footer-mark"><VoidajLockup size={16} /></span>
      <div className="footer-text">
        <div className="footer-brand"><em>Connect. Discover. Participate.</em></div>
        <div className="footer-line">People · Communities · Opportunities — the intelligent community network.</div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-shell">
          <SideNav />
          <Header />
          <main className="main">
            <Routes>
              {/* My City merged into Home; the old address lands there. */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/welcome" element={<Onboarding />} />
              <Route path="/home" element={<Home />} />
              <Route path="/space" element={<Navigate to="/home" replace />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/events" element={<Events />} />
              <Route path="/business/:id" element={<Business />} />
              <Route path="/add" element={<AddHub />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:section" element={<Settings />} />
              <Route path="/saved" element={<Favorites />} />
              <Route path="/favorites" element={<Navigate to="/saved" replace />} />
              <Route path="/city" element={<MyCity />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/communities/new" element={<NewCommunity />} />
              <Route path="/community/:id" element={<Community />} />
              <Route path="/post/:id" element={<Thread />} />
              <Route path="/v/:handle" element={<Voice />} />
              <Route path="/voices/new" element={<VoiceBuilder />} />
              <Route path="/voices/:id" element={<VoiceBuilder />} />
              <Route path="/mod" element={<Moderation />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/u/:handle" element={<Profile />} />
              <Route path="/id" element={<IdCard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/vision" element={<ProfileVision />} />
              {/* Unknown or retired paths (e.g. the old /discover) land on Home. */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </main>
          <Footer />
          <AdsRail />
          <Assistant />
          <MobileNav />
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
