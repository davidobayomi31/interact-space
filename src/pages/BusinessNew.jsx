// Create Business — "Set up your business identity on VOIDAJ" (screen 3
// of Nuel's Business mockup): logo, name, category, description and
// location, then Create Business. The same form edits a business
// (/business/:id/edit), with a cover photo, contact details and hours.
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { CoverPicker } from '../components/CoverPicker.jsx'
import { compressPhoto } from '../components/Media.jsx'
import { CITIES } from '../components/NigeriaMap.jsx'
import { useBusinessMeta } from '../components/BusinessBits.jsx'

function LogoPicker({ value, name, onChange, onBusy }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); onBusy?.(true); setError('')
    try {
      const photo = await compressPhoto(file)
      onChange(await api.uploadImage(photo.src, 'business-logo'))
    } catch (err) { setError(err.message) }
    setBusy(false); onBusy?.(false)
  }
  const initials = (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div className="biz-logo-pick">
      <button type="button" className="biz-logo-img large" onClick={() => input.current?.click()} aria-label={value ? 'Change logo' : 'Add a logo'} disabled={busy}>
        {value ? <img src={value} alt="" /> : initials || <Icon name="store" size={30} />}
        <span className="biz-logo-cam"><Icon name={busy ? 'clock' : 'camera'} size={15} /></span>
      </button>
      <span className="meta-dim">{error || (value ? 'Tap to change your logo' : 'Add your logo')}</span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={pick} />
    </div>
  )
}

const blank = { name: '', category: '', description: '', city: '', area: '', logo: '', cover: '', phone: '', website: '', hours: '' }

export default function BusinessNew() {
  const { id } = useParams()
  const editing = !!id
  const { user, loading } = useApp()
  const meta = useBusinessMeta()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [isBusiness, setIsBusiness] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    if (!editing) { setForm({ ...blank, city: user.city || 'Lagos' }); return }
    api.getBusiness(id).then((b) => {
      if (!b.isOwner) { setError('Only the owner can edit this business.'); return }
      setForm(Object.fromEntries(Object.keys(blank).map((k) => [k, b[k] ?? ''])))
    }).catch((e) => setError(e.message))
  }, [user, id, editing])

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  if (error && !form) return <div className="page"><div className="card feed-empty"><strong>{error}</strong><Link to="/businesses">Explore businesses</Link></div></div>
  if (!form) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const b = editing ? await api.updateBusiness(id, form) : await api.createBusiness(form)
      navigate(`/business/${b.id}`, { replace: true })
    } catch (err) { setError(err.message); setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm(`Delete ${form.name}? Its listings, followers and reviews go with it. This can’t be undone.`)) return
    await api.deleteBusiness(id)
    navigate('/businesses', { replace: true })
  }

  return (
    <div className="page biz-new">
      <header className="page-head">
        <Link to={editing ? `/business/${id}` : '/add'} className="back-link"><Icon name="chevron-left" size={16} /> Back</Link>
        <h1>{editing ? 'Edit business' : 'Create Business'}</h1>
        <p className="meta-dim">Set up your business identity on VOIDAJ.</p>
      </header>

      <form className="card biz-form" onSubmit={submit}>
        <LogoPicker value={form.logo} name={form.name} onChange={(logo) => setForm((f) => ({ ...f, logo }))} onBusy={setUploading} />

        <label className="field"><span>Business name</span>
          <input value={form.name} onChange={set('name')} placeholder="e.g. Akinyede Estates" maxLength={80} required autoFocus={!editing} />
        </label>
        <label className="field"><span>Category</span>
          <select className="job-select" value={form.category} onChange={set('category')} required>
            <option value="" disabled>Pick a category</option>
            {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Description</span>
          <textarea rows={3} value={form.description} onChange={set('description')} maxLength={600} placeholder="What you do, e.g. Real estate · Property management · Sales & rentals" />
        </label>
        <div className="settings-row">
          <label className="field"><span>Location / service area</span>
            <select className="job-select" value={form.city} onChange={set('city')}>
              {CITIES.map((c) => <option key={c.id} value={c.name}>{c.name}, Nigeria</option>)}
            </select>
          </label>
          <label className="field"><span>Area (optional)</span>
            <input value={form.area} onChange={set('area')} placeholder="e.g. Lekki" maxLength={60} />
          </label>
        </div>

        {editing && (
          <>
            <CoverPicker kind="business-cover" label="Cover photo" value={form.cover} onChange={(cover) => setForm((f) => ({ ...f, cover }))} onBusy={setUploading} />
            <div className="settings-row">
              <label className="field"><span>Phone (optional)</span><input value={form.phone} onChange={set('phone')} placeholder="+234…" maxLength={30} inputMode="tel" /></label>
              <label className="field"><span>Website (optional)</span><input value={form.website} onChange={set('website')} placeholder="yourbusiness.com" maxLength={200} /></label>
            </div>
            <label className="field"><span>Opening hours (optional)</span><input value={form.hours} onChange={set('hours')} placeholder="Mon–Sat, 9am–6pm" maxLength={120} /></label>
          </>
        )}

        {!editing && (
          <label className="biz-toggle">
            <input type="checkbox" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} />
            <span><b>Mark as business account</b><em>Your business gets its own page, separate from your personal profile. You stay the owner.</em></span>
          </label>
        )}

        {error && <div className="auth-error"><Icon name="info" size={14} /> {error}</div>}
        <button className="btn primary large full" disabled={busy || uploading || !form.name.trim() || !form.category || (!editing && !isBusiness)}>
          {busy ? 'Saving…' : editing ? 'Save changes' : <>Create Business <Icon name="check" size={16} /></>}
        </button>
        {editing && <button type="button" className="btn danger small" onClick={remove}><Icon name="trash" size={14} /> Delete business</button>}
      </form>
    </div>
  )
}
