// VOIDAJ ID — Digital ID and Digital Card as one feature: a card with the
// member's photo, name, @username and verification, and a QR code that
// opens their VOIDAJ profile. Share it, show it from your phone, or save
// the QR as an image. Anyone who scans it lands back in VOIDAJ.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { useApp } from '../state.jsx'
import { Avatar } from '../components/bits.jsx'
import { Icon } from '../components/Icons.jsx'
import { VoidajMark } from '../components/VoidajMark.jsx'

const profileUrl = (u) => `${window.location.origin}${u.handle ? `/u/${u.handle.replace(/^@/, '')}` : `/profile/${u.id}`}`

export default function IdCard() {
  const { user, profile, loading } = useApp()
  const [qr, setQr] = useState('')
  const [png, setPng] = useState('')
  const [copied, setCopied] = useState(false)
  const url = user ? profileUrl(user) : ''

  useEffect(() => {
    if (!url) return
    // Ink on white keeps it scannable in any light; high error correction
    // so a scuffed screen or print still reads.
    const opts = { errorCorrectionLevel: 'H', margin: 1, color: { dark: '#0b0b0bff', light: '#ffffffff' } }
    QRCode.toString(url, { ...opts, type: 'svg' }).then(setQr).catch(() => {})
    QRCode.toDataURL(url, { ...opts, width: 1024 }).then(setPng).catch(() => {})
  }, [url])

  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth?mode=login" replace />

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${profile.name} on VOIDAJ`, text: 'Find me on VOIDAJ', url }); return } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { window.prompt('Copy this link:', url) }
  }

  return (
    <div className="page id-page">
      <section className="page-head">
        <div>
          <h1><Icon name="badge-check" size={22} /> VOIDAJ ID</h1>
          <p className="meta-dim">Your digital card. Anyone who scans it goes straight to your profile.</p>
        </div>
      </section>

      <article className="id-card" aria-label="Your VOIDAJ ID card">
        <header className="id-card-top">
          <VoidajMark size={34} />
          <span className="brand-word">VOIDAJ</span>
          <span className="id-card-kind">ID</span>
        </header>
        <div className="id-card-person">
          <span className="id-photo"><Avatar user={profile} size={76} /></span>
          <div>
            <strong className="id-card-name">{profile.name}</strong>
            <span className="id-card-handle">{profile.handle}</span>
            {profile.title && <span className="id-card-title">{profile.title}</span>}
          </div>
        </div>
        <div className="id-card-bottom">
          <div className="id-card-status">
            {profile.idVerified
              ? <span className="id-verified"><Icon name="badge-check" size={14} /> Verified member</span>
              : <span className="id-unverified">Not verified yet</span>}
            <span className="id-card-city"><Icon name="map-pin" size={12} /> {profile.city || 'Lagos'}</span>
            <span className="id-card-url">{url.replace(/^https?:\/\//, '')}</span>
          </div>
          <div className="id-qr" aria-label="QR code to your profile" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </article>

      <div className="id-actions">
        <button type="button" className="btn primary" onClick={share}><Icon name={copied ? 'check' : 'send'} size={15} /> {copied ? 'Link copied' : 'Share my ID'}</button>
        {png && <a className="btn ghost" href={png} download={`voidaj-${(profile.handle || 'id').replace(/^@/, '')}-qr.png`}><Icon name="arrow-down" size={15} /> Save QR code</a>}
        <Link to="/profile/me" className="btn ghost"><Icon name="user" size={15} /> View my profile</Link>
      </div>

      {!profile.idVerified && (
        <p className="meta-dim id-note">
          Want the <strong>Verified</strong> tick on your card? <Link to="/jobs">Verify your ID in Quick Jobs</Link>.
        </p>
      )}
    </div>
  )
}
