// #hashtag pages: every post carrying the tag. (@mentions go to /u/:handle,
// which the profile page already understands.)
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../api.js'
import { IconTile } from '../components/Icons.jsx'
import { FeedPost } from '../components/Feed.jsx'

export default function Tag() {
  const { tag } = useParams()
  const [posts, setPosts] = useState(null)
  useEffect(() => { setPosts(null); api.tagPosts(tag).then((d) => setPosts(d.posts)).catch(() => setPosts([])) }, [tag])
  return (
    <div className="page tag-page">
      <header className="page-head">
        <h1 className="tag-title"><span>#</span>{tag}</h1>
        <p className="meta-dim">{posts ? `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}` : 'Loading…'} · tap a #tag on any post to see more like it.</p>
      </header>
      <div className="feed-list">
        {posts?.length === 0 && (
          <div className="card feed-empty">
            <IconTile name="tag" tone="violet" size={52} />
            <strong>No posts with #{tag} yet</strong>
            <span className="meta-dim">Write #{tag} in a post and it shows up here.</span>
            <Link className="btn primary small" to="/add?pick=post">Write a post</Link>
          </div>
        )}
        {posts?.map((p) => <FeedPost key={p.id} post={p} />)}
      </div>
    </div>
  )
}
