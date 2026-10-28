// Settings — everything about your account in one place, reached from the
// profile menu (VOIDAJ-Blueprint.md §10), laid out like Nuel's mockup: your
// card at the top, then Account, Privacy, Notifications, Verification,
// Payments (coming soon), Appearance, Security, Preferences, Help &
// Support, Terms & Policies and Data.
import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { TAGS, CHARTER } from '../data/seed.js'
import { Icon, IconTile } from '../components/Icons.jsx'
import { Avatar } from '../components/bits.jsx'
import { Eagle } from '../components/Eagle.jsx'

const SECTIONS = [
  { id: 'account', icon: 'user', tone: 'blue', label: 'Account', sub: 'Name, username, email, phone, password' },
  { id: 'privacy', icon: 'eye', tone: 'violet', label: 'Privacy', sub: 'Who sees your location and can message you' },
  { id: 'notifications', icon: 'bell', tone: 'orange', label: 'Notifications', sub: 'What you hear about, and how' },
  { id: 'verification', icon: 'badge-check', tone: 'green', label: 'Verification', sub: 'Identity and the Verified tick' },
  { id: 'payments', icon: 'wallet', tone: 'teal', label: 'Payments', sub: 'Wallet, payment methods — coming soon' },
  { id: 'appearance', icon: 'moon', tone: 'indigo', label: 'Appearance', sub: 'Light or dark mode' },
  { id: 'security', icon: 'lock', tone: 'red', label: 'Security', sub: 'Sign-ins and devices' },
  { id: 'preferences', icon: 'sparkle', tone: 'pink', label: 'Preferences', sub: 'Language, location, accessibility, interests' },
  { id: 'help', icon: 'info', tone: 'blue', label: 'Help & Support', sub: 'Get help or report a problem' },
  { id: 'terms', icon: 'book', tone: 'navy', label: 'Terms & Policies', sub: 'The VOIDAJ Charter and how we use your data' },
  { id: 'data', icon: 'layers', tone: 'yellow', label: 'Data', sub: 'Download your data or delete your account' },
]

export default function Settings() {
  // On phones /settings is the list itself; a section opens on its own.
  const { section: picked } = useParams()
  const section = picked ?? 'account'
  const { user, loading } = useApp()
  if (loading) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>
  if (!user) return <Navigate to="/auth" replace />
  const current = SECTIONS.find((s) => s.id === section)
  if (!current) return <Navigate to="/settings" replace />

  const Body = { account: Account, privacy: Privacy, security: Security, notifications: Notifications, verification: Verification, payments: Payments, appearance: Appearance, preferences: Preferences, help: Help, terms: Terms, data: Data }[section]
  return (
    <div className={`page settings-page settings2 ${picked ? 'is-section' : 'is-index'}`}>
      <header className="page-head"><h1>Settings</h1></header>
      <Link to="/profile/me" className="card settings-me card-link">
        <Avatar user={user} size={52} />
        <span><b>{user.name}</b><em>{user.handle}</em></span>
        <span className="btn primary small">Edit profile</span>
      </Link>
      <div className="settings-grid">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <NavLink key={s.id} to={`/settings/${s.id}`} end className={s.id === section ? 'active' : ''}>
              <IconTile name={s.icon} tone={s.tone} size={36} iconSize={17} />
              <span><strong>{s.label}</strong><span className="meta-dim">{s.sub}</span></span>
              <Icon name="chevron-right" size={16} className="settings-chev" />
            </NavLink>
          ))}
        </nav>
        <div className="settings-body">
          <Link to="/settings" className="settings-back"><Icon name="back" size={16} /> Settings</Link>
          <h2 className="settings-title">{current.label}</h2>
          <Body />
        </div>
      </div>
    </div>
  )
}

