// ── Frontend API client ──────────────────────────────────────────────
// Thin fetch wrapper around the Express API in server/. Vite proxies
// /api/* to http://localhost:8787 in dev (see vite.config.js).
async function req(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong.')
  return data
}

// Auth
export const me = () => req('/auth/me').then((d) => d.user)
export const register = (body) => req('/auth/register', { method: 'POST', body }).then((d) => d.user)
export const login = (body) => req('/auth/login', { method: 'POST', body }).then((d) => d.user)
export const logout = () => req('/auth/logout', { method: 'POST' })
export const patchMe = (body) => req('/auth/me', { method: 'PATCH', body }).then((d) => d.user)
export const verifyId = (idNumber) => req('/auth/verify-id', { method: 'POST', body: { idNumber } }).then((d) => d.user)

// Communities & people
export const listCommunities = () => req('/communities').then((d) => d.communities)
export const getCommunity = (id) => req(`/communities/${id}`).then((d) => d.community)
export const joinCommunity = (id) => req(`/communities/${id}/join`, { method: 'POST' })
export const leaveCommunity = (id) => req(`/communities/${id}/leave`, { method: 'POST' })
export const connect = (id) => req(`/users/${id}/connect`, { method: 'POST' }).then((d) => d.user)
export const getUser = (id) => req(`/users/${id}`).then((d) => d.user)
export const createCommunity = (body) => req('/communities', { method: 'POST', body })
export const setModRules = (id, rules) => req(`/communities/${id}/mod-rules`, { method: 'PUT', body: { rules } }).then((d) => d.community)

// Events members create (the seeded demo events live in data/seed.js)
export const listEvents = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return req('/events' + (q ? `?${q}` : '')).then((d) => d.events)
}
export const createEvent = (communityId, body) => req(`/communities/${communityId}/events`, { method: 'POST', body }).then((d) => d.event)

// Posts, comments, votes
export const listPosts = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return req('/posts' + (q ? `?${q}` : '')).then((d) => d.posts)
}
export const createPost = (body) => req('/posts', { method: 'POST', body }).then((d) => d.post)
export const getPost = (id) => req(`/posts/${id}`)
export const addComment = (postId, body) => req(`/posts/${postId}/comments`, { method: 'POST', body })
export const vote = (targetType, targetId, value) =>
  req('/vote', { method: 'POST', body: { targetType, targetId, value } })

// Reporting & moderation
export const report = (targetType, targetId, reason) =>
  req('/reports', { method: 'POST', body: { targetType, targetId, reason } })
export const modReports = () => req('/mod/reports')
export const modDashboard = () => req('/mod/dashboard')
export const modHistory = () => req('/mod/history').then((d) => d.entries)
export const setRole = (communityId, userId, role) => req(`/communities/${communityId}/roles`, { method: 'POST', body: { userId, role } })
export const resolveReport = (id, action) => req(`/reports/${id}/resolve`, { method: 'POST', body: { action } })

// Community ratings
export const rateCommunity = (id, stars, review) => req(`/communities/${id}/rate`, { method: 'POST', body: { stars, review } })

// Quick Jobs
export const listJobs = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return req('/jobs' + (q ? `?${q}` : '')).then((d) => d.jobs)
}
export const createJob = (body) => req('/jobs', { method: 'POST', body }).then((d) => d.job)
export const toggleJobInterest = (id) => req(`/jobs/${id}/interest`, { method: 'POST' }).then((d) => d.job)

// Job history — the applicant's own tracker
export const myJobs = () => req('/me/jobs')
export const updateApplication = (jobId, body) => req(`/jobs/${jobId}/application`, { method: 'PATCH', body })

// Voices — extra, separately shareable versions of a profile
export const listVoices = () => req('/voices')
export const createVoice = (body) => req('/voices', { method: 'POST', body }).then((d) => d.voice)
export const updateVoice = (id, body) => req(`/voices/${id}`, { method: 'PATCH', body }).then((d) => d.voice)
export const deleteVoice = (id) => req(`/voices/${id}`, { method: 'DELETE' })
export const getVoice = (handle) => req(`/v/${encodeURIComponent(handle)}`)

// Direct messages
export const listConversations = () => req('/messages').then((d) => d.conversations)
export const getThread = (userId) => req(`/messages/${userId}`)
export const sendMessage = (userId, body) => req(`/messages/${userId}`, { method: 'POST', body: { body } }).then((d) => d.message)

// Group chats
export const listChats = () => req('/chats').then((d) => d.chats)
export const createChat = (body) => req('/chats', { method: 'POST', body }).then((d) => d.chat)
export const joinChat = (id) => req(`/chats/${id}/join`, { method: 'POST' }).then((d) => d.chat)
export const listChatMessages = (id) => req(`/chats/${id}/messages`).then((d) => d.messages)
export const sendChatMessage = (id, body) => req(`/chats/${id}/messages`, { method: 'POST', body: { body } }).then((d) => d.message)

// Ads
export const listAds = () => req('/ads').then((d) => d.ads)
export const listMyAds = () => req('/ads/mine').then((d) => d.ads)
export const createAd = (body) => req('/ads', { method: 'POST', body }).then((d) => d.ad)
export const payForAd = (id) => req(`/ads/${id}/pay`, { method: 'POST' }).then((d) => d.ad)

// Live streaming
export const listLive = () => req('/live').then((d) => d.streams)
export const getCommunityLive = (id) => req(`/communities/${id}/live`).then((d) => d.stream)
export const startLive = (communityId, title) => req(`/communities/${communityId}/live/start`, { method: 'POST', body: { title } }).then((d) => d.stream)
export const stopLive = (id) => req(`/live/${id}/stop`, { method: 'POST' })

// Companion
export const companion = (message) => req('/companion', { method: 'POST', body: { message } })
