'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Rss, User, Users, Compass, Bell, LogOut,
  Loader2, UserPlus, UserCheck,
} from 'lucide-react'

type Profile = {
  id: string
  username: string | null
  full_name: string | null
  sport: string | null
  position: string | null
  bio: string | null
  avatar_url: string | null
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const NAV_LINKS = [
  { label: 'Feed', icon: Rss, href: '/feed' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Groups', icon: Users, href: '/groups' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
]

export default function DiscoverPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [athletes, setAthletes] = useState<Profile[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setCurrentUserId(user.id)

      // Fetch own profile for sidebar
      const { data: me } = await supabase
        .from('profiles')
        .select('id, username, full_name, sport, position, bio, avatar_url')
        .eq('id', user.id)
        .single()
      setMyProfile(me)

      // Fetch all other profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, sport, position, bio, avatar_url')
        .neq('id', user.id)
        .order('full_name', { ascending: true })
      setAthletes(profiles || [])

      // Fetch who the current user already follows
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      setFollowingIds(new Set((follows || []).map((f) => f.following_id)))

      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName = myProfile?.username || myProfile?.full_name || 'Athlete'

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
            const active = href === '/discover'
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
            {myProfile?.sport && (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {myProfile.sport}
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
        <div className="max-w-[960px] mx-auto px-4 pt-8 pb-24 md:pb-10">

          {/* Page header */}
          <div className="mb-8">
            <h1
              className="text-3xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              DISCOVER ATHLETES
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Find and follow athletes in your sport
            </p>
          </div>

          {/* Section label */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              All Athletes
            </span>
            <div className="flex-1 h-px" style={{ background: '#1A1A24' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {athletes.length === 0 ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: '#111118', border: '1px solid #1A1A24' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0,229,160,0.1)' }}
              >
                <Compass size={24} style={{ color: '#00E5A0' }} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">No athletes yet</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Be the first to invite your teammates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {athletes.map((athlete) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  following={followingIds.has(athlete.id)}
                  currentUserId={currentUserId!}
                  onFollowChange={(id, isNowFollowing) => {
                    setFollowingIds((prev) => {
                      const next = new Set(prev)
                      isNowFollowing ? next.add(id) : next.delete(id)
                      return next
                    })
                  }}
                />
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
          const active = href === '/discover'
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

/* ── Athlete Card ── */
function AthleteCard({
  athlete,
  following,
  currentUserId,
  onFollowChange,
}: {
  athlete: Profile
  following: boolean
  currentUserId: string
  onFollowChange: (id: string, isNowFollowing: boolean) => void
}) {
  const supabase = createClient()
  const [pending, setPending] = useState(false)

  const displayName = athlete.full_name || athlete.username || 'Athlete'
  const handle = athlete.username ? `@${athlete.username}` : null

  async function toggleFollow() {
    if (pending) return
    setPending(true)

    if (following) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', athlete.id)
      onFollowChange(athlete.id, false)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: athlete.id })
      onFollowChange(athlete.id, true)
    }

    setPending(false)
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 transition-all"
      style={{
        background: '#111118',
        border: `1px solid ${following ? 'rgba(0,229,160,0.2)' : '#1A1A24'}`,
      }}
    >
      {/* Avatar + follow button row */}
      <div className="flex items-start justify-between gap-3">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: 'rgba(0,229,160,0.13)', color: '#00E5A0' }}
        >
          {athlete.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={athlete.avatar_url}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials(displayName)
          )}
        </div>

        {/* Follow / Unfollow */}
        <button
          onClick={toggleFollow}
          disabled={pending}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
          style={{
            background: following ? 'transparent' : '#00E5A0',
            color: following ? 'rgba(255,255,255,0.55)' : '#0A0A0F',
            border: following ? '1px solid #2A2A38' : 'none',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : following ? (
            <>
              <UserCheck size={12} />
              Following
            </>
          ) : (
            <>
              <UserPlus size={12} />
              Follow
            </>
          )}
        </button>
      </div>

      {/* Name + handle */}
      <div>
        <p className="text-sm font-semibold text-white leading-tight">{displayName}</p>
        {handle && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {handle}
          </p>
        )}
      </div>

      {/* Sport + position badges */}
      {(athlete.sport || athlete.position) && (
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          {athlete.sport && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}
            >
              {athlete.sport}
            </span>
          )}
          {athlete.position && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              {athlete.position}
            </span>
          )}
        </div>
      )}

      {/* Bio preview */}
      {athlete.bio && (
        <p
          className="text-xs leading-relaxed"
          style={{
            color: 'rgba(255,255,255,0.45)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {athlete.bio}
        </p>
      )}
    </div>
  )
}