// ── Verification, Payments, Appearance, Terms ───────────────────────
function Verification() {
  const { user, refreshMe } = useApp()
  const [idNumber, setIdNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const verify = async (e) => {
    e.preventDefault()
    if (idNumber.trim().length < 6 || busy) return
    setBusy(true); setError('')
    try { await api.verifyId(idNumber.trim()); await refreshMe() } catch (err) { setError(err.message) }
    setBusy(false)
  }
  return (
    <>
      <Block title="Identity" sub="The Verified tick on your profile and VOIDAJ ID, and access to verified-only jobs.">
        {user.idVerified ? (
          <p className="settings-ok"><Icon name="badge-check" size={16} /> You’re verified.</p>
        ) : (
          <form className="settings-inline" onSubmit={verify}>
            <Field label="Government ID number" hint="NIN or passport number. Demo only — nothing is checked or stored yet.">
              <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. NIN" />
            </Field>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn primary small" disabled={idNumber.trim().length < 6 || busy}>{busy ? 'Verifying…' : 'Verify me'}</button>
          </form>
        )}
      </Block>
      <Block title="Email and phone">
        <p className="meta-dim">Confirming your email and phone is coming soon.</p>
      </Block>
    </>
  )
}

// From Nuel's payment designs (Oct 27). Not built yet — see DO-LATER.md.
function Payments() {
  const rows = [
    ['wallet', 'Wallet', 'Add funds and pay for things on VOIDAJ'],
    ['tag', 'Payment methods', 'Card, bank transfer, mobile money, Apple Pay, Google Pay'],
    ['rocket', 'Promote a business or post', 'Plans from a few days to two weeks'],
    ['award', 'Premium', 'Custom profile designs, advanced search, priority support'],
    ['ticket', 'Event tickets', 'Regular, VIP and group tickets'],
    ['hand-coins', 'Quick Job payments', 'Held safely until the job is done'],
    ['heart', 'Support a creator', 'One-off or monthly tips'],
    ['clock', 'Transaction history', 'Everything you’ve paid and received'],
  ]
  return (
    <>
      <div className="card settings-soon-card">
        <IconTile name="wallet" tone="teal" size={52} />
        <div><strong>Payments are coming soon</strong><span className="meta-dim">Here’s what’s on the way.</span></div>
      </div>
      <ul className="settings-pay-list">
        {rows.map(([icon, title, sub]) => (
          <li key={title} className="card"><Icon name={icon} size={18} /><span><b>{title}</b><em>{sub}</em></span><span className="soon-badge">Soon</span></li>
        ))}
      </ul>
    </>
  )
}

function Appearance() {
  return <ThemeBlock />
}

function Terms() {
  return (
    <>
      <Block title="The VOIDAJ Charter" sub="Applies in every community, in every city.">
        <ol className="settings-charter">{CHARTER.map((c) => <li key={c}>{c}</li>)}</ol>
      </Block>
      <Block title="Your data">
        <p className="meta-dim">Your location is only shared at the level you choose in Privacy. You can download everything we hold about you, or delete your account, under Data.</p>
        <Link to="/settings/data" className="btn ghost small">Go to Data</Link>
      </Block>
    </>
  )
}

// ── Building blocks ──────────────────────────────────────────────────
function Block({ title, sub, children, danger }) {
  return (
    <section className={`card settings-block ${danger ? 'danger' : ''}`}>
      <div className="settings-block-head">
        <strong>{title}</strong>
        {sub && <span className="meta-dim">{sub}</span>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="settings-field">
      <span className="settings-label">{label}</span>
      {children}
      {hint && <span className="meta-dim settings-hint">{hint}</span>}
    </label>
  )
}

function Toggle({ label, sub, checked, onChange, disabled }) {
  return (
    <label className={`settings-toggle ${disabled ? 'disabled' : ''}`}>
      <span><strong>{label}</strong>{sub && <span className="meta-dim">{sub}</span>}</span>
      <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  )
}

function Choice({ name, value, options, onChange }) {
  return (
    <div className="settings-choices" role="radiogroup">
      {options.map((o) => (
        <label key={o.id} className={`settings-choice ${value === o.id ? 'on' : ''}`}>
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
          <span><strong>{o.label}</strong><span className="meta-dim">{o.sub}</span></span>
        </label>
      ))}
    </div>
  )
}

function Soon({ children }) {
  return <p className="settings-soon"><span className="addhub-soon">Soon</span> {children}</p>
}

// Save state for a form: a brief "Saved" after success, the server's
// message after a failure.
function useSaver() {
  const [state, setState] = useState({ busy: false, msg: null, ok: false })
  const run = async (fn, okMsg = 'Saved') => {
    setState({ busy: true, msg: null, ok: false })
    try { await fn(); setState({ busy: false, msg: okMsg, ok: true }) }
    catch (e) { setState({ busy: false, msg: e.message, ok: false }) }
  }
  const note = state.msg && <span className={`settings-note ${state.ok ? 'ok' : 'bad'}`} role="status">{state.ok && <Icon name="check" size={13} />} {state.msg}</span>
  return { busy: state.busy, run, note }
}

// Settings that save the moment they change (toggles and choices).
function useInstantSettings() {
  const { user, saveProfile } = useApp()
  const { run, note } = useSaver()
  const set = (patch) => run(() => saveProfile({ settings: patch }))
  return { settings: user.settings, set, note }
}

// ── Account ──────────────────────────────────────────────────────────
function Account() {
  const { user, saveProfile, setUser } = useApp()
  const [info, setInfo] = useState({ name: user.name, handle: (user.handle || '').replace(/^@/, ''), phone: user.phone || '' })
  const infoSave = useSaver()
  const [email, setEmail] = useState({ email: user.email || '', password: '' })
  const emailSave = useSaver()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const pwSave = useSaver()

  const saveInfo = (e) => { e.preventDefault(); infoSave.run(() => saveProfile(info)) }
  const saveEmail = (e) => {
    e.preventDefault()
    emailSave.run(async () => { setUser(await api.changeEmail(email.email, email.password)); setEmail((f) => ({ ...f, password: '' })) }, 'Email updated')
  }
  const savePw = (e) => {
    e.preventDefault()
    pwSave.run(async () => {
      if (pw.next !== pw.confirm) throw new Error('The new passwords don’t match.')
      await api.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
    }, 'Password changed — other devices have been signed out')
  }

  return (
    <>
      <Block title="Personal information" sub="How you appear across Voidaj.">
        <form className="settings-form" onSubmit={saveInfo}>
          <div className="settings-row">
            <Field label="Name"><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required /></Field>
            <Field label="Username" hint="3–20 letters, numbers or underscores.">
              <span className="settings-prefixed"><span>@</span><input value={info.handle} onChange={(e) => setInfo({ ...info, handle: e.target.value })} required /></span>
            </Field>
          </div>
          <Field label="Phone" hint="Optional. Only you can see this.">
            <input type="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="+234 801 234 5678" />
          </Field>
          <div className="settings-actions">
            <button className="btn primary small" disabled={infoSave.busy}>Save</button>
            {infoSave.note}
          </div>
        </form>
        <p className="meta-dim settings-foot">Headline, bio, skills and portfolio are edited on <Link to="/profile/me">your profile</Link>.</p>
      </Block>

      <Block title="Email" sub="Used to sign in. Confirm with your password to change it.">
        <form className="settings-form" onSubmit={saveEmail}>
          <div className="settings-row">
            <Field label="Email address"><input type="email" value={email.email} onChange={(e) => setEmail({ ...email, email: e.target.value })} required /></Field>
            <Field label="Current password"><input type="password" value={email.password} onChange={(e) => setEmail({ ...email, password: e.target.value })} required autoComplete="current-password" /></Field>
          </div>
          <div className="settings-actions">
            <button className="btn primary small" disabled={emailSave.busy || email.email === user.email}>Update email</button>
            {emailSave.note}
          </div>
        </form>
      </Block>

      <Block title="Password" sub="Changing it signs you out everywhere else.">
        <form className="settings-form" onSubmit={savePw}>
          <Field label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></Field>
          <div className="settings-row">
            <Field label="New password" hint="At least 6 characters."><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} autoComplete="new-password" /></Field>
            <Field label="Confirm new password"><input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={6} autoComplete="new-password" /></Field>
          </div>
          <div className="settings-actions">
            <button className="btn primary small" disabled={pwSave.busy}>Change password</button>
            {pwSave.note}
          </div>
        </form>
      </Block>

      <Block title="Account" sub="The basics of your membership.">
        <ul className="settings-facts">
          <li><span>Member since</span><strong>{user.createdAt ? new Date(Number(user.createdAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</strong></li>
          <li><span>ID verification</span><strong>{user.idVerified ? <span className="verified-tag"><Icon name="badge-check" size={13} /> Verified</span> : <Link to="/jobs">Get verified</Link>}</strong></li>
          <li><span>Communities</span><strong>{user.communities.length}</strong></li>
        </ul>
        <p className="meta-dim settings-foot">To leave Voidaj, go to <Link to="/settings/data">Data</Link>.</p>
      </Block>
    </>
  )
}

// ── Privacy ──────────────────────────────────────────────────────────
function Privacy() {
  const { user, saveProfile } = useApp()
  const { settings, set, note } = useInstantSettings()
  const loc = useSaver()
  return (
    <>
      <Block title="Location visibility" sub="What other members see about where you are.">
        <Choice name="privacy" value={user.privacy} onChange={(v) => loc.run(() => saveProfile({ privacy: v }))} options={[
          { id: 'exact', label: 'Show my area', sub: `${user.area || 'Your area'}, ${user.city || 'Lagos'}` },
          { id: 'city-only', label: 'City only', sub: user.city || 'Lagos' },
          { id: 'hidden', label: 'Hidden', sub: 'No location on your profile' },
        ]} />
        {loc.note}
      </Block>

      <Block title="Who can message you" sub="Applies to new conversations. People you’ve already talked to can always reply.">
        <Choice name="messages" value={settings.messages} onChange={(v) => set({ messages: v })} options={[
          { id: 'everyone', label: 'Everyone', sub: 'Any member can start a conversation' },
          { id: 'connections', label: 'Connections only', sub: 'Only people you’re connected with' },
          { id: 'nobody', label: 'Nobody', sub: 'No new conversations' },
        ]} />
        {note}
      </Block>

      <Block title="Profile visibility">
        <Soon>Your profile is visible to everyone right now. Members-only and connections-only profiles are coming.</Soon>
      </Block>
    </>
  )
}

// ── Security ─────────────────────────────────────────────────────────
function describeAgent(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  return { label: os ? `${browser} on ${os}` : browser, phone: /iPhone|Android/.test(ua) }
}

function Security() {
  const [logins, setLogins] = useState(null)
  const out = useSaver()
  useEffect(() => { api.listLogins().then(setLogins).catch(() => setLogins([])) }, [])
  return (
    <>
      <Block title="Recent sign-ins" sub="Where your account has been signed in. Don’t recognise one? Change your password.">
        {logins === null ? <p className="meta-dim">Loading…</p> : logins.length === 0 ? (
          <p className="meta-dim">No sign-ins recorded yet — they’ll appear from your next sign-in.</p>
        ) : (
          <ul className="settings-logins">
            {logins.map((l, i) => {
              const d = describeAgent(l.userAgent)
              return (
                <li key={l.id}>
                  <span className="notif-icon"><Icon name={d.phone ? 'phone' : 'globe'} size={16} /></span>
                  <span className="settings-login-text">
                    <strong>{d.label}{i === 0 && <span className="you-badge">Latest</span>}</strong>
                    <span className="meta-dim">{new Date(l.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{l.ip && ` · ${l.ip}`}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <div className="settings-actions">
          <button className="btn ghost small" disabled={out.busy} onClick={() => out.run(api.logoutOthers, 'Signed out of every other device')}>
            <Icon name="log-out" size={14} /> Sign out other devices
          </button>
          {out.note}
        </div>
      </Block>

      <Block title="Password">
        <p className="meta-dim">Change your password from <Link to="/settings">Account</Link>.</p>
      </Block>

      <Block title="Two-factor authentication">
        <Soon>A code from your phone on top of your password when you sign in.</Soon>
      </Block>
    </>
  )
}

// ── Notifications ────────────────────────────────────────────────────
function Notifications() {
  const { settings, set, note } = useInstantSettings()
  const n = settings.notify
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'))

  const setPush = async (on) => {
    if (on && perm === 'default') {
      const p = await Notification.requestPermission()
      setPerm(p)
      if (p !== 'granted') return
    }
    set({ notify: { push: on } })
  }

  return (
    <>
      <Block title="What to notify me about" sub="These decide what shows in your Notifications and on the bell.">
        <div className="settings-toggles">
          <Toggle label="Messages" sub="New direct messages" checked={n.messages} onChange={(v) => set({ notify: { messages: v } })} />
          <Toggle label="Jobs" sub="New jobs that match what you do, and interest in jobs you post" checked={n.jobs} onChange={(v) => set({ notify: { jobs: v } })} />
          <Toggle label="Communities" sub="Reports to review in communities you help run" checked={n.community} onChange={(v) => set({ notify: { community: v } })} />
        </div>
        {note}
        <Soon>Event reminders, once you can RSVP to events.</Soon>
      </Block>

      <Block title="How to reach me">
        <div className="settings-toggles">
          <Toggle
            label="Browser notifications" checked={n.push && perm === 'granted'} onChange={setPush} disabled={perm === 'unsupported' || perm === 'denied'}
            sub={perm === 'denied' ? 'Blocked in your browser’s site settings — allow notifications there first.' : perm === 'unsupported' ? 'This browser doesn’t support notifications.' : 'A pop-up on this device when a job you can do is posted'}
          />
        </div>
        <Soon>Email notifications.</Soon>
      </Block>
    </>
  )
}

// ── Appearance ───────────────────────────────────────────────────────
const THEME_OPTIONS = [
  { id: 'system', icon: 'monitor', label: 'System', sub: 'Match this device' },
  { id: 'light', icon: 'sun', label: 'Light', sub: 'Always light' },
  { id: 'dark', icon: 'moon', label: 'Dark', sub: 'Always dark' },
]

function ThemeBlock() {
  const { theme, setTheme } = useApp()
  return (
    <Block title="Appearance" sub="Choose how VOIDAJ looks. System follows your phone or computer’s setting.">
      <div className="theme-picker" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={theme === o.id} aria-label={`${o.label} theme`}
            className={`theme-option theme-${o.id} ${theme === o.id ? 'on' : ''}`} onClick={() => setTheme(o.id).catch(() => {})}>
            <span className="theme-swatch" aria-hidden="true"><span /><span /></span>
            <span className="theme-option-label"><Icon name={o.icon} size={15} /> {o.label}</span>
            <span className="meta-dim">{o.sub}</span>
          </button>
        ))}
      </div>
    </Block>
  )
}

// ── Preferences ──────────────────────────────────────────────────────
function Preferences() {
  const { user, saveProfile } = useApp()
  const { settings, set, note } = useInstantSettings()
  const [place, setPlace] = useState({ city: user.city || 'Lagos', area: user.area || '' })
  const placeSave = useSaver()
  const [interests, setInterests] = useState(user.interests)
  const interestSave = useSaver()
  const toggleTag = (t) => setInterests((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]))

  return (
    <>
      <Block title="Language">
        <Field label="App language">
          <select className="job-select" value={settings.language} onChange={(e) => set({ language: e.target.value })}>
            <option value="en">English</option>
          </select>
        </Field>
        <Soon>Yoruba, Hausa, Igbo, Pidgin and French.</Soon>
      </Block>

      <Block title="Location" sub="Your home base — it shapes My City, nearby jobs and local events.">
        <form className="settings-form" onSubmit={(e) => { e.preventDefault(); placeSave.run(() => saveProfile(place)) }}>
          <div className="settings-row">
            <Field label="City"><input value={place.city} onChange={(e) => setPlace({ ...place, city: e.target.value })} required /></Field>
            <Field label="Area" hint="Shown only if your location visibility allows it."><input value={place.area} onChange={(e) => setPlace({ ...place, area: e.target.value })} placeholder="e.g. Yaba" /></Field>
          </div>
          <div className="settings-actions">
            <button className="btn primary small" disabled={placeSave.busy}>Save</button>
            {placeSave.note}
          </div>
        </form>
      </Block>

      <Block title="Accessibility">
        <div className="settings-toggles">
          <Toggle label="Reduce motion" sub="Turn off animations and moving effects" checked={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
          <Toggle label="Larger text" sub="Make everything a little bigger" checked={settings.largeText} onChange={(v) => set({ largeText: v })} />
        </div>
        {note}
      </Block>

      <Block title="Content preferences" sub="Your interests decide which people, communities and events are suggested to you.">
        <div className="settings-tags">
          {Object.entries(TAGS).map(([id, t]) => (
            <button key={id} type="button" className={`settings-tag ${interests.includes(id) ? 'on' : ''}`} aria-pressed={interests.includes(id)} onClick={() => toggleTag(id)}>
              {interests.includes(id) && <Icon name="check" size={12} />} {t.label}
            </button>
          ))}
        </div>
        <div className="settings-actions">
          <button className="btn primary small" disabled={interestSave.busy} onClick={() => interestSave.run(() => saveProfile({ interests }))}>Save interests</button>
          {interestSave.note}
        </div>
      </Block>
    </>
  )
}

// ── Help & Support ───────────────────────────────────────────────────
const FAQ = [
  ['How do I start a community?', 'Open Add Hub and choose Community. You become its owner and can appoint admins and moderators from its Manage tab.'],
  ['How do I get verified?', 'Go to Quick Jobs and choose Get verified. Verified members can take verified-only jobs.'],
  ['Who can see where I am?', 'Only what you allow in Settings → Privacy → Location visibility.'],
  ['How do I report something?', 'Every post and comment has a Report button. A community’s moderators review reports.'],
]

function Help() {
  const { setAssistantOpen } = useApp()
  const [form, setForm] = useState({ kind: 'problem', body: '' })
  const send = useSaver()
  const submit = (e) => {
    e.preventDefault()
    send.run(async () => { await api.sendSupport({ ...form, page: document.referrer }); setForm({ kind: 'problem', body: '' }) }, 'Sent — thank you. The team reads every report.')
  }
  return (
    <>
      <Block title="Help">
        <div className="settings-faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p className="meta-dim">{a}</p></details>)}
        </div>
      </Block>

      <Block title="Report a problem" sub="Something broken, confusing or missing? Tell us.">
        <form className="settings-form" onSubmit={submit}>
          <Field label="What kind of thing is it?">
            <select className="job-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="problem">Something isn’t working</option>
              <option value="question">I have a question</option>
              <option value="idea">I have an idea</option>
            </select>
          </Field>
          <Field label="Details">
            <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="What happened, and what did you expect?" required />
          </Field>
          <div className="settings-actions">
            <button className="btn primary small" disabled={send.busy || form.body.trim().length < 5}>Send</button>
            {send.note}
          </div>
        </form>
      </Block>

      <Block title="Contact support" sub="For quick questions about how Voidaj works, the Companion can usually answer straight away.">
        <button className="btn brand-outline small" onClick={() => setAssistantOpen(true)}><Eagle size={18} /> Ask the Companion</button>
      </Block>
    </>
  )
}

// ── Data ─────────────────────────────────────────────────────────────
function Data() {
  const { setUser } = useApp()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const del = useSaver()

  const remove = (e) => {
    e.preventDefault()
    del.run(async () => {
      await api.deleteAccount(password)
      setUser(null)
      navigate('/', { replace: true })
    }, 'Account deleted')
  }

  return (
    <>
      <Block title="Download your data" sub="A copy of everything Voidaj holds about you — profile, communities, posts, comments, messages, jobs and sign-ins — as one JSON file.">
        <a className="btn ghost small" href={api.exportUrl} download><Icon name="arrow-down" size={14} /> Download my data</a>
      </Block>

      <Block title="Delete your account" sub="This can’t be undone." danger>
        <ul className="settings-consequences">
          <li>Your profile, voices, connections, private messages and sign-in are removed.</li>
          <li>Your posts and comments stay in their threads, credited to “Former member”.</li>
          <li>Jobs you posted are closed. Communities you own pass to their most senior remaining member.</li>
        </ul>
        {!confirming ? (
          <button className="btn danger small" onClick={() => setConfirming(true)}><Icon name="trash" size={14} /> Delete my account</button>
        ) : (
          <form className="settings-form" onSubmit={remove}>
            <Field label="Enter your password to confirm">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" autoFocus />
            </Field>
            <div className="settings-actions">
              <button className="btn danger small" disabled={del.busy || !password}>Permanently delete</button>
              <button type="button" className="btn ghost small" onClick={() => { setConfirming(false); setPassword('') }}>Cancel</button>
              {del.note}
            </div>
          </form>
        )}
        <Soon>Deactivating — hiding your account for a while without deleting it.</Soon>
      </Block>
    </>
  )
}
