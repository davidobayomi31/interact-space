// Photos, camera capture and voice messages — for community posts, DMs and
// group chats. Limits follow what Instagram and Reddit do: up to 10 items,
// JPG/PNG/WebP/HEIC photos up to 10MB each (shrunk in the browser before
// upload), short camera videos and voice messages capped at a few minutes.
// Everything is previewed, and can be removed, before it is sent.
import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icons.jsx'

export const MEDIA_MAX = 10
const PHOTO_MAX_MB = 10
const PHOTO_EDGE = 1600 // longest side after compression, in px
const VIDEO_MAX_S = 30
const VOICE_MAX_S = 180
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'
const PHOTO_OK = /^image\/(jpeg|png|webp|heic|heif)$/
const isHeic = (f) => /heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name)

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const asDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(new Error('Couldn’t read that file.'))
  r.readAsDataURL(blob)
})
// The first recording format this browser can produce.
const pickType = (list) => list.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''

async function decode(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  } finally { setTimeout(() => URL.revokeObjectURL(url), 0) }
}

// Draw onto a canvas no larger than PHOTO_EDGE and save as JPEG, the way
// Instagram re-encodes uploads, so a 10MB phone photo lands at a few
// hundred KB.
function toJpeg(source, w, h) {
  const k = Math.min(1, PHOTO_EDGE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // transparent PNGs get a white background, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.82, 0.68, 0.55]) {
    const src = canvas.toDataURL('image/jpeg', quality)
    if (src.length * 0.75 < 2.5 * 1024 * 1024 || quality === 0.55) {
      return { kind: 'image', type: 'image/jpeg', src, width: canvas.width, height: canvas.height }
    }
  }
}

export async function compressPhoto(file) {
  if (!PHOTO_OK.test(file.type) && !isHeic(file)) throw new Error('Photos must be JPG, PNG, WebP or HEIC.')
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) throw new Error(`“${file.name}” is over ${PHOTO_MAX_MB}MB.`)
  let img
  try { img = await decode(file) } catch {
    throw new Error(isHeic(file)
      ? 'This browser can’t open HEIC photos. Try Safari, or save the photo as JPG first.'
      : `Couldn’t open “${file.name}”.`)
  }
  return toJpeg(img, img.width || img.naturalWidth, img.height || img.naturalHeight)
}

// ── Camera: photo or short video, previewed before it's added ──────────
function CameraCapture({ onAdd, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recRef = useRef(null)
  const [facing, setFacing] = useState('environment')
  const [mode, setMode] = useState('photo')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [shot, setShot] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (shot) return
    if (!navigator.mediaDevices) { setError('This browser can’t use the camera.'); return }
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: mode === 'video' })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setError('Camera access was blocked. Allow it in your browser settings to take photos here.'))
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null }
  }, [facing, mode, shot])

  useEffect(() => {
    if (!recording) return
    const started = Date.now()
    const t = setInterval(() => {
      const s = (Date.now() - started) / 1000
      setSeconds(s)
      if (s >= VIDEO_MAX_S) recRef.current?.stop()
    }, 200)
    return () => clearInterval(t)
  }, [recording])

  const takePhoto = () => {
    const v = videoRef.current
    if (!v?.videoWidth) return
    setShot(toJpeg(v, v.videoWidth, v.videoHeight))
  }

  const startVideo = () => {
    const stream = streamRef.current
    if (!stream || !window.MediaRecorder) { setError('This browser can’t record video.'); return }
    const type = pickType(['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'])
    const rec = new MediaRecorder(stream, { ...(type && { mimeType: type }), videoBitsPerSecond: 1_000_000 })
    const chunks = []
    const started = Date.now()
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      setRecording(false)
      const blob = new Blob(chunks, { type: rec.mimeType || type || 'video/webm' })
      const v = videoRef.current
      setShot({
        kind: 'video', type: blob.type.split(';')[0], src: await asDataUrl(blob),
        width: v?.videoWidth, height: v?.videoHeight, duration: Math.min(VIDEO_MAX_S, (Date.now() - started) / 1000),
      })
    }
    recRef.current = rec
    rec.start()
    setSeconds(0); setRecording(true)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card camera-card" role="dialog" aria-label="Camera" onClick={(e) => e.stopPropagation()}>
        <div className="side-card-head"><Icon name="camera" size={16} /> {shot ? 'Preview' : 'Camera'}</div>
        {error ? <p className="meta-dim">{error}</p> : shot ? (
          shot.kind === 'image'
            ? <img className="camera-view" src={shot.src} alt="Your photo" />
            : <video className="camera-view" src={shot.src} controls playsInline />
        ) : (
          <div className="camera-live">
            <video ref={videoRef} className="camera-view" autoPlay playsInline muted />
            {recording && <span className="rec-badge"><span className="rec-dot" /> {clock(seconds)} / {clock(VIDEO_MAX_S)}</span>}
          </div>
        )}
        {!error && !shot && (
          <div className="camera-controls">
            <div className="camera-modes" role="tablist">
              {['photo', 'video'].map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''}
                  disabled={recording} onClick={() => setMode(m)}>{m === 'photo' ? 'Photo' : `Video · ${VIDEO_MAX_S}s`}</button>
              ))}
            </div>
            <button type="button" className={`shutter ${mode} ${recording ? 'recording' : ''}`}
              aria-label={mode === 'photo' ? 'Take photo' : recording ? 'Stop recording' : 'Start recording'}
              onClick={mode === 'photo' ? takePhoto : recording ? () => recRef.current?.stop() : startVideo} />
            <button type="button" className="icon-btn subtle" disabled={recording} aria-label="Switch camera"
              onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}><Icon name="shuffle" size={18} /></button>
          </div>
        )}
        <div className="composer-foot">
          {shot ? (
            <>
              <button type="button" className="btn ghost small" onClick={() => setShot(null)}>Retake</button>
              <button type="button" className="btn primary small" onClick={() => { onAdd(shot); onClose() }}>Use {shot.kind === 'image' ? 'photo' : 'video'}</button>
            </>
          ) : <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}

