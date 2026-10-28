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
// Settings
export const changeEmail = (email, password) => req('/auth/email', { method: 'POST', body: { email, password } }).then((d) => d.user)
export const changePassword = (current, next) => req('/auth/password', { method: 'POST', body: { current, next } })
export const listLogins = () => req('/auth/sessions').then((d) => d.logins)
export const logoutOthers = () => req('/auth/logout-others', { method: 'POST' })
export const deleteAccount = (password) => req('/auth/me', { method: 'DELETE', body: { password } })
export const sendSupport = (body) => req('/support', { method: 'POST', body })
export const exportUrl = '/api/me/export'
export const adminUsers = () => req('/admin/users').then((d) => d.users)
export const adminUsersCsvUrl = '/api/admin/users.csv'
export const adminAccounts = () => req('/admin/accounts').then((d) => d.accounts)
export const addAdminAccount = (body) => req('/admin/accounts', { method: 'POST', body }).then((d) => d.account)
export const saveAdminAccount = (id, body) => req(`/admin/accounts/${id}`, { method: 'PATCH', body }).then((d) => d.account)
export const deleteAdminAccount = (id) => req(`/admin/accounts/${id}`, { method: 'DELETE' })
export const verifyId = (idNumber) => req('/auth/verify-id', { method: 'POST', body: { idNumber } }).then((d) => d.user)

// Communities & people
export const listCommunities = () => req('/communities').then((d) => d.communities)
export const getCommunity = (id) => req(`/communities/${id}`).then((d) => d.community)
export const joinCommunity = (id) => req(`/communities/${id}/join`, { method: 'POST' })
export const leaveCommunity = (id) => req(`/communities/${id}/leave`, { method: 'POST' })
export const connect = (id) => req(`/users/${id}/connect`, { method: 'POST' }).then((d) => d.user)
export const follow = (id) => req(`/users/${id}/follow`, { method: 'POST' })
export const people = (id, list) => req(`/users/${id}/people?list=${list}`).then((d) => d.people)
export const getUser = (id) => req(`/users/${id}`).then((d) => d.user)
export const createCommunity = (body) => req('/communities', { method: 'POST', body })
export const setModRules = (id, rules) => req(`/communities/${id}/mod-rules`, { method: 'PUT', body: { rules } }).then((d) => d.community)

// Events members create (the seeded demo events live in data/seed.js)
export const listEvents = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return req('/events' + (q ? `?${q}` : '')).then((d) => d.events)
}
export const listRsvps = () => req('/rsvps')
export const socialNotifications = () => req('/notifications')
export const rsvp = (id) => req(`/events/${id}/rsvp`, { method: 'POST' })
export const uploadImage = (image, kind) => req('/uploads', { method: 'POST', body: { image, kind } }).then((d) => d.url)
export const setCommunityCover = (id, cover) => req(`/communities/${id}/cover`, { method: 'PUT', body: { cover } }).then((d) => d.community)
export const createEvent = (communityId, body) => req(`/communities/${communityId}/events`, { method: 'POST', body }).then((d) => d.event)

// Posts, comments, votes
export const listPosts = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return req('/posts' + (q ? `?${q}` : '')).then((d) => d.posts)
}
export const createPost = (body) => req('/posts', { method: 'POST', body }).then((d) => d.post)
export const feed = (tab = 'foryou') => req(`/feed?tab=${tab}`).then((d) => d.posts)
export const listStatuses = () => req('/statuses').then((d) => d.groups)
export const postStatus = (body) => req('/statuses', { method: 'POST', body })
export const viewStatus = (id) => req(`/statuses/${id}/view`, { method: 'POST' })
export const deleteStatus = (id) => req(`/statuses/${id}`, { method: 'DELETE' })
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
export const listPros = () => req('/pros').then((d) => d.pros)
export const listJobs = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return req('/jobs' + (q ? `?${q}` : '')).then((d) => d.jobs)
}
export const createJob = (body) => req('/jobs', { method: 'POST', body }).then((d) => d.job)
export const makeOffer = (id, offer, note) => req(`/jobs/${id}/offer`, { method: 'POST', body: { offer, note } }).then((d) => d.job)
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
export const sendMessage = (userId, body, media = [], context = null) => req(`/messages/${userId}`, { method: 'POST', body: { body, media, context } }).then((d) => d.message)

// Group chats
export const listChats = () => req('/chats').then((d) => d.chats)
export const createChat = (body) => req('/chats', { method: 'POST', body }).then((d) => d.chat)
export const joinChat = (id) => req(`/chats/${id}/join`, { method: 'POST' }).then((d) => d.chat)
export const listChatMessages = (id) => req(`/chats/${id}/messages`).then((d) => d.messages)
export const sendChatMessage = (id, body, media = []) => req(`/chats/${id}/messages`, { method: 'POST', body: { body, media } }).then((d) => d.message)

// Ads
export const listAds = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  return req(`/ads${qs ? `?${qs}` : ''}`).then((d) => d.ads)
}
export const getAd = (id) => req(`/ads/${id}`).then((d) => d.ad)
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
