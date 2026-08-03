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

// Communities & people
export const listCommunities = () => req('/communities').then((d) => d.communities)
export const joinCommunity = (id) => req(`/communities/${id}/join`, { method: 'POST' })
export const leaveCommunity = (id) => req(`/communities/${id}/leave`, { method: 'POST' })
export const connect = (id) => req(`/users/${id}/connect`, { method: 'POST' }).then((d) => d.user)

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
export const resolveReport = (id, action) => req(`/reports/${id}/resolve`, { method: 'POST', body: { action } })

// Companion
export const companion = (message) => req('/companion', { method: 'POST', body: { message } })
