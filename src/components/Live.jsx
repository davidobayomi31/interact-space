// Live streaming — the "who's live" signal is real (backed by the DB and
// polled), but broadcasting video between members needs real media-server
// infrastructure this prototype doesn't have. The host sees their own
// camera as a self-preview; everyone else sees a labeled placeholder with
// a simulated, ticking viewer count — honest about what's real vs demo.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from './Icons.jsx'
import { Avatar } from './bits.jsx'

export function LiveBadge() {
  return <span className="live-badge"><span className="live-dot" /> LIVE</span>
}

export function LiveTab({ community, isMember }) {
  const { user } = useApp()
  const [stream, setStream] = useState(null)
  const [title, setTitle] = useState('')
  const [starting, setStarting] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const poll = () => api.getCommunityLive(community.id).then(setStream).catch(() => {})
  useEffect(() => {
    poll()
    const t = setInterval(poll, 6000)
    return () => clearInterval(t)
  }, [community.id]) // eslint-disable-line

  const isHost = stream && user && stream.host.id === user.id

  useEffect(() => {
    if (!isHost) return
    navigator.mediaDevices?.getUserMedia?.({ video: true, audio: false })
      .then((s) => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => {})
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [isHost])

  const goLive = async () => {
    setStarting(true)
    try { const s = await api.startLive(community.id, title || `${community.name} — live now`); setStream(s) }
    catch (err) { alert(err.message) }
    setStarting(false)
  }

  const endLive = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    await api.stopLive(stream.id)
    setStream(null)
  }

  if (!stream) {
    return (
      <div className="card ghost-card">
        <Icon name="radio" size={26} />
        <p><strong>No one’s live right now.</strong><br />{isMember ? 'Start a stream and members here can drop in.' : 'Join this community to go live.'}</p>
        {isMember && (
          <div className="live-start-form">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you streaming?" />
            <button className="btn primary small" onClick={goLive} disabled={starting}>
              <Icon name="video" size={14} /> {starting ? 'Starting…' : 'Go live'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card live-card">
      <div className="live-video">
        {isHost ? (
          <video ref={videoRef} autoPlay muted playsInline className="live-video-el" />
        ) : (
          <div className="live-placeholder">
            <Icon name="video" size={30} />
            <span>Simulated viewer preview — video isn’t broadcast between members in this prototype.</span>
          </div>
        )}
        <LiveBadge />
        <span className="live-viewers"><Icon name="eye" size={13} /> {stream.viewerCount}</span>
      </div>
      <div className="live-meta">
        <Avatar user={stream.host} size={30} />
        <div>
          <div className="connection-name">{stream.title}</div>
          <div className="meta-dim">{stream.host.name} is live</div>
        </div>
        {isHost && <button className="btn danger small" onClick={endLive}>End stream</button>}
      </div>
    </div>
  )
}

export function LiveNowRow() {
  const [streams, setStreams] = useState([])
  useEffect(() => {
    api.listLive().then(setStreams).catch(() => {})
    const t = setInterval(() => api.listLive().then(setStreams).catch(() => {}), 10000)
    return () => clearInterval(t)
  }, [])
  if (!streams.length) return null
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2 className="section-title"><Icon name="radio" size={18} /> Live now</h2>
          <p className="section-sub">Streams happening across the city right now</p>
        </div>
      </div>
      <div className="live-row">
        {streams.map((s) => (
          <Link key={s.id} to={`/community/${s.community.id}?tab=live`} className="card live-row-card" style={{ '--accent': s.community.accent }}>
            <div className="live-thumb"><Icon name="video" size={22} /><LiveBadge /></div>
            <div className="card-title">{s.title}</div>
            <div className="meta-dim">{s.host.name} · {s.community.name}</div>
            <span className="meta-dim"><Icon name="eye" size={12} /> {s.viewerCount} watching</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
