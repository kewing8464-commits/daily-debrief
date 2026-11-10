'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { AppearanceCard } from '@/components/AppearanceCard'
import { ConnectAi } from '@/components/ConnectAi'
import { RemindersCard } from '@/components/RemindersCard'
import { AppShell } from '@/components/AppShell'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { prettyTime } from '@/lib/today'

export default function SettingsPage() {
  const router = useRouter()
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [zone, setZone] = useState('')
  const [deviceZone, setDeviceZone] = useState('')
  const [msg, setMsg] = useState('')
  const [ratingsOn, setRatingsOn] = useState(true)
  const [pausedUntil, setPausedUntil] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace('/login')
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setDeviceZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      if (p) {
        setName(p.name)
        setZone(p.timezone)
        setTime(String(p.debrief_time).slice(0, 5))
        setRatingsOn(p.ratings_on ?? true)
        setPausedUntil(p.reminders_paused_until ?? null)
      }
      setLoaded(true)
    })
  }, [router])

  async function saveTime(value: string) {
    setTime(value)
    const supabase = createBrowserSupabase()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const { error } = await supabase.from('profiles').update({ debrief_time: value }).eq('id', data.user.id)
    setMsg(error ? 'Could not save, try again.' : 'Saved ✓')
  }

  async function toggleRatings() {
    const value = !ratingsOn
    setRatingsOn(value)
    const supabase = createBrowserSupabase()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const { error } = await supabase.from('profiles').update({ ratings_on: value }).eq('id', data.user.id)
    if (error) setRatingsOn(!value)
    setMsg(error ? 'Could not save, try again.' : 'Saved ✓')
  }

  async function switchToDeviceZone() {
    const supabase = createBrowserSupabase()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const { error } = await supabase.from('profiles').update({ timezone: deviceZone }).eq('id', data.user.id)
    if (!error) setZone(deviceZone)
    setMsg(error ? 'Could not save, try again.' : 'Saved ✓')
  }

  async function logOut() {
    await createBrowserSupabase().auth.signOut()
    window.location.replace('/login')
  }

  return (
    <AppShell active="you">
      <PageHeader kicker="You" title={name ? `Hey ${name}` : 'You'} />
      <Card className="mb-3">
        <label className="flex items-center justify-between gap-3">
          <span>
            Nightly debrief time
            <span className="block text-xs text-muted">Reminders arrive in a later update.</span>
          </span>
          <input type="time" value={time} onChange={(e) => saveTime(e.target.value)} className="rounded-card border border-line bg-bg px-2 py-2" />
        </label>
        <button onClick={toggleRatings} className="mt-3 flex w-full items-center justify-between gap-3 border-t border-line pt-3 text-left">
          <span>
            Productive + focus ratings
            <span className="block text-xs text-muted">Two optional taps after your score</span>
          </span>
          <span className={`relative h-6 w-10 shrink-0 rounded-full ${ratingsOn ? 'bg-accent2' : 'bg-line'}`} role="switch" aria-checked={ratingsOn}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${ratingsOn ? 'right-0.5' : 'left-0.5'}`} />
          </span>
        </button>
        {msg && <p className="mt-2 text-xs text-accent2">{msg}</p>}
      </Card>
      <Card className="mb-3">
        <p>Time zone</p>
        <p className="text-sm text-muted">{zone || '…'}</p>
        {zone && deviceZone && zone !== deviceZone && (
          <button onClick={switchToDeviceZone} className="mt-2 text-sm font-semibold text-accent">
            Your phone is in {deviceZone}. Switch to it?
          </button>
        )}
      </Card>
      <AppearanceCard />
      {loaded && <RemindersCard zone={zone} time={prettyTime(time || '21:30')} pausedUntil={pausedUntil} />}
      <ConnectAi />
      <Card className="mb-3">
        <a href="/api/export" className="block font-semibold text-accent">Download my data</a>
        <p className="mt-1 text-sm text-muted">Everything you have saved, as a JSON file.</p>
      </Card>
      <button onClick={logOut} className="mt-2 w-full rounded-card border border-line py-3 text-muted">Log out</button>
    </AppShell>
  )
}
