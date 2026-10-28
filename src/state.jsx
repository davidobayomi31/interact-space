// ── App state ────────────────────────────────────────────────────────
// Real authenticated user from the API (replaces the old localStorage
// profile). `user` is null when logged out; `profile` is a safe guest
// placeholder so public pages can render without an account.
import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api.js'

const AppContext = createContext(null)

const GUEST = {
  id: null, name: '', handle: '', title: '', city: 'Lagos', area: '', color: '#D8A63A',
  bio: '', interests: [], goals: [], skills: [], privacy: 'city-only',
  onboarded: false, communities: [], moderatorOf: [], connections: [],
}

const THEMES = ['system', 'light', 'dark']
function readTheme() {
  try { const t = localStorage.getItem('voidaj-theme'); return THEMES.includes(t) ? t : 'system' } catch { return 'system' }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [theme, setThemeState] = useState(readTheme)

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  // Accessibility preferences from Settings apply to the whole app.
  const prefs = user?.settings
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('pref-reduce-motion', !!prefs?.reduceMotion)
    root.classList.toggle('pref-large-text', !!prefs?.largeText)
  }, [prefs?.reduceMotion, prefs?.largeText])

  // Theme: 'system' follows the device; 'light' and 'dark' pin it. Kept on
  // this device (so it applies before sign-in and before the first paint,
  // see index.html) and in the member's settings (so it follows them).
  const savedTheme = user?.settings?.theme
  useEffect(() => { if (THEMES.includes(savedTheme)) setThemeState(savedTheme) }, [savedTheme])
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    try { localStorage.setItem('voidaj-theme', theme) } catch {}
    // data-mode is always the resolved look (light or dark), so newer
    // styles need one selector instead of a media query per rule.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { root.dataset.mode = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme }
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  const setTheme = async (t) => {
    setThemeState(t)
    if (user) { const u = await api.patchMe({ settings: { theme: t } }); setUser(u) }
  }

  const register = async (data) => { const u = await api.register(data); setUser(u); return u }
  const login = async (data) => { const u = await api.login(data); setUser(u); return u }
  const logout = async () => { await api.logout(); setUser(null) }
  const refreshMe = async () => { const u = await api.me(); setUser(u); return u }
  const saveProfile = async (patch) => { const u = await api.patchMe(patch); setUser(u); return u }

  const joinCommunity = async (id) => { const { user: u } = await api.joinCommunity(id); setUser(u) }
  const leaveCommunity = async (id) => { const { user: u } = await api.leaveCommunity(id); setUser(u) }
  const connect = async (id) => { const u = await api.connect(id); setUser(u) }

  const value = {
    user, setUser,
    profile: user ?? GUEST,
    loading,
    assistantOpen, setAssistantOpen,
    theme, setTheme,
    register, login, logout, refreshMe, saveProfile,
    joinCommunity, leaveCommunity, connect,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
