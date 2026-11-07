// ── The VOIDAJ engagement system ────────────────────────────────────
// From Nuel's mockup v2.0 (Nov 2): every post gets four actions.
//   Spark — react. Tap for a Spark; hold (or the little arrow) to pick
//           Insight, Support, Fire or Relate instead.
//   Take  — the discussion (comments), "share your take".
//   Loom  — spread it: to your feed, a community, a chat, or outside VOIDAJ.
//   Stash — save it into a collection to come back to.
// Also here: RichText, which turns #hashtags and @mentions into links
// (Nuel, Oct 29: "can we have either hash tags or ours can be ^").
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Avatar } from './bits.jsx'
import { findCommunity } from '../communities.js'
import { useFavorites, stashOf, stash, removeFavorite, STASH_COLLECTIONS } from '../favorites.js'

export const SPARKS = [
  { id: 'spark', emoji: '⚡', label: 'Spark', sub: 'Appreciate' },
  { id: 'insight', emoji: '💡', label: 'Insight', sub: 'Informative' },
  { id: 'support', emoji: '💖', label: 'Support', sub: 'Encourage' },
  { id: 'fire', emoji: '🔥', label: 'Fire', sub: 'Exciting' },
  { id: 'relate', emoji: '😄', label: 'Relate', sub: 'Agree' },
]
const SPARK = Object.fromEntries(SPARKS.map((s) => [s.id, s]))
export const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.max(0, n || 0)))

// ── #hashtags and @mentions ──────────────────────────────────────────
const TOKEN = /(#[A-Za-z0-9_]{2,40}|@[A-Za-z0-9_.]{2,30})/g
export function RichText({ text }) {
  if (!text) return null
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part
    if (part[0] === '#') return <Link key={i} className="rt-tag" to={`/tag/${part.slice(1).toLowerCase()}`} onClick={(e) => e.stopPropagation()}>{part}</Link>
    return <Link key={i} className="rt-mention" to={`/u/${part.slice(1).replace(/\.$/, '').toLowerCase()}`} onClick={(e) => e.stopPropagation()}>{part}</Link>
  })
}

