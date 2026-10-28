// Thread — a full post with vote-ranked, threaded comments. The Reddit
// structure the CEO wants to keep: communities + comment threads + voting.
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { findCommunity } from '../communities.js'
import { useApp } from '../state.jsx'
import * as api from '../api.js'
import { Icon } from '../components/Icons.jsx'
import { Avatar, FavoriteButton } from '../components/bits.jsx'
import { Vote } from '../components/Vote.jsx'
import { ReportButton } from '../components/ReportButton.jsx'
import { MediaView } from '../components/Media.jsx'

function CommentNode({ comment, depth, onReplied }) {
  const { user } = useApp()
  const navigate = useNavigate()
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const res = await api.addComment(comment.postId, { body: text, parentId: comment.id })
      setText(''); setReplying(false); onReplied(res)
    } catch { /* ignore */ }
    setBusy(false)
  }

  return (
    <div className={`comment ${depth > 0 ? 'nested' : ''}`}>
      <div className="comment-row">
        {!comment.hidden && (
          <Vote targetType="comment" targetId={comment.id} score={comment.score} myVote={comment.myVote} layout="vertical" />
        )}
        <div className="comment-body">
          {comment.hidden ? (
            <p className="comment-removed"><Icon name="shield" size={13} /> Removed by a moderator</p>
          ) : (
            <>
              <div className="comment-head">
                <Avatar user={comment.author} size={24} />
                <strong>{comment.author.name}</strong>
                <span className="meta-dim">· {comment.ago} ago</span>
              </div>
              <p className="comment-text">{comment.body}</p>
              <div className="comment-actions">
                <button className="link-btn" onClick={() => (user ? setReplying((r) => !r) : navigate('/auth'))}>
                  <Icon name="reply" size={13} /> Reply
                </button>
                <ReportButton targetType="comment" targetId={comment.id} />
              </div>
              {replying && (
                <form className="reply-box" onSubmit={submit}>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${comment.author.name.split(' ')[0]}…`} autoFocus />
                  <button className="btn primary small" disabled={!text.trim() || busy}>Reply</button>
                </form>
              )}
            </>
          )}
          {comment.replies?.length > 0 && (
            <div className="comment-children">
              {comment.replies.map((c) => <CommentNode key={c.id} comment={c} depth={depth + 1} onReplied={onReplied} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Thread() {
  const { id } = useParams()
  const { user } = useApp()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setData(null); setError(null)
    api.getPost(id).then(setData).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="page thread-page"><p className="meta-dim">{error}</p><Link to="/" className="btn ghost small">Back to the city</Link></div>
  if (!data) return <div className="page thread-page"><p className="meta-dim">Loading…</p></div>

  const { post, comments } = data
  const community = findCommunity(post.communityId)

  const addTopComment = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    try { const res = await api.addComment(post.id, { body: text }); setText(''); setData(res) }
    catch { /* ignore */ }
    setBusy(false)
  }

  return (
    <div className="page thread-page" style={{ '--accent': community?.accent ?? 'var(--gold)' }}>
      <div className="space-grid thread-grid">
      <div className="thread-main">
      <article className="card thread-post">
        <div className="post-card-row">
          <Vote targetType="post" targetId={post.id} score={post.score} myVote={post.myVote} layout="vertical" />
          <div className="post-card-body">
            {post.pinned && <span className="pin-badge">Pinned</span>}
            <div className="post-head">
              <Avatar user={post.author} size={30} />
              <div className="meta-dim">
                <strong className="post-author">{post.author.name}</strong> · {post.ago} ago
                {community && <> · in <Link to={`/community/${community.id}`} style={{ color: community.accent }}>{community.name}</Link></>}
                {!community && <> · {post.audience === 'city' ? <><Icon name="map-pin" size={12} /> {post.city}</> : <><Icon name="globe" size={12} /> Public</>}</>}
              </div>
            </div>
            <h1 className="thread-title">{post.title}</h1>
            {post.body && <p className="thread-body">{post.body}</p>}
            <MediaView media={post.media} />
            <div className="post-stats">
              <span className="post-stat"><Icon name="chat" size={14} /> {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>
              <ReportButton targetType="post" targetId={post.id} />
              <FavoriteButton label item={{ kind: 'post', id: post.id, title: post.title, subtitle: community ? `in ${community.name}` : '', href: `/post/${post.id}` }} />
            </div>
          </div>
        </div>
      </article>

      <section className="thread-comments">
        <div className="comments-head">
          <Icon name="chat" size={16} /> {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          <span className="meta-dim comments-sort">· sorted by most helpful</span>
        </div>

        {user ? (
          <form className="card composer thread-composer" onSubmit={addTopComment}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add your answer…" aria-label="Add a comment" />
            <button className="btn primary small" disabled={!text.trim() || busy}>Comment</button>
          </form>
        ) : (
          <div className="card sign-in-nudge">
            <span className="meta-dim">Sign in to join the discussion.</span>
            <button className="btn primary small" onClick={() => navigate('/auth')}>Sign in</button>
          </div>
        )}

        {comments.length === 0 && <p className="meta-dim empty-note">No comments yet — be the first to answer.</p>}
        {comments.map((c) => <CommentNode key={c.id} comment={c} depth={0} onReplied={setData} />)}
      </section>
      </div>

      {community && <ThreadSide community={community} postId={post.id} />}
      </div>
    </div>
  )
}

// Beside the thread: the community it belongs to, and what else is being
// discussed there, so the reader has somewhere to go next.
function ThreadSide({ community, postId }) {
  const { user, profile, joinCommunity } = useApp()
  const navigate = useNavigate()
  const [more, setMore] = useState([])
  useEffect(() => {
    api.listPosts({ community: community.id })
      .then((all) => setMore(all.filter((p) => p.id !== postId).slice(0, 4)))
      .catch(() => setMore([]))
  }, [community.id, postId])
  const joined = profile.communities.includes(community.id)

  return (
    <aside className="space-side thread-side">
      <div className="card side-card thread-community" style={{ '--accent': community.accent }}>
        <div className="person-head">
          <span className="community-glyph" style={{ color: community.accent }}><Icon name={community.icon} size={20} /></span>
          <div>
            <Link to={`/community/${community.id}`} className="card-title">{community.name}</Link>
            <div className="meta-dim"><Icon name="users" size={12} /> {community.memberCount.toLocaleString()} members</div>
          </div>
        </div>
        {community.tagline && <p className="card-desc">{community.tagline}</p>}
        <div className="card-actions">
          {joined
            ? <span className="joined-note"><Icon name="check" size={14} /> Joined</span>
            : <button className="btn primary small" onClick={() => (user ? joinCommunity(community.id) : navigate('/auth'))}>Join</button>}
          <Link to={`/community/${community.id}`} className="btn ghost small">Visit</Link>
        </div>
      </div>

      {more.length > 0 && (
        <div className="card side-card">
          <div className="side-card-head"><Icon name="chat" size={15} /> More in {community.name}</div>
          <div className="thread-more">
            {more.map((p) => (
              <Link key={p.id} to={`/post/${p.id}`} className="thread-more-item">
                <strong>{p.title}</strong>
                <span className="meta-dim">{p.score ?? 0} points · {p.commentCount} {p.commentCount === 1 ? 'comment' : 'comments'}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
