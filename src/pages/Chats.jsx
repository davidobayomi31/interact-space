// Chats — Direct Messages (one-to-one) and Group Chats (private rooms),
// laid out as a familiar two-pane inbox: conversations on the left, the
// open thread on the right. Group chats stay separate from Communities:
// Communities are public forums with posts and voting; groups here are
// private, member-only message streams.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { USERS } from '../data/seed.js'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'

// ── Helpers ────────────────────────────────────────────────────────────
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR
// "now", "5m", "3h", "2d", "1w" — the compact form inbox lists use.
function shortAgo(t) {
  const d = Date.now() - t
  if (d < MIN) return 'now'
  if (d < HOUR) return `${Math.floor(d / MIN)}m`
  if (d < DAY) return `${Math.floor(d / HOUR)}h`
  if (d < 7 * DAY) return `${Math.floor(d / DAY)}d`
  return `${Math.floor(d / (7 * DAY))}w`
}
// Divider label between message groups.
function stamp(t) {
  const d = new Date(t), today = new Date()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return time
  if (Date.now() - t < 7 * DAY) return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`
}
const initials = (name = '?') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function Face({ user, size = 44, group }) {
  return (
    <span className="dm-face" style={{ width: size, height: size, fontSize: size * 0.36, '--c': user?.color || user?.accent || '#8a8177' }}>
      {group ? <Icon name="users" size={Math.round(size * 0.42)} /> : initials(user?.name)}
    </span>
  )
}

// Consecutive messages from one sender within 5 minutes form a group; a
// time divider appears when an hour or more has passed.
function buildRows(messages, meId) {
  const rows = []
  messages.forEach((m, i) => {
    const prev = messages[i - 1], next = messages[i + 1]
    const sender = m.fromId ?? m.author?.id
    const prevSender = prev && (prev.fromId ?? prev.author?.id)
    const nextSender = next && (next.fromId ?? next.author?.id)
    if (!prev || m.createdAt - prev.createdAt >= HOUR) rows.push({ kind: 'stamp', id: `s-${m.id}`, at: m.createdAt })
    const joinsPrev = prev && prevSender === sender && m.createdAt - prev.createdAt < 5 * MIN
    const joinsNext = next && nextSender === sender && next.createdAt - m.createdAt < 5 * MIN
    rows.push({ kind: 'msg', id: m.id, m, mine: sender === meId, first: !joinsPrev, last: !joinsNext })
  })
  return rows
}

// ── Thread ─────────────────────────────────────────────────────────────
function Thread({ messages, meId, other, isGroup, intro }) {
  const boxRef = useRef(null)
  // Open on the newest message. scrollIntoView was swallowed by the site's
  // smooth scrolling; setting the container's own scrollTop before paint isn't.
  useLayoutEffect(() => {
    const box = boxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [messages.length])
  const rows = useMemo(() => buildRows(messages, meId), [messages, meId])
  const lastMine = [...messages].reverse().find((m) => (m.fromId ?? m.author?.id) === meId)

  return (
    <div className="dm-thread" ref={boxRef}>
      {intro}
      {rows.map((r) => {
        if (r.kind === 'stamp') return <div key={r.id} className="dm-stamp">{stamp(r.at)}</div>
        const { m, mine, first, last } = r
        const author = m.author ?? other
        return (
          <div key={r.id} className={`dm-row ${mine ? 'mine' : 'theirs'} ${first ? 'first' : ''} ${last ? 'last' : ''}`}>
            {!mine && <span className="dm-row-face">{last && <Face user={author} size={28} />}</span>}
            <div className="dm-bubble-col">
              {isGroup && !mine && first && <span className="dm-sender">{author?.name}</span>}
              <div className="dm-bubble" title={stamp(m.createdAt)}>{m.body}</div>
            </div>
          </div>
        )
      })}
      {!isGroup && lastMine?.read && <div className="dm-seen">Seen</div>}
    </div>
  )
}

function Composer({ onSend, placeholder = 'Message…' }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const submit = (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    onSend(body)
    setText('')
    inputRef.current?.focus()
  }
  return (
    <form className="dm-composer" onSubmit={submit}>
      <div className="dm-composer-pill">
        <Icon name="smile" size={22} />
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Message" />
        {text.trim()
          ? <button type="submit" className="dm-send">Send</button>
          : <span className="dm-composer-icons" aria-hidden="true"><Icon name="image" size={21} /></span>}
      </div>
    </form>
  )
}

// ── New message picker ──────────────────────────────────────────────────
function NewMessage({ profile, onPick, onClose }) {
  const [q, setQ] = useState('')
  // People you're connected to first, then everyone else in the city.
  const people = useMemo(() => {
    const conn = new Set(profile.connections)
    return USERS.filter((u) => u.id !== profile.id)
      .sort((a, b) => Number(conn.has(b.id)) - Number(conn.has(a.id)))
      .filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
      .map((u) => ({ ...u, connected: conn.has(u.id) }))
  }, [q, profile])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="dm-modal" role="dialog" aria-label="New message" onClick={(e) => e.stopPropagation()}>
        <div className="dm-modal-head">
          <span />
          <strong>New message</strong>
          <button className="dm-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
        </div>
        <label className="dm-modal-search">
          <span>To:</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </label>
        <div className="dm-modal-list">
          {people.length === 0 && <p className="dm-muted" style={{ padding: 16 }}>No one found.</p>}
          {people.map((u) => (
            <button key={u.id} className="dm-person" onClick={() => onPick(u.id)}>
              <Face user={u} size={44} />
              <span className="dm-person-text">
                <strong>{u.name}</strong>
                <span className="dm-muted">{u.connected ? 'Connected' : u.title}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Inbox ──────────────────────────────────────────────────────────────
export default function Chats() {
  const { user, profile, loading } = useApp()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') === 'groups' ? 'groups' : 'direct')
  const [conversations, setConversations] = useState([])
  const [chats, setChats] = useState([])
  const [activeDm, setActiveDm] = useState(params.get('dm') || null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [dmUser, setDmUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [composing, setComposing] = useState(false)
  const [newGroup, setNewGroup] = useState(false)
  const [groupName, setGroupName] = useState('')

  const loadConversations = () => api.listConversations().then(setConversations).catch(() => {})
  const loadChats = () => api.listChats().then(setChats).catch(() => {})
  useEffect(() => { if (user) { loadConversations(); loadChats() } }, [user]) // eslint-disable-line

  // Open a DM thread.
  useEffect(() => {
    if (tab !== 'direct' || !activeDm) return
    setMessages([])
    api.getThread(activeDm).then(({ other, messages }) => {
      setDmUser(other); setMessages(messages); loadConversations()
    }).catch(() => api.getUser(activeDm).then(setDmUser).catch(() => {}))
  }, [activeDm, tab]) // eslint-disable-line

  // Open a group thread.
  useEffect(() => {
    if (tab !== 'groups' || !activeGroup) return
    setMessages([])
    api.listChatMessages(activeGroup).then(setMessages).catch(() => setMessages([]))
  }, [activeGroup, tab])

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  if (!profile.onboarded) return <Navigate to="/welcome" replace />

  const switchTab = (t) => {
    setTab(t); setMessages([]); setSearch('')
    setParams(t === 'groups' ? { tab: 'groups' } : {}, { replace: true })
  }
  const openDm = (id) => { setTab('direct'); setActiveDm(id); setComposing(false); setParams({ dm: id }, { replace: true }) }
  const openGroup = async (chat) => {
    if (!chat.joined) {
      const updated = await api.joinChat(chat.id)
      setChats((cs) => cs.map((c) => (c.id === chat.id ? updated : c)))
    }
    setActiveGroup(chat.id)
  }
  const closeThread = () => { setActiveDm(null); setActiveGroup(null); setDmUser(null); setParams(tab === 'groups' ? { tab: 'groups' } : {}, { replace: true }) }

  const sendDm = async (body) => {
    const msg = await api.sendMessage(activeDm, body)
    setMessages((m) => [...m, msg]); loadConversations()
  }
  const sendGroup = async (body) => {
    const msg = await api.sendChatMessage(activeGroup, body)
    setMessages((m) => [...m, msg]); loadChats()
  }
  const createGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return
    const chat = await api.createChat({ name: groupName.trim(), description: '' })
    setChats((cs) => [chat, ...cs]); setGroupName(''); setNewGroup(false); setActiveGroup(chat.id)
  }

  const needle = search.trim().toLowerCase()
  const dmRows = conversations.filter((c) => !needle || c.other.name.toLowerCase().includes(needle))
  const groupRows = [...chats]
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0))
    .filter((c) => !needle || c.name.toLowerCase().includes(needle))
  const group = chats.find((c) => c.id === activeGroup)
  const threadOpen = tab === 'direct' ? !!activeDm : !!activeGroup
  const unreadTotal = conversations.reduce((n, c) => n + (c.unread || 0), 0)

  return (
    <div className="dm-page">
      <div className={`dm ${threadOpen ? 'thread-open' : ''}`}>
        {/* ── Left: inbox ── */}
        <aside className="dm-inbox" aria-label="Conversations">
          <header className="dm-inbox-head">
            <strong className="dm-me">{profile.handle?.replace(/^@/, '') || profile.name}</strong>
            <button className="dm-icon-btn" onClick={() => (tab === 'groups' ? setNewGroup(true) : setComposing(true))}
              aria-label={tab === 'groups' ? 'New group' : 'New message'}>
              <Icon name="edit" size={22} />
            </button>
          </header>

          <label className="dm-search">
            <Icon name="search" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search conversations" />
          </label>

          <div className="dm-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'direct'} className={tab === 'direct' ? 'on' : ''} onClick={() => switchTab('direct')}>
              Messages{unreadTotal > 0 && <span className="dm-count">{unreadTotal}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'groups'} className={tab === 'groups' ? 'on' : ''} onClick={() => switchTab('groups')}>
              Groups
            </button>
          </div>

          <div className="dm-list">
            {tab === 'direct' && (
              <>
                {dmRows.length === 0 && (
                  <p className="dm-muted dm-list-empty">{needle ? 'No matches.' : 'No messages yet.'}</p>
                )}
                {dmRows.map((c) => (
                  <button key={c.other.id} className={`dm-item ${activeDm === c.other.id ? 'active' : ''} ${c.unread ? 'unread' : ''}`} onClick={() => openDm(c.other.id)}>
                    <Face user={c.other} size={56} />
                    <span className="dm-item-text">
                      <span className="dm-item-name">{c.other.name}</span>
                      <span className="dm-item-preview">
                        <span className="dm-item-last">{c.lastMessage}</span>
                        <span className="dm-item-dot">·</span>
                        <span>{shortAgo(c.lastAt)}</span>
                      </span>
                    </span>
                    {c.unread > 0 && <span className="dm-unread" aria-label={`${c.unread} unread`} />}
                  </button>
                ))}
              </>
            )}

            {tab === 'groups' && (
              <>
                {newGroup && (
                  <form className="dm-newgroup" onSubmit={createGroup}>
                    <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Name your group" maxLength={60} />
                    <button className="dm-send" disabled={!groupName.trim()}>Create</button>
                    <button type="button" className="dm-icon-btn" onClick={() => setNewGroup(false)} aria-label="Cancel"><Icon name="x" size={18} /></button>
                  </form>
                )}
                {groupRows.length === 0 && !newGroup && <p className="dm-muted dm-list-empty">{needle ? 'No matches.' : 'No groups yet.'}</p>}
                {groupRows.map((c) => (
                  <button key={c.id} className={`dm-item ${activeGroup === c.id ? 'active' : ''}`} onClick={() => openGroup(c)}>
                    <Face user={c} size={56} group />
                    <span className="dm-item-text">
                      <span className="dm-item-name">{c.name}</span>
                      <span className="dm-item-preview">
                        <span className="dm-item-last">{c.joined ? (c.lastMessage || `${c.memberCount} member${c.memberCount === 1 ? '' : 's'}`) : 'Tap to join'}</span>
                        {c.lastMessage && <><span className="dm-item-dot">·</span><span>{shortAgo(c.lastAt)}</span></>}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ── Right: thread ── */}
        <section className="dm-pane" aria-label="Conversation">
          {tab === 'direct' && activeDm && dmUser && (
            <>
              <header className="dm-pane-head">
                <button className="dm-icon-btn dm-back" onClick={closeThread} aria-label="Back"><Icon name="back" size={22} /></button>
                <Link to={`/profile/${dmUser.id}`} className="dm-pane-who">
                  <Face user={dmUser} size={44} />
                  <span>
                    <strong>{dmUser.name}{dmUser.idVerified && <Icon name="badge-check" size={14} />}</strong>
                    <span className="dm-muted">{dmUser.title || 'Voidaj member'}</span>
                  </span>
                </Link>
                <Link to={`/profile/${dmUser.id}`} className="dm-icon-btn" aria-label="Profile details"><Icon name="info" size={24} /></Link>
              </header>
              <Thread
                messages={messages} meId={user.id} other={dmUser}
                intro={(
                  <div className="dm-intro">
                    <Face user={dmUser} size={96} />
                    <strong>{dmUser.name}</strong>
                    <span className="dm-muted">{dmUser.title || 'Voidaj member'}{dmUser.city ? ` · ${dmUser.city}` : ''}</span>
                    <Link to={`/profile/${dmUser.id}`} className="dm-intro-btn">View profile</Link>
                  </div>
                )}
              />
              <Composer onSend={sendDm} />
            </>
          )}

          {tab === 'groups' && group && (
            <>
              <header className="dm-pane-head">
                <button className="dm-icon-btn dm-back" onClick={closeThread} aria-label="Back"><Icon name="back" size={22} /></button>
                <div className="dm-pane-who">
                  <Face user={group} size={44} group />
                  <span>
                    <strong>{group.name}</strong>
                    <span className="dm-muted">{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</span>
                  </span>
                </div>
                <span />
              </header>
              <Thread
                messages={messages} meId={user.id} isGroup
                intro={(
                  <div className="dm-intro">
                    <Face user={group} size={96} group />
                    <strong>{group.name}</strong>
                    <span className="dm-muted">{group.description || 'A private group chat'}</span>
                  </div>
                )}
              />
              <Composer onSend={sendGroup} />
            </>
          )}

          {!threadOpen && (
            <div className="dm-empty">
              <span className="dm-empty-ring"><Icon name={tab === 'groups' ? 'users' : 'send'} size={44} /></span>
              <strong>{tab === 'groups' ? 'Your groups' : 'Your messages'}</strong>
              <span className="dm-muted">{tab === 'groups' ? 'Private rooms for the people you choose.' : 'Send a private message to someone in the city.'}</span>
              <button className="dm-primary" onClick={() => (tab === 'groups' ? setNewGroup(true) : setComposing(true))}>
                {tab === 'groups' ? 'New group' : 'Send message'}
              </button>
            </div>
          )}
        </section>
      </div>

      {composing && <NewMessage profile={profile} onPick={openDm} onClose={() => setComposing(false)} />}
    </div>
  )
}