// ── Voice message: record, listen back, then add or discard ────────────
function VoiceRecorder({ onAdd, onClose }) {
  const recRef = useRef(null)
  const streamRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [clip, setClip] = useState(null)
  const [error, setError] = useState('')

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null }
  useEffect(() => () => { recRef.current?.state === 'recording' && recRef.current.stop(); stopStream() }, [])

  useEffect(() => {
    if (!recording) return
    const started = Date.now()
    const t = setInterval(() => {
      const s = (Date.now() - started) / 1000
      setSeconds(s)
      if (s >= VOICE_MAX_S) recRef.current?.stop()
    }, 200)
    return () => clearInterval(t)
  }, [recording])

  const start = async () => {
    setError('')
    if (!navigator.mediaDevices || !window.MediaRecorder) { setError('This browser can’t record audio.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const type = pickType(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'])
      const rec = new MediaRecorder(stream, { ...(type && { mimeType: type }), audioBitsPerSecond: 48_000 })
      const chunks = []
      const started = Date.now()
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = async () => {
        setRecording(false); stopStream()
        const blob = new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' })
        setClip({ kind: 'audio', type: blob.type.split(';')[0], src: await asDataUrl(blob), duration: Math.min(VOICE_MAX_S, (Date.now() - started) / 1000) })
      }
      recRef.current = rec
      rec.start()
      setSeconds(0); setRecording(true)
    } catch { setError('Microphone access was blocked. Allow it in your browser settings to send voice messages.') }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card voice-card" role="dialog" aria-label="Voice message" onClick={(e) => e.stopPropagation()}>
        <div className="side-card-head"><Icon name="mic" size={16} /> Voice message</div>
        {error && <p className="meta-dim">{error}</p>}
        {clip ? (
          <audio className="voice-preview" src={clip.src} controls />
        ) : (
          <div className="voice-stage">
            <button type="button" className={`voice-btn ${recording ? 'recording' : ''}`} onClick={recording ? () => recRef.current?.stop() : start}
              aria-label={recording ? 'Stop recording' : 'Start recording'}>
              <Icon name={recording ? 'stop' : 'mic'} size={26} />
            </button>
            <span className="meta-dim">
              {recording ? <><span className="rec-dot" /> {clock(seconds)} / {clock(VOICE_MAX_S)}</> : `Tap to record — up to ${VOICE_MAX_S / 60} minutes`}
            </span>
          </div>
        )}
        <div className="composer-foot">
          {clip ? (
            <>
              <button type="button" className="btn ghost small" onClick={() => setClip(null)}>Discard</button>
              <button type="button" className="btn primary small" onClick={() => { onAdd(clip); onClose() }}>Add voice message</button>
            </>
          ) : <button type="button" className="btn ghost small" onClick={onClose}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}

