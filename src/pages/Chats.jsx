// Chats — Direct Messages (one-to-one) and Group Chats (private rooms).
// Deliberately separate from Communities: Communities are public forums
// with posts, threads and voting; Group Chats are private, member-only
// message streams with no voting or threading — closer to a chat app.
import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar } from '../components/bits.jsx'

function MessageList({ messages, meId }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  return (
    <div className="chat-thread">
      {messages.map((m) => {
        const mine = (m.fromId ?? m.author?.id) === meId
        return (
          <div key={m.id} className={`bubble-row ${mine ? 'user' : ''}`}>
            {!mine && <Avatar user={m.author ?? { name: '?', color: '#888' }} size={26} />}
            <div className={`bubble ${mine ? 'user' : 'ai'}`}>
              {m.author && !mine && <div className="chat-msg-name">{m.author.name}</div>}
              {m.body}
            </div>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}

function Composer({ onSend }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }
  return (
    <form className="assistant-input" onSubmit={submit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />
      <button className="icon-btn" type="submit" aria-label="Send"><Icon name="send" size={16} /></button>
    </form>
  )
}

function DirectMessages({ user, initialDm }) {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(initialDm || null)
  const [activeUser, setActiveUser] = useState(null)
  const [messages, setMessages] = useState([])

  const loadConversations = () => api.listConversations().then(setConversations).catch(() => {})
  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (!activeId) return
    api.getThread(activeId).then(({ other, messages }) => { setActiveUser(other); setMessages(messages) }).catch(() => {})
  }, [activeId])

  useEffect(() => {
    if (initialDm && !activeUser) api.getUser(initialDm).then(setActiveUser).catch(() => {})
  }, [initialDm]) // eslint-disable-line

  const send = async (body) => {
    const msg = await api.sendMessage(activeId, body)
    setMessages((m) => [...m, msg])
    loadConversations()
  }

  return (
    <div className={`chat-layout ${activeId ? 'has-active' : ''}`}>
      <div className="chat-list">
        {conversations.length === 0 && !activeId && (
          <p className="meta-dim" style={{ padding: 14 }}>No conversations yet. Message someone from their profile.</p>
        )}
        {conversations.map((c) => (
          <button key={c.other.id} className={`chat-list-item ${activeId === c.other.id ? 'active' : ''}`} onClick={() => setActiveId(c.other.id)}>
            <Avatar user={c.other} size={38} />
            <div className="chat-list-text">
              <div className="chat-list-name">{c.other.name} {c.unread > 0 && <span className="chat-unread-dot" />}</div>
              <div className="chat-list-preview">{c.lastMessage}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="chat-pane">
        {activeUser ? (
          <>
            <div className="chat-pane-head">
              <button className="icon-btn subtle chat-back" onClick={() => setActiveId(null)} aria-label="Back to conversations"><Icon name="back" size={16} /></button>
              <Avatar user={activeUser} size={32} />
              <strong>{activeUser.name}</strong>
              {activeUser.idVerified && <span className="verified-tag"><Icon name="badge-check" size={12} /> Verified</span>}
            </div>
            <MessageList messages={messages} meId={user.id} />
            <Composer onSend={send} />
          </>
        ) : (
          <div className="chat-empty"><Icon name="message-circle" size={30} /><p className="meta-dim">Select a conversation to start messaging.</p></div>
        )}
      </div>
    </div>
  )
}

function NewChatForm({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const chat = await api.createChat({ name: name.trim(), description: description.trim() })
      onCreated(chat); setName(''); setDescription(''); setOpen(false)
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  if (!open) return <button className="btn primary small" onClick={() => setOpen(true)}><Icon name="plus" size={14} /> New group chat</button>

  return (
    <form className="card composer-full" onSubmit={submit}>
      <input className="composer-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Group chat name" autoFocus />
      <input className="composer-body" style={{ resize: 'none' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's it for? (optional)" />
      <div className="composer-foot">
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn primary small" disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create'}</button>
      </div>
    </form>
  )
}

function GroupChats({ user }) {
  const [chats, setChats] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])

  const loadChats = () => api.listChats().then(setChats).catch(() => {})
  useEffect(() => { loadChats() }, [])

  useEffect(() => {
    if (!activeId) return
    api.listChatMessages(activeId).then(setMessages).catch(() => setMessages([]))
  }, [activeId])

  const active = chats.find((c) => c.id === activeId)

  const openChat = async (chat) => {
    if (!chat.joined) { const updated = await api.joinChat(chat.id); setChats((cs) => cs.map((c) => (c.id === chat.id ? updated : c))) }
    setActiveId(chat.id)
  }

  const send = async (body) => {
    const msg = await api.sendChatMessage(activeId, body)
    setMessages((m) => [...m, msg])
    loadChats()
  }

  return (
    <div className={`chat-layout ${activeId ? 'has-active' : ''}`}>
      <div className="chat-list">
        <div className="chat-list-toolbar"><NewChatForm onCreated={(c) => { setChats((cs) => [c, ...cs]); setActiveId(c.id) }} /></div>
        {chats.map((c) => (
          <button key={c.id} className={`chat-list-item ${activeId === c.id ? 'active' : ''}`} onClick={() => openChat(c)}>
            <div className="community-glyph" style={{ color: c.accent, width: 38, height: 38, borderRadius: '50%' }}><Icon name="message-circle" size={17} /></div>
            <div className="chat-list-text">
              <div className="chat-list-name">{c.name} {!c.joined && <span className="pill" style={{ marginLeft: 6 }}>Join</span>}</div>
              <div className="chat-list-preview">{c.lastMessage || c.description || `${c.memberCount} member${c.memberCount === 1 ? '' : 's'}`}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="chat-pane">
        {active ? (
          <>
            <div className="chat-pane-head">
              <button className="icon-btn subtle chat-back" onClick={() => setActiveId(null)} aria-label="Back to group chats"><Icon name="back" size={16} /></button>
              <div className="community-glyph" style={{ color: active.accent, width: 32, height: 32, borderRadius: '50%' }}><Icon name="message-circle" size={15} /></div>
              <strong>{active.name}</strong>
              <span className="meta-dim">· {active.memberCount} member{active.memberCount === 1 ? '' : 's'}</span>
            </div>
            <MessageList messages={messages} meId={user.id} />
            <Composer onSend={send} />
          </>
        ) : (
          <div className="chat-empty"><Icon name="community" size={30} /><p className="meta-dim">Select a group chat, or start a new one.</p></div>
        )}
      </div>
    </div>
  )
}

export default function Chats() {
  const { user, profile, loading } = useApp()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') === 'groups' ? 'groups' : 'direct')

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  if (!profile.onboarded) return <Navigate to="/welcome" replace />

  return (
    <div className="page chats-page">
      <section className="discover-hero">
        <h1><Icon name="chat" size={24} /> Chats</h1>
        <p className="meta-dim">Direct messages are one-to-one. Group chats are private rooms — separate from public Communities.</p>
      </section>

      <div className="tabs" role="tablist" style={{ marginTop: 18 }}>
        <button role="tab" aria-selected={tab === 'direct'} className={`tab ${tab === 'direct' ? 'active' : ''}`} onClick={() => setTab('direct')}>
          <Icon name="message-circle" size={15} /> Direct Messages
        </button>
        <button role="tab" aria-selected={tab === 'groups'} className={`tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
          <Icon name="community" size={15} /> Group Chats
        </button>
      </div>

      {tab === 'direct'
        ? <DirectMessages user={user} initialDm={params.get('dm')} />
        : <GroupChats user={user} />}
    </div>
  )
}
