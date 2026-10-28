// Persistent AI Companion — the discovery layer, available on every screen.
// Talks to the /api/companion endpoint (a real LLM when a key is set, the
// rule engine otherwise). Every recommendation carries a visible "because".
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Eagle } from './Eagle.jsx'
import { CommunityCard, PersonCard, PostCard } from './bits.jsx'

const SUGGESTIONS = [
  'Help me find a business community near me',
  'Find people interested in renewable energy',
  'What discussions should I read about farming?',
  'I want to learn coding and meet other learners',
  'Introduce me to people in sustainable agriculture',
]

function AssistantSections({ sections }) {
  return sections.map((s, i) => (
    <div key={i} className="assistant-section">
      <div className="assistant-section-label">{s.label}</div>
      {s.results.map(({ item, because }) => {
        if (s.kind === 'communities') return <CommunityCard key={item.id} community={item} because={because} compact />
        if (s.kind === 'people') return <PersonCard key={item.id} user={item} because={because} />
        if (s.kind === 'posts') return <PostCard key={item.id} post={item} because={because} />
        return null
      })}
    </div>
  ))
}

// On the landing page the hero has its own "Ask" button right next to the
// companion, so the floating one waits until the hero has scrolled away.
function useHeroInView(pathname) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (pathname !== '/') { setInView(false); return }
    let frame = 0
    const check = () => {
      frame = 0
      const hero = document.querySelector('.hero')
      setInView(!!hero && hero.getBoundingClientRect().bottom > window.innerHeight * 0.5)
    }
    const on = () => { if (!frame) frame = requestAnimationFrame(check) }
    const boot = requestAnimationFrame(check)
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(boot); cancelAnimationFrame(frame)
      window.removeEventListener('scroll', on); window.removeEventListener('resize', on)
    }
  }, [pathname])
  return inView
}

export default function Assistant() {
  const { user, profile, saveProfile, assistantOpen, setAssistantOpen } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef(null)
  const heroInView = useHeroInView(location.pathname)

  useEffect(() => {
    if (assistantOpen && messages.length === 0) {
      const joined = profile.communities.length
      setMessages([{
        role: 'ai',
        text: user
          ? `Hi ${profile.name.split(' ')[0]} — I’m your companion for the whole network. ${joined ? `You’re in ${joined} ${joined === 1 ? 'community' : 'communities'} so far.` : ''} What would you like to do?`
          : 'Hi — I’m the VOIDAJ companion. Tell me what you’re into and I’ll guide you to communities, people and discussions.',
        sections: [],
      }])
    }
  }, [assistantOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text) => {
    const msg = text.trim()
    if (!msg || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setThinking(true)
    try {
      const reply = await api.companion(msg)
      setMessages((m) => [...m, { role: 'ai', text: reply.reply, sections: reply.sections, source: reply.source }])
      // The companion learns: interests mentioned in chat join your profile.
      if (user && reply.learnedTags?.length) {
        const merged = [...new Set([...(profile.interests || []), ...reply.learnedTags])]
        if (merged.length !== (profile.interests || []).length) saveProfile({ interests: merged }).catch(() => {})
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'ai', text: `Sorry — ${err.message}`, sections: [] }])
    }
    setThinking(false)
  }

  if (location.pathname === '/welcome' || location.pathname === '/auth') return null

  if (!assistantOpen) {
    // In the inbox the floating button would sit on the message box.
    if (location.pathname.startsWith('/chats') || heroInView) return null
    return (
      <button className="assistant-fab" onClick={() => setAssistantOpen(true)} aria-label="Open AI companion">
        <Eagle size={30} />
        <span>Companion</span>
      </button>
    )
  }

  return (
    <div className="assistant-drawer" role="dialog" aria-label="AI Companion">
      <div className="assistant-head">
        <div className="assistant-title">
          <div className="assistant-orb"><Eagle size={30} /></div>
          <div>
            <strong>Your Companion</strong>
            <div className="meta-dim">Guides you to people — never replaces them</div>
          </div>
        </div>
        <button className="icon-btn" onClick={() => setAssistantOpen(false)} aria-label="Close companion">
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="assistant-body" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}`}>
              <div className="bubble-text">{m.text}</div>
              {m.sections?.length > 0 && <AssistantSections sections={m.sections} />}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="bubble-row ai">
            <div className="bubble ai thinking">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        {messages.length <= 1 && !thinking && (
          <div className="suggestion-list">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>

      <form className="assistant-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about people, communities, discussions…"
          aria-label="Message the companion"
        />
        <button type="submit" className="btn primary icon-only" aria-label="Send" disabled={!input.trim()}>
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  )
}
