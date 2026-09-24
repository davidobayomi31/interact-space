// ── V1 Identity Builder — design preview ─────────────────────────────
// NOT live data. This page exists to show what a profile becomes once the
// Identity Builder ships (see ROADMAP.md, Phase 1): one identity holding
// several facets, each built from an AI conversation rather than a form.
// Everything here is hardcoded on purpose and clearly labelled as a preview.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons.jsx'

const PERSON = {
  name: 'David Obayomi',
  handle: '@david',
  area: 'Yaba',
  city: 'Lagos',
  color: '#1F5FA8',
  rating: { avg: 4.8, count: 34, reliability: 4.9, communication: 4.7, quality: 4.8 },
  trust: [
    { kind: 'Email', done: true },
    { kind: 'Phone', done: true },
    { kind: 'Government ID', done: true },
    { kind: 'Business reg. (CAC)', done: true },
  ],
}

const FACETS = [
  {
    id: 'professional',
    kind: 'Professional',
    icon: 'wrench',
    headline: 'Plumber · 9 years',
    summary: 'Residential plumbing across Lagos Mainland. Emergency call-outs, installations, and repairs.',
    sections: [
      {
        id: 'offer', label: 'I can help with', icon: 'zap',
        entries: [
          { label: 'Emergency pipe repair', detail: 'Burst pipes, major leaks — same day', rate: '₦15,000/visit', availability: 'Within 2 hrs' },
          { label: 'Bathroom & kitchen installation', detail: 'Full fit-out, fixtures supplied or yours', rate: 'From ₦80,000' },
          { label: 'Water heater servicing', detail: 'Electric and gas units', rate: '₦12,000' },
        ],
      },
      {
        id: 'seeking', label: 'I’m looking for', icon: 'compass',
        entries: [
          { label: 'Residential customers', detail: 'Yaba, Surulere, Ebute Metta' },
          { label: 'Contractor partnerships', detail: 'Ongoing work with builders and estate managers' },
          { label: 'An apprentice', detail: 'Willing to train someone serious' },
        ],
      },
      {
        id: 'skill', label: 'Skills & experience', icon: 'briefcase',
        entries: [
          { label: 'Pipe fitting & pressure systems', detail: '9 years' },
          { label: 'Certified — Lagos State Plumbers Assoc.', detail: 'Verified credential', verified: true },
          { label: 'Team lead', detail: 'Managed 4-person crew on estate contracts' },
        ],
      },
    ],
  },
  {
    id: 'business',
    kind: 'Business',
    icon: 'store',
    headline: 'Obayomi Plumbing Services',
    summary: 'Registered business · CAC verified · 3 staff · Serving Lagos Mainland since 2019.',
    sections: [
      {
        id: 'service', label: 'Services we offer', icon: 'zap',
        entries: [
          { label: 'Commercial maintenance contracts', detail: 'Offices, schools, estates', rate: 'Monthly retainer' },
          { label: 'Emergency response — 24/7 line', detail: 'Business customers only', availability: '24/7' },
        ],
      },
      {
        id: 'seeking', label: 'We’re looking for', icon: 'compass',
        entries: [
          { label: 'Estate management contracts', detail: 'Recurring maintenance work' },
          { label: 'Two qualified plumbers', detail: 'Full time, immediate start' },
        ],
      },
      {
        id: 'credential', label: 'Credentials', icon: 'shield',
        entries: [
          { label: 'CAC registered — RC 1847392', detail: 'Verified with Corporate Affairs Commission', verified: true },
          { label: 'Public liability insurance', detail: 'Verified document on file', verified: true },
        ],
      },
    ],
  },
  {
    id: 'personal',
    kind: 'Personal',
    icon: 'user',
    headline: 'Lagos · Football, home improvement, mentoring',
    summary: 'Off the clock. This facet is what neighbours and friends see.',
    sections: [
      {
        id: 'offer', label: 'Happy to help with', icon: 'heart',
        entries: [
          { label: 'Free advice for neighbours', detail: 'Ask before you call anyone — I’ll tell you if it’s simple' },
          { label: 'Mentoring young tradespeople', detail: 'Weekends' },
        ],
      },
      {
        id: 'seeking', label: 'Looking for', icon: 'compass',
        entries: [
          { label: 'A 5-a-side team', detail: 'Yaba area, weekday evenings' },
          { label: 'Friends into home improvement', detail: 'Swap tools and know-how' },
        ],
      },
    ],
  },
]

const COMMUNITIES = [
  { name: 'Lagos Home Improvement', accent: '#8A5D0B', icon: 'wrench' },
  { name: 'Yaba Local Business', accent: '#1F5FA8', icon: 'store' },
  { name: 'Lagos Tradespeople', accent: '#1B7F3B', icon: 'users' },
]

const ACTIVITY = [
  { icon: 'briefcase', text: 'Completed 12 jobs through Interact Space', meta: 'All rated 4+' },
  { icon: 'chat', text: 'Answers questions in Lagos Home Improvement', meta: '38 replies this month' },
  { icon: 'calendar', text: 'Hosted “Fix your own leak” workshop', meta: '24 attended' },
]

