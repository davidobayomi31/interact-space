// A voice, as someone who was given its @username sees it. Shows only the
// sections the owner picked, in their order — and nothing that links back
// to the owner's main profile.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, PostCard } from '../components/bits.jsx'
import { PortfolioGrid } from '../components/Portfolio.jsx'
import { sectionMeta } from '../components/Voices.jsx'

function Section({ id, children }) {
  const meta = sectionMeta(id)
  return (
    <section className="vv-section">
      <h2 className="vv-section-head"><Icon name={meta.icon} size={15} /> {meta.label}</h2>
      {children}
    </section>
  )
}

function Body({ id, c }) {
  switch (id) {
    case 'about':
      return c.about?.text ? <p className="vv-about">{c.about.text}</p> : null
    case 'interests':
    case 'skills': {
      const t = c[id]?.tags ?? []
      return t.length ? <div className="pills">{t.map((x) => <span key={x} className={`pill ${id === 'skills' ? 'skill' : ''}`}>{x}</span>)}</div> : null
    }
    case 'work':
      return c.work?.items?.length ? (
        <ul className="vv-list">
          {c.work.items.map((w, i) => (
            <li key={i}><strong>{w.role}</strong>{w.org && <span> · {w.org}</span>}{w.years && <span className="meta-dim"> · {w.years}</span>}</li>
          ))}
        </ul>
      ) : null
    case 'offers':
      return c.offers?.items?.length ? (
        <div className="vv-offers">
          {c.offers.items.map((o, i) => (
            <article key={i} className="vv-offer">
              <div className="vv-offer-top"><strong>{o.title}</strong>{o.rate && <span className="vv-rate">{o.rate}</span>}</div>
              {o.detail && <p className="meta-dim">{o.detail}</p>}
            </article>
          ))}
        </div>
      ) : null
    case 'portfolio':
      return <PortfolioGrid items={c.portfolio?.items} />
    case 'communities':
      return c.communities?.list?.length ? (
        <div className="vv-communities">
          {c.communities.list.map((cm) => (
            <Link key={cm.id} to={`/community/${cm.id}`} className="vv-community" style={{ '--accent': cm.accent }}>
              <strong>{cm.name}</strong>
              {cm.tagline && <span className="meta-dim">{cm.tagline}</span>}
            </Link>
          ))}
        </div>
      ) : null
    case 'posts':
      return c.posts?.list?.length
        ? <div className="stack">{c.posts.list.map((p) => <PostCard key={p.id} post={p} />)}</div>
        : null
    default:
      return null
  }
}

// The picked sections of a voice, skipping any with nothing in them. Also
// used by the owner's own profile page when they switch to a voice.
export function VoiceSections({ voice }) {
  const c = voice.content
  const filled = voice.sections.filter((id) => ({
    about: !!c.about?.text, interests: !!c.interests?.tags?.length, skills: !!c.skills?.tags?.length,
    work: !!c.work?.items?.length, offers: !!c.offers?.items?.length, portfolio: !!c.portfolio?.items?.length,
    communities: !!c.communities?.list?.length, posts: !!c.posts?.list?.length,
  })[id])
  if (!filled.length) return <p className="meta-dim vv-empty">Nothing to show here yet.</p>
  return filled.map((id) => <Section key={id} id={id}><Body id={id} c={c} /></Section>)
}

export default function Voice() {
  const { handle } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null); setError('')
    api.getVoice(handle).then(setData).catch((e) => setError(e.message))
  }, [handle])

  if (error) {
    return (
      <div className="page vv-page">
        <div className="card ghost-card vv-missing">
          <Icon name="user" size={24} />
          <p><strong>No one here by @{handle}.</strong><br />Check the username with the person who gave it to you.</p>
          <Link to="/" className="btn ghost small">Go to the city</Link>
        </div>
      </div>
    )
  }
  if (!data) return <div className="page"><p className="meta-dim" style={{ marginTop: 40 }}>Loading…</p></div>

  const { voice, owner } = data

  return (
    <div className="page vv-page">
      <header className="vv-hero">
        {owner && <Avatar user={owner} size={76} />}
        <div className="vv-hero-text">
          <span className="voice-tag">{voice.name}</span>
          <h1>{owner?.name}{owner?.idVerified && <span className="verified-tag"><Icon name="badge-check" size={13} /> Verified</span>}</h1>
          <div className="meta-dim">@{voice.handle}</div>
          {voice.headline && <p className="vv-headline">{voice.headline}</p>}
        </div>
      </header>

      <VoiceSections voice={voice} />

      <p className="meta-dim vv-foot"><Icon name="layers" size={12} /> One of {owner?.name?.split(' ')[0] ?? 'this person'}’s voices on Voidaj.</p>
    </div>
  )
}
