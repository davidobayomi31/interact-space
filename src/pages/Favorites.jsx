// Saved — everything the member has hearted, in one place, filterable by
// kind. Reached from the profile menu. Saved in this browser for now (see favorites.js).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons.jsx'
import { useFavorites, removeFavorite } from '../favorites.js'

const KINDS = [
  { id: 'all', label: 'All' },
  { id: 'community', label: 'Communities', icon: 'community' },
  { id: 'post', label: 'Posts', icon: 'chat' },
  { id: 'person', label: 'People', icon: 'user' },
  { id: 'job', label: 'Jobs', icon: 'wrench' },
  { id: 'event', label: 'Events', icon: 'calendar' },
]
const ICON = Object.fromEntries(KINDS.filter((k) => k.icon).map((k) => [k.id, k.icon]))

export default function Favorites() {
  const favorites = useFavorites()
  const [kind, setKind] = useState('all')
  const shown = kind === 'all' ? favorites : favorites.filter((f) => f.kind === kind)
  const count = (id) => (id === 'all' ? favorites.length : favorites.filter((f) => f.kind === id).length)

  return (
    <div className="page notif-page">
      <section className="discover-hero">
        <h1><Icon name="heart" size={24} /> Saved</h1>
        <p className="meta-dim">Your favorites: communities, posts, people, jobs and events you’ve hearted to come back to.</p>
      </section>

      <div className="filter-row" role="tablist" aria-label="What to show">
        {KINDS.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
            {k.icon && <Icon name={k.icon} size={13} />} {k.label}
            {count(k.id) > 0 && <span className="filter-count">{count(k.id)}</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card ghost-card left" style={{ marginTop: 24 }}>
          <Icon name="heart" size={22} />
          <p><strong>{favorites.length ? 'Nothing saved here yet.' : 'No favorites yet.'}</strong><br />
            Tap the <Icon name="heart" size={13} /> on any community, post, person, job or event to save it here.
            {' '}<Link to="/explore">Explore the city</Link> to find some.
          </p>
        </div>
      ) : (
        <div className="notif-list">
          {shown.map((f) => (
            <div key={`${f.kind}-${f.id}`} className="card notif-item fav-item card-link">
              <span className="notif-icon"><Icon name={ICON[f.kind] ?? 'heart'} size={17} /></span>
              <span className="notif-text">
                <Link to={f.href} className="stretched"><strong>{f.title}</strong></Link>
                {f.subtitle && <span className="meta-dim fav-sub">{f.subtitle}</span>}
              </span>
              <button type="button" className="icon-btn fav-btn on" onClick={() => removeFavorite(f.kind, f.id)} aria-label={`Remove ${f.title} from favorites`} title="Remove from favorites">
                <Icon name="heart" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