export default function ProfileVision() {
  const [active, setActive] = useState('professional')
  const facet = FACETS.find((f) => f.id === active)
  const initials = PERSON.name.split(' ').map((w) => w[0]).slice(0, 2).join('')

  return (
    <div className="page vision-page">
      {/* Honesty banner — this is a design preview, never presented as live */}
      <div className="vision-banner">
        <div className="vision-banner-tag"><Icon name="sparkle" size={13} /> Design preview</div>
        <p>
          This is what a profile becomes once the <strong>AI Identity Builder</strong> ships.
          Sample data — not a live account. Everything below is built by the AI during
          onboarding, in conversation, with no forms to fill in.
        </p>
        <Link to="/" className="btn ghost small"><Icon name="back" size={13} /> Back to the app</Link>
      </div>

      {/* Identity band */}
      <section className="vision-hero">
        <div className="vision-avatar" style={{ '--c': PERSON.color }}>{initials}</div>
        <div className="vision-hero-text">
          <h1>{PERSON.name} <span className="vision-handle">{PERSON.handle}</span></h1>
          <div className="vision-meta">
            <span><Icon name="map-pin" size={13} /> {PERSON.area}, {PERSON.city}</span>
            <span className="vision-stars">
              <Icon name="star" size={13} /> {PERSON.rating.avg}
              <em>({PERSON.rating.count} rated interactions)</em>
            </span>
          </div>
          <div className="vision-trust">
            {PERSON.trust.map((t) => (
              <span key={t.kind} className="vision-badge">
                <Icon name="badge-check" size={12} /> {t.kind}
              </span>
            ))}
          </div>
        </div>
        <div className="vision-hero-actions">
          <button className="btn brand-outline"><Icon name="message-circle" size={15} /> Message</button>
          <button className="btn primary"><Icon name="briefcase" size={15} /> Request a job</button>
        </div>
      </section>

      {/* Reputation, scored on three axes and earned from real jobs */}
      <section className="vision-rep">
        <div className="vision-rep-head"><Icon name="shield" size={15} /> Reputation — earned from completed jobs only</div>
        <div className="vision-rep-bars">
          {[
            ['Reliability', PERSON.rating.reliability],
            ['Communication', PERSON.rating.communication],
            ['Quality of work', PERSON.rating.quality],
          ].map(([label, val]) => (
            <div key={label} className="vision-rep-bar">
              <span className="vision-rep-label">{label}</span>
              <span className="vision-rep-track"><span className="vision-rep-fill" style={{ width: `${(val / 5) * 100}%` }} /></span>
              <span className="vision-rep-val">{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* One identity, several facets — not several accounts */}
      <div className="vision-facet-head">
        <div>
          <h2>One identity, several faces</h2>
          <p className="meta-dim">Same account. David chooses which side of himself each audience sees.</p>
        </div>
        <div className="vision-tabs" role="tablist">
          {FACETS.map((f) => (
            <button
              key={f.id} role="tab" aria-selected={active === f.id}
              className={`vision-tab ${active === f.id ? 'active' : ''}`}
              onClick={() => setActive(f.id)}
            >
              <Icon name={f.icon} size={14} /> {f.kind}
            </button>
          ))}
        </div>
      </div>

      <section className="vision-facet">
        <div className="vision-facet-title">
          <Icon name={facet.icon} size={18} />
          <div>
            <strong>{facet.headline}</strong>
            <p className="meta-dim">{facet.summary}</p>
          </div>
        </div>

        <div className="vision-sections">
          {facet.sections.map((s) => (
            <div key={s.id} className="vision-section">
              <div className="vision-section-head"><Icon name={s.icon} size={15} /> {s.label}</div>
              <div className="vision-entries">
                {s.entries.map((e) => (
                  <div key={e.label} className="vision-entry">
                    <div className="vision-entry-top">
                      <strong>{e.label}</strong>
                      {e.verified && <span className="vision-verified"><Icon name="badge-check" size={11} /> Verified</span>}
                    </div>
                    {e.detail && <p className="meta-dim">{e.detail}</p>}
                    {(e.rate || e.availability) && (
                      <div className="vision-entry-meta">
                        {e.rate && <span><Icon name="tag" size={11} /> {e.rate}</span>}
                        {e.availability && <span><Icon name="clock" size={11} /> {e.availability}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The profile connects outward into the rest of the network */}
      <div className="vision-bottom">
        <div className="vision-card">
          <div className="vision-section-head"><Icon name="community" size={15} /> My communities</div>
          <div className="vision-comm-list">
            {COMMUNITIES.map((c) => (
              <div key={c.name} className="vision-comm" style={{ '--c': c.accent }}>
                <span className="vision-comm-glyph"><Icon name={c.icon} size={14} /></span> {c.name}
              </div>
            ))}
          </div>
        </div>
        <div className="vision-card">
          <div className="vision-section-head"><Icon name="zap" size={15} /> My activity</div>
          <ul className="vision-activity">
            {ACTIVITY.map((a) => (
              <li key={a.text}>
                <Icon name={a.icon} size={14} />
                <div><span>{a.text}</span><em className="meta-dim">{a.meta}</em></div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* How it gets built — ties the page back to the roadmap */}
      <section className="vision-how">
        <div className="vision-how-tag"><Icon name="sparkle" size={13} /> How this gets built</div>
        <p>
          Nobody fills in this page. During onboarding the AI interviews you — “You said you’re a
          plumber. What area do you cover? Do you take emergency call-outs? Should I set up a
          business page too?” — and writes each answer straight into your profile as you talk.
          Every section above is one of those answers.
        </p>
        <p className="meta-dim">
          Because offers and needs are stored as structured entries rather than free text, the same
          data powers search: someone typing <em>“plumber in Yaba for a burst pipe this weekend”</em> finds David.
        </p>
      </section>
    </div>
  )
}
