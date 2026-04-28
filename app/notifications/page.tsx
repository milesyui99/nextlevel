'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Rss, User, Users, Compass, Bell, LogOut,
  Heart, MessageCircle, UserPlus, Loader2,
} from 'lucide-react'

type NotifType = 'like' | 'comment' | 'follow'

type Notification = {
  id: string           // composite key: type + source row id
  type: NotifType
  actorId: string
  actorUsername: string | null
  actorName: string | null
  postSnippet: string | null   // first ~60 chars of the post, for likes/comments
  commentSnippet: string | null
  createdAt: string
  isNew: boolean
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const NOTIF_ICON: Record<NotifType, React.ElementType> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
}

const NOTIF_COLOR: Record<NotifType, string> = {
  like: '#ff6b6b',
  comment: '#00E5A0',
  follow: '#7b8cff',
}

const NAV_LINKS = [
  { label: 'Feed', icon: Rss, href: '/feed' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Groups', icon: Users, href: '/groups' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
]

const LAST_SEEN_KEY = 'nl_notifs_last_seen'

export default function NotificationsPage() {
  const router = useRouter()


  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<{ username: string | null; sport: string | null } | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setCurrentUserId(user.id)

      // Own profile for sidebar
      const { data: me } = await supabase
        .from('profiles')
        .select('username, sport')
        .eq('id', user.id)
        .single()
      setMyProfile(me)

      // Last seen timestamp — anything after this is "new"
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY) ?? '1970-01-01T00:00:00Z'

      // ── 1. Get current user's post ids + snippets
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, content')
        .eq('user_id', user.id)

      const myPostIds = (myPosts || []).map((p) => p.id)
      const postSnippetMap: Record<string, string> = {}
      for (const p of myPosts || []) {
        postSnippetMap[p.id] = p.content.slice(0, 60) + (p.content.length > 60 ? '…' : '')
      }

      // ── 2. Likes on my posts
      const likeRows: { id: string; post_id: string; user_id: string; created_at: string }[] = []
      if (myPostIds.length > 0) {
        const { data } = await supabase
          .from('likes')
          .select('id, post_id, user_id, created_at')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)        // don't notify self-likes
          .order('created_at', { ascending: false })
          .limit(50)
        likeRows.push(...(data || []))
      }

      // ── 3. Comments on my posts
      const commentRows: { id: string; post_id: string; user_id: string; content: string; created_at: string }[] = []
      if (myPostIds.length > 0) {
        const { data } = await supabase
          .from('comments')
          .select('id, post_id, user_id, content, created_at')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)        // don't notify self-comments
          .order('created_at', { ascending: false })
          .limit(50)
        commentRows.push(...(data || []))
      }

      // ── 4. New followers
      const followRows: { id: string; follower_id: string; created_at: string }[] = []
      {
        const { data } = await supabase
          .from('follows')
          .select('id, follower_id, created_at')
          .eq('following_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        followRows.push(...(data || []))
      }

      // ── 5. Resolve all actor user IDs to profiles in one query
      const actorIds = [
        ...new Set([
          ...likeRows.map((r) => r.user_id),
          ...commentRows.map((r) => r.user_id),
          ...followRows.map((r) => r.follower_id),
        ].filter(Boolean)),
      ] as string[]

      let profileMap: Record<string, { username: string | null; full_name: string | null }> = {}
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', actorIds)
        for (const p of profiles || []) {
          profileMap[p.id] = { username: p.username, full_name: p.full_name }
        }
      }

      // ── 6. Build unified notification list
      const notifs: Notification[] = []

      for (const r of likeRows) {
        const actor = profileMap[r.user_id] ?? { username: null, full_name: null }
        notifs.push({
          id: `like-${r.id}`,
          type: 'like',
          actorId: r.user_id,
          actorUsername: actor.username,
          actorName: actor.full_name,
          postSnippet: postSnippetMap[r.post_id] ?? null,
          commentSnippet: null,
          createdAt: r.created_at,
          isNew: r.created_at > lastSeen,
        })
      }

      for (const r of commentRows) {
        const actor = profileMap[r.user_id] ?? { username: null, full_name: null }
        notifs.push({
          id: `comment-${r.id}`,
          type: 'comment',
          actorId: r.user_id,
          actorUsername: actor.username,
          actorName: actor.full_name,
          postSnippet: postSnippetMap[r.post_id] ?? null,
          commentSnippet: r.content.slice(0, 80) + (r.content.length > 80 ? '…' : ''),
          createdAt: r.created_at,
          isNew: r.created_at > lastSeen,
        })
      }

      for (const r of followRows) {
        const actor = profileMap[r.follower_id] ?? { username: null, full_name: null }
        notifs.push({
          id: `follow-${r.id}`,
          type: 'follow',
          actorId: r.follower_id,
          actorUsername: actor.username,
          actorName: actor.full_name,
          postSnippet: null,
          commentSnippet: null,
          createdAt: r.created_at,
          isNew: r.created_at > lastSeen,
        })
      }

      // Sort newest first
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setNotifications(notifs)
      setLoading(false)

      // Mark all as seen now that the page is open
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName = myProfile?.username || 'Athlete'
  const newCount = notifications.filter((n) => n.isNew).length

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
            const active = href === '/notifications'
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
                <span className="flex-1">{label}</span>
                {label === 'Notifications' && newCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#00E5A0', color: '#0A0A0F' }}
                  >
                    {newCount}
                  </span>
                )}
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
        <div className="max-w-[680px] mx-auto px-4 pt-8 pb-24 md:pb-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-3xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                NOTIFICATIONS
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {newCount > 0
                  ? `${newCount} new notification${newCount !== 1 ? 's' : ''}`
                  : 'You\'re all caught up'}
              </p>
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: '#111118', border: '1px solid #1A1A24' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0,229,160,0.08)' }}
              >
                <Bell size={24} style={{ color: '#00E5A0' }} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">No notifications yet</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Activity on your posts and profile will show up here.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid #1A1A24' }}
            >
              {notifications.map((notif, i) => (
                <NotifRow
                  key={notif.id}
                  notif={notif}
                  isLast={i === notifications.length - 1}
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
          const active = href === '/notifications'
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg relative"
              style={{ color: active ? '#00E5A0' : 'rgba(255,255,255,0.38)' }}
            >
              <Icon size={19} />
              {label === 'Notifications' && newCount > 0 && (
                <span
                  className="absolute -top-0.5 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: '#00E5A0', color: '#0A0A0F' }}
                >
                  {newCount > 9 ? '9+' : newCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/* ── Notification Row ── */
function NotifRow({ notif, isLast }: { notif: Notification; isLast: boolean }) {
  const Icon = NOTIF_ICON[notif.type]
  const iconColor = NOTIF_COLOR[notif.type]
  const actorDisplay = notif.actorName || notif.actorUsername || 'Someone'

  function description() {
    switch (notif.type) {
      case 'like':
        return (
          <>
            <span className="font-semibold text-white">{actorDisplay}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}> liked your post</span>
            {notif.postSnippet && (
              <span
                className="block text-xs mt-0.5 truncate"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                &ldquo;{notif.postSnippet}&rdquo;
              </span>
            )}
          </>
        )
      case 'comment':
        return (
          <>
            <span className="font-semibold text-white">{actorDisplay}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}> commented on your post</span>
            {notif.commentSnippet && (
              <span
                className="block text-xs mt-0.5 truncate"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                &ldquo;{notif.commentSnippet}&rdquo;
              </span>
            )}
          </>
        )
      case 'follow':
        return (
          <>
            <span className="font-semibold text-white">{actorDisplay}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}> started following you</span>
          </>
        )
    }
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 transition-colors"
      style={{
        background: notif.isNew ? 'rgba(0,229,160,0.04)' : '#111118',
        borderLeft: notif.isNew ? '2px solid #00E5A0' : '2px solid transparent',
        borderBottom: isLast ? 'none' : '1px solid #1A1A24',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = notif.isNew ? 'rgba(0,229,160,0.04)' : '#111118')}
    >
      {/* Actor avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'rgba(0,229,160,0.12)', color: '#00E5A0' }}
        >
          {initials(notif.actorName || notif.actorUsername)}
        </div>
        {/* Type badge */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: '#0A0A0F', border: '1.5px solid #1A1A24' }}
        >
          <Icon size={9} style={{ color: iconColor }} fill={notif.type === 'like' ? iconColor : 'none'} />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{description()}</p>
        <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {timeAgo(notif.createdAt)}
        </p>
      </div>

      {/* New dot */}
      {notif.isNew && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ background: '#00E5A0' }}
        />
      )}
    </div>
  )
}
