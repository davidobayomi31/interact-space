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

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assistantOpen, setAssistantOpen] = useState(false)

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

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
    register, login, logout, refreshMe, saveProfile,
    joinCommunity, leaveCommunity, connect,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