// The three buttons a composer gets: upload photos, camera, voice.
export function MediaButtons({ media, setMedia, className = '' }) {
  const fileRef = useRef(null)
  const [open, setOpen] = useState(null) // camera | voice
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const room = MEDIA_MAX - media.length
  const add = (item) => setMedia((m) => (m.length < MEDIA_MAX ? [...m, item] : m))

  const onFiles = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setError(''); setBusy(true)
    if (files.length > room) setError(`Up to ${MEDIA_MAX} items — only the first ${room} were added.`)
    for (const f of files.slice(0, room)) {
      try { add(await compressPhoto(f)) } catch (err) { setError(err.message) }
    }
    setBusy(false)
  }

  return (
    <span className={`media-buttons ${className}`}>
      <input ref={fileRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={onFiles} />
      <button type="button" className="icon-btn subtle" onClick={() => fileRef.current?.click()} disabled={busy || room <= 0}
        aria-label="Add photos" title={`Add photos (up to ${MEDIA_MAX})`}><Icon name="image" size={18} /></button>
      <button type="button" className="icon-btn subtle" onClick={() => setOpen('camera')} disabled={room <= 0}
        aria-label="Take a photo or video" title="Camera"><Icon name="camera" size={18} /></button>
      <button type="button" className="icon-btn subtle" onClick={() => setOpen('voice')} disabled={room <= 0}
        aria-label="Record a voice message" title="Voice message"><Icon name="mic" size={18} /></button>
      {busy && <span className="media-note">Preparing photos…</span>}
      {error && <span className="media-note error" role="alert">{error}</span>}
      {open === 'camera' && <CameraCapture onAdd={add} onClose={() => setOpen(null)} />}
      {open === 'voice' && <VoiceRecorder onAdd={add} onClose={() => setOpen(null)} />}
    </span>
  )
}

// What's attached so far, each with a remove button.
export function MediaTray({ media, setMedia }) {
  if (!media.length) return null
  return (
    <div className="media-tray">
      {media.map((m, i) => (
        <div key={i} className={`media-chip ${m.kind}`}>
          {m.kind === 'image' && <img src={m.src} alt={`Attachment ${i + 1}`} />}
          {m.kind === 'video' && <video src={m.src} muted playsInline />}
          {m.kind === 'audio' && <span className="media-chip-audio"><Icon name="mic" size={16} /> {clock(m.duration || 0)}</span>}
          <button type="button" className="media-chip-x" onClick={() => setMedia((list) => list.filter((_, n) => n !== i))} aria-label="Remove attachment">
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
      <span className="media-note">{media.length}/{MEDIA_MAX}</span>
    </div>
  )
}

// Showing attachments on a post or in a message. Several photos scroll
// sideways one at a time, like an Instagram carousel.
export function MediaView({ media, compact = false }) {
  const [zoom, setZoom] = useState(null)
  if (!media?.length) return null
  const images = media.filter((m) => m.kind === 'image')
  const others = media.filter((m) => m.kind !== 'image')
  return (
    <div className={`media-view ${compact ? 'compact' : ''}`}>
      {images.length > 0 && (
        <div className={`media-strip ${images.length > 1 ? 'many' : ''}`}>
          {images.map((m, i) => (
            <button key={i} type="button" className="media-photo" onClick={() => setZoom(m.src)} aria-label={`Open photo ${i + 1} of ${images.length}`}>
              <img src={m.src} alt="" loading="lazy" />
              {images.length > 1 && <span className="media-count">{i + 1}/{images.length}</span>}
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="modal-backdrop media-zoom" onClick={() => setZoom(null)} role="dialog" aria-label="Photo">
          <img src={zoom} alt="" />
        </div>
      )}
      {others.map((m, i) => (m.kind === 'video'
        ? <video key={i} className="media-video" src={m.src} controls playsInline preload="metadata" />
        : <audio key={i} className="media-audio" src={m.src} controls preload="metadata" />))}
    </div>
  )
}
