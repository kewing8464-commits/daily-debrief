'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { SetupInputSchema } from '@/lib/validation'

export default function SetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [debriefTime, setDebriefTime] = useState('21:30')
  const [timezone, setTimezone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Read the phone's time zone after mount (the server renders without it).
  useEffect(() => {
    queueMicrotask(() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = SetupInputSchema.safeParse({ name, debriefTime, timezone })
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    setBusy(true)
    const supabase = createBrowserSupabase()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return router.replace('/login')
    const { error } = await supabase.from('profiles').upsert({
      id: auth.user.id,
      name: parsed.data.name,
      debrief_time: parsed.data.debriefTime,
      timezone: parsed.data.timezone,
    })
    setBusy(false)
    if (error) return setError(error.message)
    // Full load so the server sees the new profile (a client refresh here cancelled the navigation).
    window.location.replace('/')
  }

  const input = 'w-full rounded-card border border-line bg-bg px-3 py-3 text-base outline-none focus:border-accent'
  return (
    <main className="safe-top flex flex-1 flex-col justify-center px-5 pb-10">
      <h1 className="font-serif text-3xl leading-tight">Let&apos;s set you up</h1>
      <p className="mt-1 mb-6 text-muted">Takes ten seconds. You can change this later.</p>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            What should we call you?
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" autoComplete="given-name" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            When do you want your nightly debrief?
            <input className={input} type="time" value={debriefTime} onChange={(e) => setDebriefTime(e.target.value)} />
          </label>
          <p className="text-xs text-muted">Time zone: {timezone || 'detecting…'}</p>
          {error && <p className="text-sm text-[#e89f88]">{error}</p>}
          <button disabled={busy} className="rounded-card bg-accent py-3 font-bold text-on-accent disabled:opacity-60">
            {busy ? 'Saving…' : "I'm ready"}
          </button>
        </form>
      </Card>
    </main>
  )
}
