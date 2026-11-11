// Direct messages, "who can message me", and group chats. These guard the
// privacy rules: a member who only takes messages from connections (or
// from nobody) can't be messaged cold, and group chats are members-only.
import { describe, expect, it } from 'vitest'
import { signUp } from './helpers.js'

const setMessages = (agent, messages) => agent.patch('/api/auth/me').send({ settings: { messages } })

describe('direct messages', () => {
  it('delivers a message and marks it read when the other person opens the thread', async () => {
    const ada = await signUp('Ada Sender')
    const bo = await signUp('Bo Receiver')
    const sent = await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: 'Hi Bo' })
    expect(sent.status).toBe(200)
    expect(sent.body.message.body).toBe('Hi Bo')

    const inbox = (await bo.agent.get('/api/messages')).body.conversations
    const convo = inbox.find((c) => c.other.id === ada.user.id)
    expect(convo).toMatchObject({ lastMessage: 'Hi Bo', unread: 1, request: true })

    const thread = await bo.agent.get(`/api/messages/${ada.user.id}`)
    expect(thread.body.messages.map((m) => m.body)).toEqual(['Hi Bo'])
    const after = (await bo.agent.get('/api/messages')).body.conversations.find((c) => c.other.id === ada.user.id)
    expect(after.unread).toBe(0)
  })

  it('refuses an empty message and an unknown recipient', async () => {
    const ada = await signUp()
    const bo = await signUp()
    expect((await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: '   ' })).status).toBe(400)
    expect((await ada.agent.post('/api/messages/u-does-not-exist').send({ body: 'hi' })).status).toBe(404)
  })

  it('needs you to be signed in', async () => {
    const bo = await signUp()
    const { request, app } = await import('./helpers.js')
    expect((await request(app).post(`/api/messages/${bo.user.id}`).send({ body: 'hi' })).status).toBe(401)
  })

  it('respects "nobody": no new conversations', async () => {
    const ada = await signUp()
    const bo = await signUp('Bo Private')
    await setMessages(bo.agent, 'nobody')
    const res = await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: 'hello?' })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/isn’t taking new messages/)
  })

  it('respects "connections only" until you are connected', async () => {
    const ada = await signUp()
    const bo = await signUp('Bo Connections')
    await setMessages(bo.agent, 'connections')
    expect((await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: 'cold' })).status).toBe(403)
    await ada.agent.post(`/api/users/${bo.user.id}/connect`)
    expect((await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: 'now connected' })).status).toBe(200)
  })

  it('keeps an existing conversation open after the recipient tightens their setting', async () => {
    const ada = await signUp()
    const bo = await signUp()
    await bo.agent.post(`/api/messages/${ada.user.id}`).send({ body: 'Bo wrote first' })
    await setMessages(bo.agent, 'nobody')
    expect((await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: 'reply' })).status).toBe(200)
  })

  it('takes a job as context from the database, not from the client', async () => {
    const poster = await signUp('Job Poster')
    const asker = await signUp()
    const job = (await poster.agent.post('/api/jobs').send({ title: 'Fix a gate', category: 'Repairs', budget: '₦8,000' })).body.job
    const res = await asker.agent.post(`/api/messages/${poster.user.id}`)
      .send({ body: 'Is this still open?', context: { kind: 'job', id: job.id, title: 'FAKE TITLE' } })
    expect(res.status).toBe(200)
    expect(res.body.message.context).toMatchObject({ kind: 'job', id: job.id, title: 'Fix a gate' })
  })

  it('drops a context that points at nothing', async () => {
    const ada = await signUp()
    const bo = await signUp()
    const res = await ada.agent.post(`/api/messages/${bo.user.id}`).send({ body: 'hi', context: { kind: 'job', id: 'j-missing' } })
    expect(res.status).toBe(200)
    expect(res.body.message.context ?? null).toBeNull()
  })
})

describe('group chats', () => {
  it('lets the creator post, and keeps non-members out until they join', async () => {
    const owner = await signUp('Chat Owner')
    const other = await signUp('Chat Visitor')
    const chat = (await owner.agent.post('/api/chats').send({ name: 'Yaba builders' })).body.chat
    expect(chat.name).toBe('Yaba builders')

    expect((await owner.agent.post(`/api/chats/${chat.id}/messages`).send({ body: 'Welcome' })).status).toBe(200)
    expect((await other.agent.get(`/api/chats/${chat.id}/messages`)).status).toBe(403)
    expect((await other.agent.post(`/api/chats/${chat.id}/messages`).send({ body: 'let me in' })).status).toBe(403)

    expect((await other.agent.post(`/api/chats/${chat.id}/join`)).status).toBe(200)
    const msgs = (await other.agent.get(`/api/chats/${chat.id}/messages`)).body.messages
    expect(msgs.map((m) => m.body)).toEqual(['Welcome'])
  })

  it('joining a chat you are already in is harmless', async () => {
    const owner = await signUp()
    const chat = (await owner.agent.post('/api/chats').send({ name: 'Twice' })).body.chat
    const again = await owner.agent.post(`/api/chats/${chat.id}/join`)
    expect(again.status).toBe(200)
  })

  it('needs a name, and 404s for a chat that does not exist', async () => {
    const owner = await signUp()
    expect((await owner.agent.post('/api/chats').send({ name: '  ' })).status).toBe(400)
    expect((await owner.agent.post('/api/chats/gc-missing/join')).status).toBe(404)
  })
})

describe('notifications', () => {
  it('lists new followers and replies to your posts, not your own replies', async () => {
    const author = await signUp('Post Author')
    const fan = await signUp('Fan')
    const post = (await author.agent.post('/api/posts').send({ audience: 'public', body: 'Hello Lagos' })).body.post
    await fan.agent.post(`/api/users/${author.user.id}/follow`)
    await fan.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'Welcome!' })
    await author.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'Thanks' })

    const n = (await author.agent.get('/api/notifications')).body
    expect(n.followers.map((f) => f.user.id)).toContain(fan.user.id)
    expect(n.comments.map((c) => c.text)).toEqual(['Welcome!'])
  })
})
