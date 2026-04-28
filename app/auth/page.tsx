'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/feed')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email to confirm your account.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A0F' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-start px-20 w-1/2 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(0,229,160,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <h1
            className="text-[11rem] leading-none font-extrabold tracking-tight select-none"
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              color: '#00E5A0',
              lineHeight: 0.9,
            }}
          >
            NEXT
            <br />
            LEVEL
          </h1>
          <p
            className="mt-6 text-lg max-w-xs"
            style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-dm-sans)' }}
          >
            The social network built for athletes and coaches who refuse to settle.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex flex-col justify-center items-center w-full lg:w-1/2 px-8"
        style={{ background: '#111118' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <h1
            className="text-6xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#00E5A0' }}
          >
            NEXTLEVEL
          </h1>
        </div>

        <div className="w-full max-w-sm">
          {/* Tabs */}
          <div
            className="flex rounded-lg p-1 mb-8"
            style={{ background: '#1A1A24' }}
          >
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                className="flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  background: mode === m ? '#00E5A0' : 'transparent',
                  color: mode === m ? '#0A0A0F' : 'rgba(255,255,255,0.45)',
                }}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-dm-sans)' }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: '#1A1A24',
                  border: '1px solid #3A3A4A',
                  color: '#ffffff',
                  fontFamily: 'var(--font-dm-sans)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A4A')}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-dm-sans)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg px-4 py-3 pr-11 text-sm outline-none transition-all"
                  style={{
                    background: '#1A1A24',
                    border: '1px solid #3A3A4A',
                    color: '#ffffff',
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5A0')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A4A')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <p
                className="text-xs rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(255,60,60,0.1)',
                  border: '1px solid rgba(255,60,60,0.25)',
                  color: '#ff6b6b',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                {error}
              </p>
            )}
            {success && (
              <p
                className="text-xs rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(0,229,160,0.08)',
                  border: '1px solid rgba(0,229,160,0.25)',
                  color: '#00E5A0',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                {success}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-sm mt-2 flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: '#00E5A0',
                color: '#0A0A0F',
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: '1rem',
                letterSpacing: '0.08em',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {mode === 'login' && (
            <p
              className="text-center text-xs mt-6"
              style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-dm-sans)' }}
            >
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null) }}
                style={{ color: '#00E5A0' }}
                className="hover:underline"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
