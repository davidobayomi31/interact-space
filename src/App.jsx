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

const IMMERSIVE = ['/welcome', '/auth']

function Header() {
  const { user, profile, logout, setAssistantOpen } = useApp()
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark"><VoidajMark size={22} /></span>
        <span className="brand-name">Voidaj <em>Interact Space</em></span>
      </Link>

      <nav className="topnav" aria-label="Primary">
        <NavLink to="/" end><Icon name="globe" size={16} /> The City</NavLink>
        {profile.onboarded && <NavLink to="/space"><Icon name="home" size={16} /> My Space</NavLink>}
        <NavLink to="/jobs"><Icon name="wrench" size={16} /> Jobs</NavLink>
        {profile.onboarded && <NavLink to="/chats"><Icon name="message-circle" size={16} /> Chats</NavLink>}
        {user?.moderatorOf?.length > 0 && <NavLink to="/mod"><Icon name="shield" size={16} /> Moderate</NavLink>}
      </nav>

      <div className="topbar-right">
        <button className="btn brand-outline small" onClick={() => setAssistantOpen(true)}>
          <Icon name="sparkle" size={15} /> Companion
        </button>
        {user ? (
          <>
            <Link to="/profile/me" className="me-chip" aria-label="My profile">
              <Avatar user={user} size={32} />
            </Link>
            <button className="icon-btn subtle" title="Sign out" onClick={logout} aria-label="Sign out">
              <Icon name="log-out" size={15} />
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn primary small">Join the city</Link>
        )}
      </div>
    </header>
  )
}

function MobileNav() {
  const { user, profile } = useApp()
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null
  return (
    <nav className="mobile-nav" aria-label="Primary (mobile)">
      <NavLink to="/" end><Icon name="globe" size={19} /><span>City</span></NavLink>
      <NavLink to="/jobs"><Icon name="wrench" size={19} /><span>Jobs</span></NavLink>
      <NavLink to={profile.onboarded ? '/chats' : user ? '/welcome' : '/auth'}><Icon name="message-circle" size={19} /><span>Chats</span></NavLink>
      {user
        ? <NavLink to={profile.onboarded ? '/space' : '/welcome'}><Icon name="home" size={19} /><span>Space</span></NavLink>
        : <NavLink to="/auth"><Icon name="user" size={19} /><span>Sign in</span></NavLink>}
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
              <Route path="/space" element={<MySpace />} />
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
