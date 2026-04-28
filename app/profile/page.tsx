'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Rss, User, Users, Compass, Bell, LogOut, Pencil, Loader2 } from 'lucide-react'

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  sport: string | null
  position: string | null
  bio: string | null
  avatar_url: string | null
}

type Post = {
  id: string
  user_id: string | null
  content: string
  created_at: string
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
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

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, full_name, sport, position, bio, avatar_url')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      const { data: userPosts } = await supabase
        .from('posts')
        .select('id, user_id, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setPosts(userPosts || [])

      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName = profile?.username || profile?.full_name || 'Athlete'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#00E5A0' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F', fontFamily: 'var(--font-dm-sans)' }}>

      {/* ── FIXED LEFT SIDEBAR ── */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          position: 'fixed', left: 0, top: 0,
          width: 240, height: '100vh',
          background: '#0A0A0F',
          borderRight: '1px solid #1A1A24',
          padding: '24px 16px',
          zIndex: 40,
        }}
      >
        <div className="mb-8 px-1">
          <span
            className="text-4xl font-extrabold tracking-tight select-none"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#00E5A0' }}
          >
            NEXTLEVEL
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_LINKS.map(({ label, icon: Icon, href }) => {
            const active = href === '/profile'
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
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

      {/* ── MAIN CONTENT ── */}
      <div className="md:pl-[240px]">
        <div className="max-w-[680px] mx-auto px-4 pt-8 pb-24 md:pb-10">

          {/* Profile card */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: '#111118', border: '1px solid #1A1A24' }}
          >
            {/* Top row: avatar + edit button */}
            <div className="flex items-start justify-between mb-5">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initials(displayName)
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={() => router.push('/profile/edit')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'transparent',
                  border: '1px solid #2A2A38',
                  color: 'rgba(255,255,255,0.7)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00E5A0'
                  e.currentTarget.style.color = '#00E5A0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2A2A38'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }}
              >
                <Pencil size={13} />
                Edit Profile
              </button>
            </div>

            {/* Name + meta */}
            <div className="mb-4">
              {profile?.full_name && (
                <h1
                  className="text-2xl font-bold text-white mb-0.5"
                  style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.02em' }}
                >
                  {profile.full_name}
                </h1>
              )}
              {profile?.username && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  @{profile.username}
                </p>
              )}
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {profile?.sport && (
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(0,229,160,0.12)', color: '#00E5A0' }}
                >
                  {profile.sport}
                </span>
              )}
              {profile?.position && (
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                >
                  {profile.position}
                </span>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {profile.bio}
              </p>
            )}

            {/* Post count */}
            <div
              className="flex items-center gap-6 mt-5 pt-5"
              style={{ borderTop: '1px solid #1A1A24' }}
            >
              <div>
                <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
                  {posts.length}
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>Posts</p>
              </div>
            </div>
          </div>

          {/* Posts grid */}
          <div className="mb-4 flex items-center gap-3 px-1">
            <div className="flex-1 h-px" style={{ background: '#1A1A24' }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Posts
            </span>
            <div className="flex-1 h-px" style={{ background: '#1A1A24' }} />
          </div>

          {posts.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{ background: '#111118', border: '1px solid #1A1A24' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No posts yet. Share what you&apos;re training!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl p-4"
                  style={{ background: '#111118', border: '1px solid #1A1A24' }}
                >
                  <p className="text-sm leading-relaxed text-white mb-3">{post.content}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    {timeAgo(post.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 z-50"
        style={{ background: '#111118', borderTop: '1px solid #1A1A24' }}
      >
        {NAV_LINKS.map(({ label, icon: Icon, href }) => {
          const active = href === '/profile'
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
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
