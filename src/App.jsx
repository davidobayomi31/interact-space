import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './state.jsx'
import { Icon } from './components/Icons.jsx'
import { VoidajMark } from './components/VoidajMark.jsx'
import { Avatar } from './components/bits.jsx'
import Assistant from './components/Assistant.jsx'
import { AdsRail } from './components/AdsRail.jsx'
import Arrival from './pages/Arrival.jsx'
import Onboarding from './pages/Onboarding.jsx'
import MySpace from './pages/MySpace.jsx'
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
import * as api from './api.js'

const IMMERSIVE = ['/welcome', '/auth']

// The five places a member moves between (see VOIDAJ-Blueprint.md §13).
// Notifications, Chat and Profile sit to the right, reachable from anywhere.
const PRIMARY = [
  { to: '/home', icon: 'home', label: 'Home', short: 'Home' },
  { to: '/explore', icon: 'search', label: 'Explore', short: 'Explore' },
  { to: '/', icon: 'map-pin', label: 'My City', short: 'City', end: true },
  { to: '/jobs', icon: 'wrench', label: 'Quick Jobs', short: 'Jobs' },
  { to: '/add', icon: 'plus-circle', label: 'Add Hub', short: 'Add' },
]

// Unread messages plus open reports for moderators — the bell's number.
function useAttentionCount() {
  const { user } = useApp()
  const location = useLocation()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!user) { setCount(0); return }
    const mod = user.moderatorOf?.length > 0
    Promise.all([
      api.listConversations().then((cs) => cs.reduce((n, c) => n + (c.unread || 0), 0)).catch(() => 0),
      mod ? api.modReports().then((d) => d.reports.filter((r) => r.status === 'open').length).catch(() => 0) : 0,
    ]).then(([dms, reports]) => setCount(dms + reports))
  }, [user, location.pathname])
  return count
}

function ProfileMenu() {
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
    <div className="profile-menu" ref={ref}>
      <button className="me-chip" aria-label="Profile menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar user={user} size={32} />
      </button>
      {open && (
        <div className="profile-menu-list" role="menu">
          <div className="profile-menu-head">
            <strong>{user.name}</strong>
            <span className="meta-dim">{user.handle}</span>
          </div>
          <Link role="menuitem" to="/profile/me"><Icon name="user" size={15} /> My Profile</Link>
          <Link role="menuitem" to="/home"><Icon name="community" size={15} /> My Communities</Link>
          <Link role="menuitem" to="/jobs"><Icon name="briefcase" size={15} /> My Jobs</Link>
          {user.moderatorOf?.length > 0 && <Link role="menuitem" to="/mod"><Icon name="shield" size={15} /> Moderation</Link>}
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
      <Link to="/" className="brand">
        <span className="brand-mark"><VoidajMark size={22} /></span>
        <span className="brand-name">Voidaj <em>Interact Space</em></span>
      </Link>

      <nav className="topnav" aria-label="Primary">
        {PRIMARY.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={16} /> {n.label}</NavLink>
        ))}
      </nav>

      <div className="topbar-right">
        <button className="btn brand-outline small" onClick={() => setAssistantOpen(true)}>
          <Icon name="sparkle" size={15} /> Companion
        </button>
        {user ? (
          <>
            <NavLink to="/notifications" className="icon-btn subtle bar-icon" aria-label={attention ? `Notifications, ${attention} new` : 'Notifications'}>
              <Icon name="bell" size={18} />
              {attention > 0 && <span className="bar-badge">{attention > 9 ? '9+' : attention}</span>}
            </NavLink>
            <NavLink to="/chats" className="icon-btn subtle bar-icon" aria-label="Chat">
              <Icon name="message-circle" size={18} />
            </NavLink>
            <ProfileMenu />
          </>
        ) : (
          <Link to="/auth" className="btn primary small">Join the city</Link>
        )}
      </div>
    </header>
  )
}

function MobileNav() {
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <nav className="mobile-nav" aria-label="Primary (mobile)">
      {PRIMARY.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={19} /><span>{n.short}</span></NavLink>
      ))}
    </nav>
  )
}

function Footer() {
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <footer className="footer">
      <span className="footer-mark"><VoidajMark size={30} /></span>
      <div className="footer-text">
        <div className="footer-brand">Voidaj <em>Interact Space</em></div>
        <div className="footer-line">People · Communities · Opportunities — the intelligent community network.</div>
      </div>
      <div className="footer-meta">A Mirac Inc prototype</div>
    </footer>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Header />
          <main className="main">
            <Routes>
              <Route path="/" element={<Arrival />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/welcome" element={<Onboarding />} />
              <Route path="/home" element={<MySpace />} />
              <Route path="/space" element={<Navigate to="/home" replace />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/add" element={<AddHub />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/communities/new" element={<NewCommunity />} />
              <Route path="/community/:id" element={<Community />} />
              <Route path="/post/:id" element={<Thread />} />
              <Route path="/v/:handle" element={<Voice />} />
              <Route path="/voices/new" element={<VoiceBuilder />} />
              <Route path="/voices/:id" element={<VoiceBuilder />} />
              <Route path="/mod" element={<Moderation />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/vision" element={<ProfileVision />} />
              {/* Unknown or retired paths (e.g. the old /discover) land in the city. */}
              <Route path="*" element={<Navigate to="/" replace />} />
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
