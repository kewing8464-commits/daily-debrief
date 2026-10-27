'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { TabBar } from '@/components/TabBar'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [zone, setZone] = useState('')
  const [deviceZone, setDeviceZone] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace('/login')
      const { data: p } = await supabase.from('profiles').select('name, debrief_time, timezone').eq('id', data.user.id).single()
      setDeviceZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      if (p) {
        setName(p.name)
        setZone(p.timezone)
        setTime(String(p.debrief_time).slice(0, 5))
      }
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
    <main className="safe-top flex-1 px-4 pb-28">
      <h1 className="mt-1 mb-4 font-serif text-2xl">{name ? `Hey ${name}` : 'You'}</h1>
      <Card className="mb-3">
        <label className="flex items-center justify-between gap-3">
          <span>
            Nightly debrief time
            <span className="block text-xs text-muted">Reminders arrive in a later update.</span>
          </span>
          <input type="time" value={time} onChange={(e) => saveTime(e.target.value)} className="rounded-card border border-line bg-bg px-2 py-2" />
        </label>
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
      <Card className="mb-3">
        <p className="font-semibold">Connect your AI</p>
        <p className="mt-1 text-sm text-muted">
          Coming in the next update: connect Claude, ChatGPT, or another AI app to your journal and ask it about your life.
        </p>
      </Card>
      <Card className="mb-3">
        <a href="/api/export" className="block font-semibold text-accent">Download my data</a>
        <p className="mt-1 text-sm text-muted">Everything you have saved, as a JSON file.</p>
      </Card>
      <button onClick={logOut} className="mt-2 w-full rounded-card border border-line py-3 text-muted">Log out</button>
      <TabBar active="settings" />
    </main>
  )
}
