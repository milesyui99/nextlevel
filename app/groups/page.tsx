'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Rss, User, Users, Compass, Bell, LogOut,
  Plus, X, Loader2, Check,
} from 'lucide-react'

type Profile = {
  id: string
  username: string | null
  sport: string | null
}

type Group = {
  id: string
  name: string
  description: string | null
  sport: string | null
  member_count: number
  created_by: string | null
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

const NAV_LINKS = [
  { label: 'Feed', icon: Rss, href: '/feed' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Groups', icon: Users, href: '/groups' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
]

const SPORT_OPTIONS = [
  'Basketball', 'Soccer', 'Football', 'Baseball', 'Track & Field',
  'Swimming', 'Tennis', 'Volleyball', 'Wrestling', 'Gymnastics',
  'Cycling', 'CrossFit', 'Weightlifting', 'MMA', 'Other',
]

export default function GroupsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', sport: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Per-group joining state
  const [joiningId, setJoiningId] = useState<string | null>(null)

  async function fetchGroups(uid: string) {
    const { data: grps } = await supabase
      .from('groups')
      .select('id, name, description, sport, member_count, created_by')
      .order('created_at', { ascending: false })
    setGroups(grps || [])

    if (grps && grps.length > 0) {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', uid)
      setJoinedIds(new Set((memberships || []).map((m) => m.group_id)))
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, sport')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      await fetchGroups(user.id)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleJoin(groupId: string) {
    if (!userId) return
    setJoiningId(groupId)

    const alreadyJoined = joinedIds.has(groupId)

    if (alreadyJoined) {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)

      setJoinedIds((prev) => {
        const next = new Set(prev)
        next.delete(groupId)
        return next
      })
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g
        )
      )
    } else {
      await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId })

      setJoinedIds((prev) => new Set([...prev, groupId]))
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, member_count: g.member_count + 1 } : g
        )
      )
    }

    setJoiningId(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !form.name.trim()) return
    setCreating(true)
    setCreateError(null)

    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        sport: form.sport || null,
        created_by: userId,
        member_count: 1,
      })
      .select('id, name, description, sport, member_count, created_by')
      .single()

    if (error) {
      setCreateError(error.message)
      setCreating(false)
      return
    }

    // Add creator as member
    await supabase
      .from('group_members')
      .insert({ group_id: newGroup.id, user_id: userId })

    setGroups((prev) => [newGroup, ...prev])
    setJoinedIds((prev) => new Set([...prev, newGroup.id]))
    setForm({ name: '', description: '', sport: '' })
    setShowModal(false)
    setCreating(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName = profile?.username || 'Athlete'

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
            const active = href === '/groups'
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
        <div className="max-w-[900px] mx-auto px-4 pt-8 pb-24 md:pb-10">

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-3xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                GROUPS
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Train together, grow together
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: '#00E5A0',
                color: '#0A0A0F',
                fontFamily: 'var(--font-barlow-condensed)',
                letterSpacing: '0.06em',
              }}
            >
              <Plus size={15} />
              CREATE GROUP
            </button>
          </div>

          {/* Section label */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Discover Groups
            </span>
            <div className="flex-1 h-px" style={{ background: '#1A1A24' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Groups grid */}
          {groups.length === 0 ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: '#111118', border: '1px solid #1A1A24' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(0,229,160,0.1)' }}
              >
                <Users size={24} style={{ color: '#00E5A0' }} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">No groups yet</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Be the first to create a group for your sport.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => {
                const joined = joinedIds.has(group.id)
                const isJoining = joiningId === group.id
                return (
                  <GroupCard
                    key={group.id}
                    group={group}
                    joined={joined}
                    loading={isJoining}
                    onToggle={() => handleJoin(group.id)}
                  />
                )
              })}
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
          const active = href === '/groups'
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

      {/* ── CREATE GROUP MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#111118', border: '1px solid #1A1A24' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-2xl font-extrabold text-white"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                CREATE GROUP
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Group name */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Group Name <span style={{ color: '#00E5A0' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setCreateError(null) }}
                  placeholder="e.g. NYC Runners Club"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: '#1A1A24', border: '1px solid #2A2A38', color: '#fff', fontFamily: 'var(--font-dm-sans)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
                />
              </div>

              {/* Sport / category */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Sport / Category
                </label>
                <select
                  value={form.sport}
                  onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
                  style={{ background: '#1A1A24', border: '1px solid #2A2A38', color: form.sport ? '#fff' : 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-dm-sans)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
                >
                  <option value="" disabled>Select a sport...</option>
                  {SPORT_OPTIONS.map((s) => (
                    <option key={s} value={s} style={{ background: '#1A1A24', color: '#fff' }}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What is this group about?"
                  rows={3}
                  className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: '#1A1A24', border: '1px solid #2A2A38', color: '#fff', fontFamily: 'var(--font-dm-sans)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
                />
              </div>

              {/* Error */}
              {createError && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', color: '#ff6b6b' }}
                >
                  {createError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'transparent', border: '1px solid #2A2A38', color: 'rgba(255,255,255,0.5)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.name.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    background: '#00E5A0',
                    color: '#0A0A0F',
                    fontFamily: 'var(--font-barlow-condensed)',
                    letterSpacing: '0.06em',
                    opacity: creating || !form.name.trim() ? 0.5 : 1,
                    cursor: creating || !form.name.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating && <Loader2 size={13} className="animate-spin" />}
                  {creating ? 'CREATING...' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Group Card ── */
function GroupCard({
  group, joined, loading, onToggle,
}: {
  group: Group
  joined: boolean
  loading: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all"
      style={{ background: '#111118', border: `1px solid ${joined ? 'rgba(0,229,160,0.2)' : '#1A1A24'}` }}
    >
      {/* Icon + name */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ background: 'rgba(0,229,160,0.12)', color: '#00E5A0' }}
        >
          {group.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{group.name}</p>
          {group.sport && (
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
              style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}
            >
              {group.sport}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {group.description && (
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {group.description}
        </p>
      )}

      {/* Footer: members + join */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5">
          <Users size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onToggle}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: joined ? 'transparent' : '#00E5A0',
            color: joined ? 'rgba(255,255,255,0.5)' : '#0A0A0F',
            border: joined ? '1px solid #2A2A38' : 'none',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : joined ? (
            <>
              <Check size={11} />
              Joined
            </>
          ) : (
            <>
              <Plus size={11} />
              Join
            </>
          )}
        </button>
      </div>
    </div>
  )
}
