'use client'
import { useState } from 'react'
import { Card } from '@/components/Card'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const supabase = createBrowserSupabase()
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    // Full load so the server sees the new session cookie.
    window.location.replace(mode === 'signup' ? '/setup' : '/')
  }

  const input = 'w-full rounded-card border border-line bg-bg px-3 py-3 text-base outline-none focus:border-accent'
  return (
    <main className="safe-top flex flex-1 flex-col justify-center px-5 pb-10">
      <h1 className="font-serif text-3xl leading-tight">Daily Debrief</h1>
      <p className="mt-1 mb-6 text-muted">Five minutes a night. Learn what makes your good days good.</p>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input className={input} type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Password (8+ characters)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-[#e89f88]">{error}</p>}
          <button disabled={busy} className="rounded-card bg-accent py-3 font-bold text-[#1e1714] disabled:opacity-60">
            {busy ? 'One sec…' : mode === 'signin' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </Card>
      <button className="mt-4 text-sm text-accent" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </button>
    </main>
  )
}
