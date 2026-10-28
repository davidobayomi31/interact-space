// Sign in / create account. Real accounts replace the old fake profile.
import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { Icon } from '../components/Icons.jsx'
import { VoidajMark, VJ_PATH } from '../components/VoidajMark.jsx'

export default function Auth() {
  const { login, register } = useApp()
  const navigate = useNavigate()
  // ?mode=login opens on sign-in (the "Log in" link on the welcome card).
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'register')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
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

        <h1>{mode === 'register' ? <>Step into <span className="grad-text">VOIDAJ</span></> : <>Welcome <span className="grad-text">back</span></>}</h1>
        <div className="auth-tagline"><span>Connect.</span><span>Discover.</span><span>Participate.</span></div>

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
