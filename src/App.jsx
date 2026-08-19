import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './state.jsx'
import { Icon } from './components/Icons.jsx'
import { Avatar } from './components/bits.jsx'
import Assistant from './components/Assistant.jsx'
import { AdsRail } from './components/AdsRail.jsx'
import Arrival from './pages/Arrival.jsx'
import Onboarding from './pages/Onboarding.jsx'
import MySpace from './pages/MySpace.jsx'
import Community from './pages/Community.jsx'
import Discover from './pages/Discover.jsx'
import Profile from './pages/Profile.jsx'
import Thread from './pages/Thread.jsx'
import Auth from './pages/Auth.jsx'
import Moderation from './pages/Moderation.jsx'
import Jobs from './pages/Jobs.jsx'
import Chats from './pages/Chats.jsx'
import ProfileVision from './pages/ProfileVision.jsx'

const IMMERSIVE = ['/welcome', '/auth']

function Header() {
  const { user, profile, logout, setAssistantOpen } = useApp()
  const location = useLocation()
  if (IMMERSIVE.includes(location.pathname)) return null

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark"><Icon name="globe" size={18} /></span>
        <span className="brand-name">Interact <em>Space</em></span>
      </Link>

      <nav className="topnav" aria-label="Primary">
        <NavLink to="/" end><Icon name="globe" size={16} /> The City</NavLink>
        {profile.onboarded && <NavLink to="/space"><Icon name="home" size={16} /> My Space</NavLink>}
        <NavLink to="/discover"><Icon name="compass" size={16} /> Discover</NavLink>
        <NavLink to="/jobs"><Icon name="wrench" size={16} /> Jobs</NavLink>
        {profile.onboarded && <NavLink to="/chats"><Icon name="message-circle" size={16} /> Chats</NavLink>}
        {user?.moderatorOf?.length > 0 && <NavLink to="/mod"><Icon name="shield" size={16} /> Moderate</NavLink>}
      </nav>

      <div className="topbar-right">
        <button className="btn gold-outline small" onClick={() => setAssistantOpen(true)}>
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
      <NavLink to="/discover"><Icon name="compass" size={19} /><span>Discover</span></NavLink>
      <NavLink to="/jobs"><Icon name="wrench" size={19} /><span>Jobs</span></NavLink>
      {profile.onboarded
        ? <NavLink to="/chats"><Icon name="message-circle" size={19} /><span>Chats</span></NavLink>
        : <NavLink to="/discover"><Icon name="message-circle" size={19} /><span>Chats</span></NavLink>}
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
      <img src="/mirac-logo.jpg" alt="Mirac Inc" className="footer-logo" />
      <div>
        <div className="footer-brand">Interact Space — a Mirac Inc prototype</div>
        <div className="meta-dim">People · Communities · Opportunities. The Intelligent Community Network.</div>
      </div>
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
              <Route path="/discover" element={<Discover />} />
              <Route path="/mod" element={<Moderation />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/vision" element={<ProfileVision />} />
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
