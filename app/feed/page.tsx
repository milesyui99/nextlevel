'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Rss, User, Users, Compass, Bell, LogOut,
  Heart, MessageCircle, Loader2, Send, ChevronDown, ChevronUp, ImageIcon, X,
} from 'lucide-react'

type Profile = {
  id: string
  username: string
  sport: string | null
  avatar_url: string | null
}

type RawPost = {
  id: string
  user_id: string | null
  content: string
  created_at: string
  media_url: string | null
}

type Post = RawPost & {
  profile: Profile | null
  likeCount: number
  likedByMe: boolean
}

type Comment = {
  id: string
  post_id: string
  user_id: string | null
  content: string
  created_at: string
  username: string | null
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const NAV_LINKS = [
  { label: 'Feed', icon: Rss, href: '/feed' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Groups', icon: Users, href: '/groups' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
]

export default function FeedPage() {
  const router = useRouter()


  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [athletes, setAthletes] = useState<Profile[]>([])
  const [composerText, setComposerText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('/feed')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchPosts(uid: string) {
    // Step 1: fetch posts
    const { data: rawPosts, error } = await supabase
      .from('posts')
      .select('id, user_id, content, created_at, media_url')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !rawPosts || rawPosts.length === 0) {
      setPosts([])
      return
    }

    const postIds = rawPosts.map((p) => p.id)

    // Step 2: fetch profiles for all unique user_ids
    const userIds = [...new Set(rawPosts.map((p) => p.user_id).filter(Boolean))] as string[]
    let profileMap: Record<string, Profile> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, sport, avatar_url')
        .in('id', userIds)
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
      }
    }

    // Step 3: fetch all likes for these posts in one query
    const { data: likesData } = await supabase
      .from('likes')
      .select('post_id, user_id')
      .in('post_id', postIds)

    const likeCountMap: Record<string, number> = {}
    const likedByMeSet = new Set<string>()
    for (const like of likesData || []) {
      likeCountMap[like.post_id] = (likeCountMap[like.post_id] || 0) + 1
      if (like.user_id === uid) likedByMeSet.add(like.post_id)
    }

    // Step 4: merge everything
    const merged: Post[] = rawPosts.map((p) => ({
      ...p,
      media_url: p.media_url ?? null,
      profile: p.user_id ? (profileMap[p.user_id] ?? null) : null,
      likeCount: likeCountMap[p.id] || 0,
      likedByMe: likedByMeSet.has(p.id),
    }))

    setPosts(merged)
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setCurrentUser(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      await fetchPosts(user.id)

      const { data: others } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(5)
      setAthletes(others || [])

      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    // Reset so the same file can be re-selected if removed and re-added
    e.target.value = ''
  }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
  }

  async function handlePost() {
    if (!composerText.trim() && !imageFile) return
    setPosting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      setPosting(false)
      return
    }

    // Upload media if present
    let mediaUrl: string | null = null
    if (imageFile) {
      const filename = `${Date.now()}-${imageFile.name}`
      console.log('[upload] filename:', filename, '| bucket: post-media')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filename, imageFile, { upsert: false })

      if (uploadError) {
        console.error('[upload] error:', uploadError)
        alert(`Upload failed: ${uploadError.message}`)
        setPosting(false)
        return
      }

      console.log('[upload] success:', uploadData)
      const { data: urlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(filename)
      mediaUrl = urlData.publicUrl
    }

    const text = composerText.trim()
    const { error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, content: text, media_url: mediaUrl })

    if (!error) {
      setComposerText('')
      clearImage()
      const optimistic: Post = {
        id: `optimistic-${Date.now()}`,
        user_id: user.id,
        content: text,
        created_at: new Date().toISOString(),
        media_url: mediaUrl,
        profile: profile,
        likeCount: 0,
        likedByMe: false,
      }
      setPosts((prev) => [optimistic, ...prev])
      await fetchPosts(user.id)
    }

    setPosting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName =
    profile?.username || currentUser?.email?.split('@')[0] || 'Athlete'

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0A0F' }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: '#00E5A0' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#0A0A0F', fontFamily: 'var(--font-dm-sans)' }}
    >
      {/* ── LEFT SIDEBAR — fixed to left edge of viewport ── */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 240,
          height: '100vh',
          background: '#0A0A0F',
          borderRight: '1px solid #1A1A24',
          padding: '24px 16px',
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <div className="mb-8 px-1">
          <span
            className="text-4xl font-extrabold tracking-tight select-none"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#00E5A0' }}
          >
            NEXTLEVEL
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_LINKS.map(({ label, icon: Icon, href }) => {
            const active = activeNav === href
            return (
              <button
                key={href}
                onClick={() => {
                  setActiveNav(href)
                  if (href !== '/feed') router.push(href)
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium text-left"
                style={{
                  color: active ? '#00E5A0' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(0,229,160,0.07)' : 'transparent',
                  borderLeft: active ? '2px solid #00E5A0' : '2px solid transparent',
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* User card */}
        <div
          className="flex items-center gap-2.5 p-3 rounded-xl"
          style={{ background: '#111118', border: '1px solid #1A1A24' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}
          >
            {initials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            {profile?.sport && (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {profile.sport}
              </p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ── CONTENT — offset right of fixed sidebar on desktop ── */}
      <div className="md:pl-[240px]">
        <div className="flex max-w-[820px] mx-auto px-4 pt-6 gap-6 pb-24 md:pb-8">

        {/* ── CENTER FEED ── */}
        <main className="flex-1 flex flex-col gap-4" style={{ minWidth: 0 }}>

          {/* Composer */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: '#111118', border: '1px solid #1A1A24' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}
              >
                {initials(displayName)}
              </div>
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder="What are you training today?"
                rows={3}
                className="flex-1 resize-none text-sm outline-none rounded-lg px-3 py-2.5 transition-all"
                style={{
                  background: '#1A1A24',
                  border: '1px solid #2A2A38',
                  color: '#ffffff',
                  fontFamily: 'var(--font-dm-sans)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
                }}
              />
            </div>

            {/* Media preview */}
            {imagePreview && (
              <div className="relative rounded-lg overflow-hidden" style={{ background: '#1A1A24' }}>
                {imageFile?.type.startsWith('video/') ? (
                  <video
                    src={imagePreview}
                    controls
                    className="w-full rounded-lg"
                    style={{ maxHeight: 240, display: 'block' }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full object-cover rounded-lg"
                    style={{ maxHeight: 240 }}
                  />
                )}
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', color: '#ffffff' }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleImagePick}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Image picker button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    color: imageFile ? '#00E5A0' : 'rgba(255,255,255,0.38)',
                    background: imageFile ? 'rgba(0,229,160,0.08)' : 'transparent',
                    border: `1px solid ${imageFile ? 'rgba(0,229,160,0.25)' : '#2A2A38'}`,
                  }}
                >
                  <ImageIcon size={13} />
                  Photo
                </button>
                <p className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  ⌘ + Enter to post
                </p>
              </div>
              <button
                onClick={handlePost}
                disabled={posting || (!composerText.trim() && !imageFile)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-opacity"
                style={{
                  background: '#00E5A0',
                  color: '#0A0A0F',
                  fontFamily: 'var(--font-barlow-condensed)',
                  letterSpacing: '0.06em',
                  opacity: posting || (!composerText.trim() && !imageFile) ? 0.45 : 1,
                  cursor: posting || (!composerText.trim() && !imageFile) ? 'not-allowed' : 'pointer',
                }}
              >
                {posting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                POST
              </button>
            </div>
          </div>

          {/* Divider label */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex-1 h-px" style={{ background: '#1A1A24' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Latest
            </span>
            <div className="flex-1 h-px" style={{ background: '#1A1A24' }} />
          </div>

          {/* Posts */}
          {posts.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{ background: '#111118', border: '1px solid #1A1A24' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No posts yet. Be the first to share your training!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={currentUser?.id ?? null}
              />
            ))
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside
          className="hidden lg:flex flex-col gap-4 flex-shrink-0"
          style={{ width: 220 }}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: '#111118',
              border: '1px solid #1A1A24',
              position: 'sticky',
              top: 24,
            }}
          >
            <h3
              className="text-[11px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.38)' }}
            >
              Discover Athletes
            </h3>
            <div className="flex flex-col gap-3">
              {athletes.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  No athletes to discover yet.
                </p>
              ) : (
                athletes.map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))
              )}
            </div>
          </div>
        </aside>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 z-50"
        style={{ background: '#111118', borderTop: '1px solid #1A1A24' }}
      >
        {NAV_LINKS.map(({ label, icon: Icon, href }) => {
          const active = activeNav === href
          return (
            <button
              key={href}
              onClick={() => {
                setActiveNav(href)
                if (href !== '/feed') router.push(href)
              }}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg"
              style={{ color: active ? '#00E5A0' : 'rgba(255,255,255,0.38)' }}
            >
              <Icon size={19} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/* ── Post Card ── */
function PostCard({ post, userId }: { post: Post; userId: string | null }) {


  const [liked, setLiked] = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [liking, setLiking] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const username = post.profile?.username || null
  const sport = post.profile?.sport || null

  async function toggleLike() {
    if (!userId || liking) return
    setLiking(true)

    if (liked) {
      setLiked(false)
      setLikeCount((n) => n - 1)
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', userId)
    } else {
      setLiked(true)
      setLikeCount((n) => n + 1)
      await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: userId })
    }

    setLiking(false)
  }

  async function loadComments() {
    setLoadingComments(true)

    const { data: rawComments } = await supabase
      .from('comments')
      .select('id, post_id, user_id, content, created_at')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })

    if (!rawComments || rawComments.length === 0) {
      setComments([])
      setLoadingComments(false)
      setCommentsLoaded(true)
      return
    }

    // Resolve usernames
    const uids = [...new Set(rawComments.map((c) => c.user_id).filter(Boolean))] as string[]
    let usernameMap: Record<string, string> = {}
    if (uids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', uids)
      if (profiles) {
        usernameMap = Object.fromEntries(profiles.map((p) => [p.id, p.username]))
      }
    }

    setComments(
      rawComments.map((c) => ({
        ...c,
        username: c.user_id ? (usernameMap[c.user_id] ?? null) : null,
      }))
    )
    setLoadingComments(false)
    setCommentsLoaded(true)
  }

  function handleToggleComments() {
    const next = !showComments
    setShowComments(next)
    if (next && !commentsLoaded) loadComments()
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !commentText.trim() || submitting) return
    setSubmitting(true)

    const text = commentText.trim()
    const { data: inserted, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: userId, content: text })
      .select('id, post_id, user_id, content, created_at')
      .single()

    if (!error && inserted) {
      // Resolve the commenter's username from existing comments or a quick lookup
      let uname: string | null = null
      const existing = comments.find((c) => c.user_id === userId)
      if (existing) {
        uname = existing.username
      } else {
        const { data: prof } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single()
        uname = prof?.username ?? null
      }
      setComments((prev) => [...prev, { ...inserted, username: uname }])
      setCommentText('')
    }

    setSubmitting(false)
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: '#111118', border: '1px solid #1A1A24' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(0,229,160,0.13)', color: '#00E5A0' }}
          >
            {username ? initials(username) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{username ?? 'Athlete'}</span>
              {sport && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}
                >
                  {sport}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
              {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-sm leading-relaxed text-white mb-3">{post.content}</p>
        )}

        {/* Media */}
        {post.media_url && (
          <div className="mb-3 rounded-xl overflow-hidden" style={{ background: '#1A1A24' }}>
            {/\.(mp4|mov|webm)$/i.test(post.media_url) ? (
              <video
                src={post.media_url}
                controls
                className="w-full rounded-xl"
                style={{ maxHeight: 400, display: 'block' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.media_url}
                alt="Post media"
                className="w-full object-cover"
                style={{ maxHeight: 400, display: 'block' }}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-5 pt-3"
          style={{ borderTop: '1px solid #1A1A24' }}
        >
          <button
            onClick={toggleLike}
            disabled={!userId || liking}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: liked ? '#00E5A0' : 'rgba(255,255,255,0.38)' }}
          >
            <Heart size={14} fill={liked ? '#00E5A0' : 'none'} strokeWidth={2} />
            {likeCount > 0 ? likeCount : 'Like'}
          </button>
          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: showComments ? '#00E5A0' : 'rgba(255,255,255,0.38)' }}
          >
            <MessageCircle size={14} strokeWidth={2} />
            {comments.length > 0 ? comments.length : 'Comment'}
            {showComments
              ? <ChevronUp size={12} />
              : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Comment section */}
      {showComments && (
        <div style={{ borderTop: '1px solid #1A1A24' }}>
          {/* Comments list */}
          <div className="px-4 pt-3 flex flex-col gap-3">
            {loadingComments ? (
              <div className="flex justify-center py-3">
                <Loader2 size={16} className="animate-spin" style={{ color: '#00E5A0' }} />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs py-2 text-center" style={{ color: 'rgba(255,255,255,0.28)' }}>
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}
                  >
                    {comment.username ? comment.username.slice(0, 2).toUpperCase() : '?'}
                  </div>
                  <div
                    className="flex-1 rounded-lg px-3 py-2"
                    style={{ background: '#1A1A24' }}
                  >
                    <span className="text-xs font-semibold text-white mr-2">
                      {comment.username ?? 'Athlete'}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      {comment.content}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          {userId && (
            <form
              onSubmit={handleSubmitComment}
              className="flex items-center gap-2 px-4 py-3"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                style={{
                  background: '#1A1A24',
                  border: '1px solid #2A2A38',
                  color: '#ffffff',
                  fontFamily: 'var(--font-dm-sans)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-opacity"
                style={{
                  background: '#00E5A0',
                  color: '#0A0A0F',
                  opacity: submitting || !commentText.trim() ? 0.45 : 1,
                  cursor: submitting || !commentText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Send size={13} />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Athlete Card ── */
function AthleteCard({ athlete }: { athlete: Profile }) {
  const [following, setFollowing] = useState(false)

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}
      >
        {initials(athlete.username || 'AT')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{athlete.username}</p>
        {athlete.sport && (
          <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {athlete.sport}
          </p>
        )}
      </div>
      <button
        onClick={() => setFollowing((v) => !v)}
        className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 transition-all"
        style={{
          background: following ? 'transparent' : '#00E5A0',
          color: following ? 'rgba(255,255,255,0.5)' : '#0A0A0F',
          border: following ? '1px solid #2A2A38' : '1px solid #00E5A0',
        }}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  )
}
