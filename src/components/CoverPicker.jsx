// ── Cover photo picker ───────────────────────────────────────────────
// Choose a photo, see it straight away, and it uploads in the background.
// The photo is shrunk in the browser first (compressPhoto), then sent to
// /api/uploads, which stores it in Supabase Storage and returns its link.
// `value` is that link; `onChange` gets the new link, or '' when removed.
import { useRef, useState } from 'react'
import { Icon } from './Icons.jsx'
import { compressPhoto } from './Media.jsx'
import * as api from '../api.js'

export function CoverPicker({ value, onChange, kind, onBusy, label = 'Cover photo' }) {
  const input = useRef(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shown = preview || value

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(''); setBusy(true); onBusy?.(true)
    try {
      const photo = await compressPhoto(file)
      setPreview(photo.src)
      onChange(await api.uploadImage(photo.src, kind))
    } catch (err) {
      setPreview(null)
      setError(err.message)
    }
    setBusy(false); onBusy?.(false)
  }

  return (
    <div className="cover-picker">
      <span className="cover-picker-label">{label}</span>
      <button type="button" className={`cover-picker-frame ${shown ? 'has-photo' : ''}`} onClick={() => input.current?.click()} disabled={busy}
        aria-label={shown ? 'Change cover photo' : 'Add a cover photo'}>
        {shown && <img src={shown} alt="" />}
        <span className="cover-picker-cta">
          <Icon name={busy ? 'clock' : 'image'} size={18} />
          {busy ? 'Uploading…' : shown ? 'Change photo' : 'Add a cover photo'}
        </span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={pick} />
      <div className="cover-picker-foot">
        <span className="meta-dim">{error || 'A real photo of your people or place works best. JPG, PNG or HEIC.'}</span>
        {shown && !busy && <button type="button" className="link-btn" onClick={() => { setPreview(null); onChange('') }}>Remove</button>}
      </div>
    </div>
  )
}
