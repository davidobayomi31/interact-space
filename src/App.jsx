import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './state.jsx'
import { Icon } from './components/Icons.jsx'
import { VoidajMark } from './components/VoidajMark.jsx'
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
import AddHub from './pages/AddHub.jsx'
import Notifications from './pages/Notifications.jsx'
import Settings from './pages/Settings.jsx'
import Favorites from './pages/Favorites.jsx'
import MyCity from './pages/MyCity.jsx'
import Admin from './pages/Admin.jsx'
import IdCard from './pages/IdCard.jsx'
import * as api from './api.js'

const IMMERSIVE = ['/welcome', '/auth']

// The five main places, as the VOIDAJ feature map sets them out. They run
// down the left side on larger screens and along the bottom on phones.
// Notifications, Chat and Profile are reachable from anywhere: top right on
// phones, at the foot of the side nav otherwise. Everything personal (Saved,
// My Jobs, Settings…) lives in the profile menu.
const PRIMARY = [
  { to: '/home', icon: 'home', label: 'Home', short: 'Home' },
  { to: '/explore', icon: 'search', label: 'Explore', short: 'Explore' },
  { to: '/city', icon: 'map-pin', label: 'My City', short: 'My City' },
  { to: '/jobs', icon: 'wrench', label: 'Quick Jobs', short: 'Jobs' },
  { to: '/add', icon: 'plus-circle', label: 'Add Hub', short: 'Add' },
]

// The phone's bottom bar, as on the VOIDAJ app screens. Quick Jobs and
// Add Hub stay one tap away in Home's shortcut tiles and quick actions.
const MOBILE = [
  { to: '/home', icon: 'home', short: 'Home' },
  { to: '/explore', icon: 'search', short: 'Explore' },
  { to: '/city', icon: 'map-pin', short: 'Map' },
  { to: '/chats', icon: 'message-circle', short: 'Messages' },
  { to: '/profile/me', icon: 'user', short: 'Profile' },
]

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
          <Link role="menuitem" to="/home"><Icon name="community" size={15} /> My Communities</Link>
          <Link role="menuitem" to="/jobs"><Icon name="briefcase" size={15} /> My Jobs</Link>
          <Link role="menuitem" to="/saved"><Icon name="heart" size={15} /> Saved</Link>
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
  const { user, setAssistantOpen } = useApp()
  const location = useLocation()
  const attention = useAttentionCount()
  if (IMMERSIVE.includes(location.pathname)) return null

  return (
    <header className="topbar">
      {/* On larger screens the brand sits at the top of the side nav. */}
      <Link to="/home" className="brand topbar-brand" aria-label="VOIDAJ home">
        <VoidajMark size={19} />
      </Link>

      <div className="topbar-right">
        <button className="btn brand-outline small" onClick={() => setAssistantOpen(true)}>
          <Eagle size={20} /> Companion
        </button>
        {user ? (
          <>
            <NavLink to="/notifications" className="icon-btn subtle bar-icon" aria-label={attention ? `Notifications, ${attention} new` : 'Notifications'}>
              <Icon name="bell" size={18} />
              {attention > 0 && <span className="bar-badge">{attention > 9 ? '9+' : attention}</span>}
            </NavLink>
            <NavLink to="/chats" className="icon-btn subtle bar-icon bar-chat" aria-label="Chat">
              <Icon name="message-circle" size={18} />
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
        <VoidajMark size={19} />
      </Link>
      <div className="sidenav-links">
        {PRIMARY.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} title={n.label}><Icon name={n.icon} size={18} /> <span>{n.label}</span></NavLink>
        ))}
      </div>
      <div className="sidenav-foot">
        <button className="btn brand-outline small sidenav-companion" onClick={() => setAssistantOpen(true)} title="Companion">
          <Eagle size={22} /> <span>Companion</span>
        </button>
        {user ? (
          <>
            <NavLink to="/notifications" title="Notifications" aria-label={attention ? `Notifications, ${attention} new` : 'Notifications'}>
              <span className="sidenav-icon"><Icon name="bell" size={18} />{attention > 0 && <b className="bar-badge">{attention > 9 ? '9+' : attention}</b>}</span>
              <span>Notifications</span>
            </NavLink>
            <NavLink to="/chats" title="Chat"><Icon name="message-circle" size={18} /> <span>Chat</span></NavLink>
            <NavLink to="/settings" title="Settings"><Icon name="edit" size={18} /> <span>Settings</span></NavLink>
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
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <nav className="mobile-nav" aria-label="Primary (mobile)">
      {MOBILE.map((n) => (
        <NavLink key={n.to} to={n.to}><Icon name={n.icon} size={21} /><span>{n.short}</span></NavLink>
      ))}
    </nav>
  )
}

function Footer() {
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <footer className="footer">
      <span className="footer-mark"><VoidajMark size={18} /></span>
      <div className="footer-text">
        <div className="footer-brand"><em>Interact Space</em></div>
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
