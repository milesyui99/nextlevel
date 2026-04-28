'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Loader2, Check } from 'lucide-react'

type ProfileForm = {
  username: string
  full_name: string
  sport: string
  position: string
  bio: string
}

const FIELD_STYLES = {
  background: '#1A1A24',
  border: '1px solid #2A2A38',
  color: '#ffffff',
  fontFamily: 'var(--font-dm-sans)',
}

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<ProfileForm>({
    username: '',
    full_name: '',
    sport: '',
    position: '',
    bio: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('username, full_name, sport, position, bio')
        .eq('id', user.id)
        .single()

      if (prof) {
        setForm({
          username: prof.username || '',
          full_name: prof.full_name || '',
          sport: prof.sport || '',
          position: prof.position || '',
          bio: prof.bio || '',
        })
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: form.username.trim() || null,
        full_name: form.full_name.trim() || null,
        sport: form.sport.trim() || null,
        position: form.position.trim() || null,
        bio: form.bio.trim() || null,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => router.push('/profile'), 800)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#00E5A0' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#0A0A0F', fontFamily: 'var(--font-dm-sans)' }}
    >
      <div className="max-w-[560px] mx-auto px-4 pt-8 pb-16">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all flex-shrink-0"
            style={{ background: '#111118', border: '1px solid #1A1A24', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#00E5A0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            <ArrowLeft size={16} />
          </button>
          <h1
            className="text-3xl font-extrabold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            EDIT PROFILE
          </h1>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ background: '#111118', border: '1px solid #1A1A24' }}
        >

          {/* Username */}
          <Field
            label="Username"
            hint="Your unique @handle"
            value={form.username}
            onChange={(v) => set('username', v)}
            placeholder="e.g. johndoe"
          />

          {/* Full name */}
          <Field
            label="Full Name"
            value={form.full_name}
            onChange={(v) => set('full_name', v)}
            placeholder="e.g. John Doe"
          />

          {/* Sport */}
          <Field
            label="Sport"
            value={form.sport}
            onChange={(v) => set('sport', v)}
            placeholder="e.g. Basketball, Soccer, Track..."
          />

          {/* Position */}
          <Field
            label="Position / Role"
            value={form.position}
            onChange={(v) => set('position', v)}
            placeholder="e.g. Point Guard, Striker, Coach..."
          />

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="Tell the world about your athletic journey..."
              rows={4}
              className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={FIELD_STYLES}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{
                background: 'rgba(255,60,60,0.08)',
                border: '1px solid rgba(255,60,60,0.2)',
                color: '#ff6b6b',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'transparent',
                border: '1px solid #2A2A38',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || saved}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: saved ? 'rgba(0,229,160,0.15)' : '#00E5A0',
                color: saved ? '#00E5A0' : '#0A0A0F',
                fontFamily: 'var(--font-barlow-condensed)',
                letterSpacing: '0.06em',
                opacity: saving ? 0.7 : 1,
                border: saved ? '1px solid rgba(0,229,160,0.3)' : 'none',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saved && <Check size={14} />}
              {saving ? 'SAVING...' : saved ? 'SAVED!' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Reusable text field ── */
function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {label}
        </label>
        {hint && (
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {hint}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
        style={{
          background: '#1A1A24',
          border: '1px solid #2A2A38',
          color: '#ffffff',
          fontFamily: 'var(--font-dm-sans)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
      />
    </div>
  )
}
