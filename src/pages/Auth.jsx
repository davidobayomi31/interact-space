// Sign in / create account. Real accounts replace the old fake profile.
import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { Icon } from '../components/Icons.jsx'
import { VoidajMark, VJ_PATH } from '../components/VoidajMark.jsx'
import * as api from '../api.js'

// Brand marks for the two sign-in buttons (each company's own logo, as
// their button guidelines ask).
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)
const AppleLogo = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.97.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.7-1.27z" />
  </svg>
)

// "Continue with Google / Apple". Each goes to the server, which hands the
// browser to Google or Apple and brings it back signed in. A provider whose
// keys aren't set yet shows its button greyed out.
function SocialSignIn() {
  const [on, setOn] = useState(null)
  useEffect(() => { api.authProviders().then(setOn).catch(() => setOn({ google: false, apple: false })) }, [])
  return (
    <div className="auth-social">
      {[['google', 'Google', <GoogleG key="g" />], ['apple', 'Apple', <AppleLogo key="a" />]].map(([id, label, logo]) => (
        on?.[id]
          ? <a key={id} href={`/api/auth/${id}/start`} className={`btn auth-social-btn ${id}`}>{logo} Continue with {label}</a>
          : <button key={id} type="button" className={`btn auth-social-btn ${id}`} disabled title={on ? `Sign in with ${label} isn’t set up yet` : undefined}>
              {logo} Continue with {label}{on && <em>Not set up yet</em>}
            </button>
      ))}
    </div>
  )
}

export default function Auth() {
  const { login, register } = useApp()
  const navigate = useNavigate()
  // ?mode=login opens on sign-in (the "Log in" link on the welcome card).
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'register')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  // A failed Google / Apple sign-in comes back as ?error=…
  const [error, setError] = useState(params.get('error') || '')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const user = mode === 'register'
        ? await register(form)
        : await login({ email: form.email, password: form.password })
      navigate(user.onboarded ? '/home' : '/welcome')
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  const switchTo = (m) => { setMode(m); setError('') }

  return (
    <div className="auth-screen">
      {/* The VJ mark, huge and faint, drifting behind the card. */}
      <svg className="auth-bg-mark" viewBox="230 410 794 462" aria-hidden="true">
        <defs>
          <linearGradient id="vj-auth-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3B82F6" /><stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <path d={VJ_PATH} />
      </svg>
      <span className="auth-orb one" aria-hidden="true" />
      <span className="auth-orb two" aria-hidden="true" />

      <div className="auth-card">
        <Link to="/" className="auth-logo" aria-label="VOIDAJ home">
          <svg className="auth-logo-mark" viewBox="230 410 794 462" aria-hidden="true"><path d={VJ_PATH} /></svg>
          <VoidajMark size={15} light />
        </Link>

        <div className="auth-mode-switch" role="tablist">
          <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => switchTo('register')}>Create account</button>
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchTo('login')}>Sign in</button>
        </div>

        <h1>{mode === 'register' ? <>Step into <span className="grad-text">VOIDAJ</span></> : <>Welcome back</>}</h1>
        <div className="auth-tagline"><span>Connect.</span><span>Discover.</span><span>Participate.</span></div>

        <SocialSignIn />
        <div className="auth-or"><span>or with email</span></div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label className="field">
              <span><Icon name="user" size={14} /> Name</span>
              <input value={form.name} onChange={set('name')} placeholder="Your name" autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span><Icon name="mail" size={14} /> Email</span>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className="field">
            <span><Icon name="lock" size={14} /> Password</span>
            <input type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </label>

          {error && <div className="auth-error"><Icon name="shield" size={14} /> {error}</div>}

          <button className="btn primary large full" disabled={busy}>
            {busy ? 'One moment…' : mode === 'register' ? 'Create account' : 'Sign in'}
            <Icon name="arrow" size={16} />
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'register' ? (
            <>Already have an account? <button className="link-btn" onClick={() => switchTo('login')}>Sign in</button></>
          ) : (
            <>New here? <button className="link-btn" onClick={() => switchTo('register')}>Create an account</button></>
          )}
        </div>
        <Link to="/" className="auth-explore meta-dim">← Keep exploring without an account</Link>
      </div>
    </div>
  )
}
