// Stage 2 — Personalization. The AI companion onboards you through a
// conversation, not a form. Every answer becomes profile data, and the
// closing recommendations are visibly traced back to what you said.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { GOAL_OPTIONS } from '../data/seed.js'
import { extractTags, tagLabel, matchCommunities, matchPeople, matchEvents } from '../ai.js'
import { Icon } from '../components/Icons.jsx'
import { Eagle } from '../components/Eagle.jsx'
import { CommunityCard, PersonCard, EventCard } from '../components/bits.jsx'

const AREAS = ['Yaba', 'Lekki', 'Ikeja', 'Surulere', 'Victoria Island', 'Ikorodu', 'Somewhere else in Lagos']
const PRIVACY = [
  { id: 'exact', label: 'Exact area', desc: 'Show my neighbourhood to members' },
  { id: 'city-only', label: 'City only', desc: 'Just “Lagos” — nothing closer' },
  { id: 'hidden', label: 'Don’t show my location', desc: 'Members won’t see where you are at all' },
]

export default function Onboarding() {
  const { user, loading, saveProfile, setAssistantOpen } = useApp()
  const navigate = useNavigate()

  useEffect(() => { if (!loading && !user) navigate('/auth') }, [user, loading]) // eslint-disable-line
  const [messages, setMessages] = useState([])
  const [step, setStep] = useState('intro') // intro → name → goals → interests → area → privacy → reveal
  const [draft, setDraft] = useState('')
  const [goals, setGoals] = useState([])
  const [collected, setCollected] = useState({ name: '', tags: [], area: '', privacy: 'city-only' })
  const scrollRef = useRef(null)
  const timers = useRef([])

  const say = (msg, delay = 0) => {
    const t = setTimeout(() => setMessages((m) => [...m, msg]), delay)
    timers.current.push(t)
  }

  useEffect(() => {
    say({ role: 'ai', text: 'Welcome to Interact Space. 🌍 I’m your companion — my job is to connect you to people, not keep you scrolling.' }, 300)
    say({ role: 'ai', text: 'First things first — what should the city call you?' }, 1300)
    const t = setTimeout(() => setStep('name'), 1400)
    timers.current.push(t)
    return () => timers.current.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, step])

  const submitName = (e) => {
    e.preventDefault()
    const name = draft.trim() || 'Dami Adeyemi'
    setCollected((c) => ({ ...c, name }))
    setMessages((m) => [...m, { role: 'user', text: name }])
    setDraft('')
    setStep('wait')
    say({ role: 'ai', text: `Good to meet you, ${name.split(' ')[0]}. What would you like to do today? Pick as many as you like.` }, 600)
    say({ role: 'ai', chips: 'goals' }, 700)
    const t = setTimeout(() => setStep('goals'), 800)
    timers.current.push(t)
  }

  const toggleGoal = (id) =>
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))

  const submitGoals = () => {
    const labels = GOAL_OPTIONS.filter((g) => goals.includes(g.id)).map((g) => g.label)
    setMessages((m) => [...m, { role: 'user', text: labels.join(' · ') || 'Just exploring' }])
    setStep('wait')
    say({ role: 'ai', text: 'Nice. Now tell me in your own words — what are you into, and what do you want out of it? For example: “I want to learn farming and meet people interested in sustainable agriculture.”' }, 600)
    const t = setTimeout(() => setStep('interests'), 700)
    timers.current.push(t)
  }

  const submitInterests = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [...m, { role: 'user', text }])
    setDraft('')
    const tags = extractTags(text)
    setCollected((c) => ({ ...c, tags, rawInterest: text }))
    setStep('wait')
    if (tags.length) {
      say({ role: 'ai', text: `Got it — I’m hearing ${tags.map(tagLabel).join(', ')}. I’ll use that to map your corner of the city.` }, 600)
    } else {
      say({ role: 'ai', text: 'Noted! I’ll learn more as we talk. (Tip: interests like farming, tech, photography, business or energy light up this demo city best.)' }, 600)
    }
    say({ role: 'ai', text: 'Where in Lagos are you based? This helps me find things near you.' }, 1500)
    say({ role: 'ai', chips: 'area' }, 1600)
    const t = setTimeout(() => setStep('area'), 1700)
    timers.current.push(t)
  }

  const pickArea = (area) => {
    setCollected((c) => ({ ...c, area }))
    setMessages((m) => [...m, { role: 'user', text: area }])
    setStep('wait')
    say({ role: 'ai', text: 'And how much of that should other members see? Your location privacy is always yours to control — that’s part of the Charter.' }, 600)
    say({ role: 'ai', chips: 'privacy' }, 700)
    const t = setTimeout(() => setStep('privacy'), 800)
    timers.current.push(t)
  }

  const pickPrivacy = (p) => {
    setMessages((m) => [...m, { role: 'user', text: p.label }])
    const newProfile = {
      name: collected.name, area: collected.area, privacy: p.id,
      // Only what they actually told us. An empty list is honest; the companion
      // fills it in as they talk (see Assistant.jsx), and the reveal below falls
      // back to popular communities rather than inventing interests for them.
      interests: collected.tags, goals: GOAL_OPTIONS.filter((g) => goals.includes(g.id)).map((g) => g.label),
      onboarded: true,
      bio: collected.rawInterest ? `“${collected.rawInterest}”` : 'New citizen of Interact Space.',
    }
    saveProfile(newProfile)
    setCollected((c) => ({ ...c, privacy: p.id }))
    setStep('wait')
    say({ role: 'ai', text: `That’s everything, ${collected.name.split(' ')[0]}. Based on what you told me, here’s your starting map of the city:` }, 700)
    say({ role: 'ai', reveal: true }, 900)
    const t = setTimeout(() => setStep('reveal'), 1000)
    timers.current.push(t)
  }

  const finish = () => {
    setAssistantOpen(false)
    navigate('/home')
  }

  // When we understood nothing, we still show a starting map — but it is
  // explicitly "popular here", never "because you said" something they didn't.
  const understood = collected.tags.length > 0
  const tagsForReveal = understood ? collected.tags : ['community', 'networking']
  const fallbackBecause = understood
    ? undefined
    : 'Popular in Lagos right now — tell me more and I’ll retune this'
  const revealCommunities = matchCommunities(tagsForReveal, { communities: [] }, 3)
  const revealPeople = matchPeople(tagsForReveal, { connections: [] }, 3)
  const revealEvents = matchEvents(tagsForReveal, null, 2)

  return (
    <div className="onboarding">
      <div className="onboarding-bg" aria-hidden="true" />
      <div className="onboarding-panel">
        <div className="onboarding-head">
          <Link to="/" className="brand small-brand">
            <span className="brand-mark"><Icon name="globe" size={15} /></span>
            <span className="brand-name">Interact <em>Space</em></span>
          </Link>
          <Link to="/" className="meta-dim skip-link">Explore the city first <Icon name="arrow" size={13} /></Link>
        </div>

        <div className="onboarding-chat" ref={scrollRef}>
          {messages.map((m, i) => {
            if (m.chips === 'goals') {
              return (
                <div key={i} className="chip-grid">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      className={`goal-chip ${goals.includes(g.id) ? 'selected' : ''}`}
                      onClick={() => step === 'goals' && toggleGoal(g.id)}
                      disabled={step !== 'goals'}
                    >
                      <Icon name={g.icon} size={16} /> {g.label}
                      {goals.includes(g.id) && <Icon name="check" size={13} className="chip-check" />}
                    </button>
                  ))}
                  {step === 'goals' && (
                    <button className="btn primary chip-continue" onClick={submitGoals} disabled={!goals.length}>
                      Continue <Icon name="arrow" size={14} />
                    </button>
                  )}
                </div>
              )
            }
            if (m.chips === 'area') {
              return (
                <div key={i} className="chip-grid">
                  {AREAS.map((a) => (
                    <button key={a} className="goal-chip" disabled={step !== 'area'} onClick={() => pickArea(a)}>
                      <Icon name="map-pin" size={14} /> {a}
                    </button>
                  ))}
                </div>
              )
            }
            if (m.chips === 'privacy') {
              return (
                <div key={i} className="chip-grid privacy-grid">
                  {PRIVACY.map((p) => (
                    <button key={p.id} className="privacy-chip" disabled={step !== 'privacy'} onClick={() => pickPrivacy(p)}>
                      <span className="privacy-chip-label"><Icon name="eye" size={14} /> {p.label}</span>
                      <span className="meta-dim">{p.desc}</span>
                    </button>
                  ))}
                </div>
              )
            }
            if (m.reveal) {
              return (
                <div key={i} className="reveal">
                  <div className="assistant-section-label">Communities for you</div>
                  <div className="card-grid three tight">
                    {revealCommunities.map(({ item, shared }) => (
                      <CommunityCard key={item.id} community={item} shared={shared} source="said" because={fallbackBecause} />
                    ))}
                  </div>
                  <div className="assistant-section-label">People you should meet</div>
                  <div className="card-grid three tight">
                    {revealPeople.map(({ item, shared }) => (
                      <PersonCard key={item.id} user={item} shared={shared} source="said" because={fallbackBecause} />
                    ))}
                  </div>
                  {revealEvents.length > 0 && (
                    <>
                      <div className="assistant-section-label">Events near you</div>
                      <div className="card-grid two tight">
                        {revealEvents.map(({ item, shared }) => (
                          <EventCard key={item.id} event={item} shared={shared} source="said" because={fallbackBecause} />
                        ))}
                      </div>
                    </>
                  )}
                  {step === 'reveal' && (
                    <div className="reveal-actions">
                      <button className="btn primary large" onClick={finish}>
                        Enter My Space <Icon name="arrow" size={16} />
                      </button>
                      <p className="meta-dim">You can join communities now or later — nothing is locked in.</p>
                    </div>
                  )}
                </div>
              )
            }
            return (
              <div key={i} className={`bubble-row ${m.role}`}>
                {m.role === 'ai' && <div className="assistant-orb small"><Eagle size={24} /></div>}
                <div className={`bubble ${m.role}`}>{m.text}</div>
              </div>
            )
          })}
        </div>

        {(step === 'name' || step === 'interests') && (
          <form className="assistant-input onboarding-input" onSubmit={step === 'name' ? submitName : submitInterests}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={step === 'name' ? 'Your name (try “Dami Adeyemi”)' : 'e.g. I want to learn farming and meet people into sustainable agriculture'}
              aria-label={step === 'name' ? 'Your name' : 'Your interests'}
            />
            <button type="submit" className="btn primary icon-only" aria-label="Send">
              <Icon name="send" size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