// ── Spark ────────────────────────────────────────────────────────────
function SparkButton({ post, onChange }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [state, setState] = useState(post.sparks ?? { total: post.score ?? 0, byKind: {}, mine: null })
  const [picker, setPicker] = useState(false)
  const [pop, setPop] = useState(false)
  const hold = useRef(null)
  const wrap = useRef(null)
  useEffect(() => { if (post.sparks) setState(post.sparks) }, [post.sparks])
  useEffect(() => {
    if (!picker) return
    const away = (e) => { if (!wrap.current?.contains(e.target)) setPicker(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [picker])

  const send = async (kind) => {
    if (!user) return navigate('/auth')
    setPicker(false)
    const next = state.mine === kind ? null : kind
    setState((s) => {
      const byKind = { ...s.byKind }
      if (s.mine) byKind[s.mine] = Math.max(0, (byKind[s.mine] || 1) - 1)
      if (next) byKind[next] = (byKind[next] || 0) + 1
      return { total: s.total + (next ? 1 : 0) - (s.mine ? 1 : 0), byKind, mine: next }
    })
    if (next) { setPop(true); setTimeout(() => setPop(false), 400) }
    try { const p = await api.spark(post.id, next); setState(p.sparks); onChange?.(p) } catch { /* keep the optimistic count */ }
  }
  const down = () => { hold.current = setTimeout(() => { hold.current = 'held'; setPicker(true) }, 420) }
  const up = () => {
    if (hold.current === 'held') { hold.current = null; return }
    clearTimeout(hold.current); hold.current = null
    send(state.mine ? state.mine : 'spark')
  }
  const cancel = () => { if (hold.current !== 'held') clearTimeout(hold.current); hold.current = null }
  const mine = state.mine && SPARK[state.mine]

  return (
    <div className="eg-spark" ref={wrap}>
      <button type="button" className={`eg-act ${mine ? 'on' : ''} ${pop ? 'pop' : ''}`}
        onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} onContextMenu={(e) => e.preventDefault()}
        aria-pressed={!!mine} aria-label={mine ? `${mine.label} — tap to remove` : 'Spark'} title="Tap to Spark · hold for more">
        {mine ? <span className="eg-emoji">{mine.emoji}</span> : <Icon name="zap" size={18} />}
        <span>{mine ? mine.label : 'Spark'}</span>
      </button>
      <button type="button" className="eg-more" onClick={() => setPicker((p) => !p)} aria-label="Choose a reaction" aria-expanded={picker}><Icon name="chevron-down" size={13} /></button>
      {picker && (
        <div className="eg-picker" role="menu">
          {SPARKS.map((s) => (
            <button key={s.id} type="button" role="menuitem" className={state.mine === s.id ? 'on' : ''} onClick={() => send(s.id)} title={`${s.label} · ${s.sub}`}>
              <span className="eg-emoji">{s.emoji}</span><b>{s.label}</b><em>{s.sub}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// The numbers row above the actions: top Sparks, Takes, Looms, Stashes.
function Counts({ post, sparks, stashed }) {
  const top = Object.entries(sparks?.byKind ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
  return (
    <div className="eg-counts">
      <span title="Sparks">{top.length ? top.map(([k]) => <i key={k}>{SPARK[k]?.emoji}</i>) : <Icon name="zap" size={13} />} {fmt(sparks?.total)}</span>
      <Link to={`/post/${post.id}`} title="Takes"><Icon name="chat" size={13} /> {fmt(post.commentCount)}</Link>
      <span title="Looms"><Icon name="shuffle" size={13} /> {fmt(post.loomCount)}</span>
      {stashed && <span className="eg-stashed" title="In your Stash"><Icon name="bookmark" size={13} /> Stashed</span>}
    </div>
  )
}

// ── Loom ─────────────────────────────────────────────────────────────
export function LoomSheet({ post, onClose, onLoomed }) {
  const { user, profile } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState('menu')
  const [note, setNote] = useState('')
  const [to, setTo] = useState('public')
  const [communityId, setCommunityId] = useState(profile.communities?.[0] ?? '')
  const [convos, setConvos] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const mine = (profile.communities || []).map(findCommunity).filter(Boolean)
  const city = profile.city || 'Lagos'
  const url = `${location.origin}/post/${post.id}`
  const excerpt = (post.title || post.body || 'a post').slice(0, 80)

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  useEffect(() => { if (step === 'chat' && !convos) api.listConversations().then(setConvos).catch(() => setConvos([])) }, [step, convos])

  if (!user) { navigate('/auth'); return null }

  const loomIt = async (target) => {
    setBusy(true); setError('')
    try {
      const p = await api.loom(post.id, { to: target, communityId: target === 'community' ? communityId : undefined, note })
      onLoomed?.(p)
      setDone(target === 'community' ? `Loomed into ${findCommunity(communityId)?.name ?? 'the community'}` : 'Loomed to your feed')
    } catch (e) { setError(e.message) }
    setBusy(false)
  }
  const sendTo = async (other) => {
    setBusy(true); setError('')
    try {
      await api.sendMessage(other.id, note.trim() || `Check this out: “${excerpt}”`, [], { kind: 'post', id: post.id })
      setDone(`Sent to ${other.name}`)
    } catch (e) { setError(e.message) }
    setBusy(false)
  }
  const external = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'VOIDAJ', text: excerpt, url }); setDone('Shared') }
      else { await navigator.clipboard.writeText(url); setDone('Link copied') }
    } catch { /* closed the share sheet */ }
  }

  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div className="sheet eg-sheet" role="dialog" aria-label="Loom this post" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          {step !== 'menu' && !done && <button className="icon-btn subtle" onClick={() => setStep('menu')} aria-label="Back"><Icon name="back" size={18} /></button>}
          <span className="eg-sheet-mark loom"><Icon name="shuffle" size={20} /></span>
          <strong>Loom this post<em>Spread it across VOIDAJ</em></strong>
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        {done ? (
          <div className="eg-done"><Icon name="check" size={22} /><b>{done}</b><button className="btn primary small" onClick={onClose}>Done</button></div>
        ) : step === 'menu' ? (
          <div className="eg-options">
            <button onClick={() => setStep('feed')}><span className="eg-opt-ic violet"><Icon name="home" size={18} /></span><span><b>Loom to Feed</b><em>Share to your network</em></span><Icon name="chevron-right" size={18} /></button>
            <button onClick={() => setStep('community')}><span className="eg-opt-ic teal"><Icon name="community" size={18} /></span><span><b>Loom to Community</b><em>Share to a community</em></span><Icon name="chevron-right" size={18} /></button>
            <button onClick={() => setStep('chat')}><span className="eg-opt-ic blue"><Icon name="message-circle" size={18} /></span><span><b>Loom in Chat</b><em>Send to someone</em></span><Icon name="chevron-right" size={18} /></button>
            <button onClick={external}><span className="eg-opt-ic orange"><Icon name="share" size={18} /></span><span><b>Loom Externally</b><em>Share outside VOIDAJ</em></span><Icon name="chevron-right" size={18} /></button>
          </div>
        ) : (
          <>
            <div className="eg-quote"><Avatar user={post.author} size={28} /><span><b>{post.author.name}</b><em>{excerpt}</em></span></div>
            <textarea className="eg-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
              placeholder={step === 'chat' ? 'Add a message (optional)…' : 'Add your thoughts (optional)…'} />
            {step === 'feed' && (
              <>
                <div className="fc-audience" role="radiogroup" aria-label="Who sees it">
                  <button type="button" role="radio" aria-checked={to === 'public'} className={to === 'public' ? 'on' : ''} onClick={() => setTo('public')}><Icon name="globe" size={14} /> Public</button>
                  <button type="button" role="radio" aria-checked={to === 'city'} className={to === 'city' ? 'on' : ''} onClick={() => setTo('city')}><Icon name="map-pin" size={14} /> {city}</button>
                </div>
                <button className="btn primary" disabled={busy} onClick={() => loomIt(to)}><Icon name="shuffle" size={15} /> {busy ? 'Looming…' : 'Loom'}</button>
              </>
            )}
            {step === 'community' && (mine.length ? (
              <>
                <select className="job-select" value={communityId} onChange={(e) => setCommunityId(e.target.value)} aria-label="Community">
                  {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn primary" disabled={busy || !communityId} onClick={() => loomIt('community')}><Icon name="shuffle" size={15} /> {busy ? 'Looming…' : 'Loom'}</button>
              </>
            ) : <p className="meta-dim">Join a community first. <Link to="/communities" onClick={onClose}>Find one</Link></p>)}
            {step === 'chat' && (
              <div className="eg-people">
                {convos === null && <p className="meta-dim">Loading your chats…</p>}
                {convos?.length === 0 && <p className="meta-dim">No chats yet. Message someone first, then you can loom posts to them.</p>}
                {convos?.slice(0, 12).map((c) => (
                  <button key={c.other.id} disabled={busy} onClick={() => sendTo(c.other)}>
                    <Avatar user={c.other} size={36} /><span><b>{c.other.name}</b><em>{c.other.handle}</em></span><Icon name="send" size={16} />
                  </button>
                ))}
              </div>
            )}
            {error && <p className="auth-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}

// ── Stash ────────────────────────────────────────────────────────────
export function StashSheet({ item, onClose }) {
  const saved = stashOf(useFavorites(), item.kind, item.id)
  const [pick, setPick] = useState(saved?.collection || 'all')
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-backdrop sheet-backdrop" onClick={onClose}>
      <div className="sheet eg-sheet" role="dialog" aria-label="Add to your Stash" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="eg-sheet-mark stash"><Icon name="bookmark" size={20} /></span>
          <strong>Add to your Stash<em>Keep this for later</em></strong>
          <button className="icon-btn subtle" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <p className="eg-label">Choose a collection</p>
        <div className="eg-collections" role="radiogroup">
          {STASH_COLLECTIONS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={pick === c.id} className={pick === c.id ? 'on' : ''} onClick={() => setPick(c.id)}>
              <Icon name={c.icon} size={17} /> <span>{c.label}{c.id === 'all' && <em> (default)</em>}</span>
              {pick === c.id && <Icon name="check" size={16} className="eg-check" />}
            </button>
          ))}
        </div>
        <div className="eg-sheet-foot">
          {saved && <button className="btn ghost" onClick={() => { removeFavorite(item.kind, item.id); onClose() }}>Remove</button>}
          <button className="btn primary" onClick={() => { stash(item, pick); onClose() }}>{saved ? 'Move' : 'Stash'}</button>
        </div>
      </div>
    </div>
  )
}

// ── The bar under every post ─────────────────────────────────────────
export function EngageBar({ post, stashItem, onLoomed }) {
  const [sparks, setSparks] = useState(post.sparks)
  const [sheet, setSheet] = useState(null)
  const stashed = !!stashOf(useFavorites(), stashItem.kind, stashItem.id)
  const [loomCount, setLoomCount] = useState(post.loomCount ?? 0)
  return (
    <>
      <Counts post={{ ...post, loomCount }} sparks={sparks ?? post.sparks} stashed={stashed} />
      <footer className="eg-bar">
        <SparkButton post={post} onChange={(p) => setSparks(p.sparks)} />
        <Link to={`/post/${post.id}`} className="eg-act" aria-label="Take"><Icon name="chat" size={18} /> <span>Take</span></Link>
        <button type="button" className="eg-act" onClick={() => setSheet('loom')} aria-label="Loom"><Icon name="shuffle" size={18} /> <span>Loom</span></button>
        <button type="button" className={`eg-act ${stashed ? 'on stash' : ''}`} onClick={() => setSheet('stash')} aria-label="Stash" aria-pressed={stashed}><Icon name="bookmark" size={18} /> <span>Stash</span></button>
      </footer>
      {/* Rendered at the page's root: a post card's entry animation would
          otherwise box the full-screen sheet inside the card. */}
      {sheet === 'loom' && createPortal(<LoomSheet post={post} onClose={() => setSheet(null)} onLoomed={(p) => { setLoomCount((n) => n + 1); onLoomed?.(p) }} />, document.body)}
      {sheet === 'stash' && createPortal(<StashSheet item={stashItem} onClose={() => setSheet(null)} />, document.body)}
    </>
  )
}
