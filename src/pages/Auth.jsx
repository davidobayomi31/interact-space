// Sign in / create account. Real accounts replace the old fake profile.
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../state.jsx'
import { Icon } from '../components/Icons.jsx'

export default function Auth() {
  const { login, register } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('register')
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

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark"><Icon name="globe" size={18} /></span>
          <span className="brand-name">Interact <em>Space</em></span>
        </Link>
        <h1>{mode === 'register' ? 'Join the city' : 'Welcome back'}</h1>
        <p className="meta-dim auth-sub">
          {mode === 'register'
            ? 'Create your account to join communities, post, and meet people.'
            : 'Sign in to your Interact Space account.'}
        </p>

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
            <>Already have an account? <button className="link-btn" onClick={() => { setMode('login'); setError('') }}>Sign in</button></>
          ) : (
            <>New here? <button className="link-btn" onClick={() => { setMode('register'); setError('') }}>Create an account</button></>
          )}
        </div>
        <Link to="/" className="auth-explore meta-dim">← Keep exploring without an account</Link>
      </div>
    </div>
  )
}
