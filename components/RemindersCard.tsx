'use client'
import { useCallback, useEffect, useState } from 'react'
import { debriefDateFor } from '@/lib/dates'
import { pauseUntil, pushSupport, type PauseOption } from '@/lib/reminders'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Card } from './Card'
import { Icon } from './Icon'

type Device = { reminder_on: boolean; followup_on: boolean }
type Support = ReturnType<typeof pushSupport> | 'checking'

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function Switch({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub?: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-3 border-t border-line py-2.5 text-left">
      <span>{label}{sub && <span className="block text-xs text-muted">{sub}</span>}</span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full ${on ? 'bg-accent2' : 'bg-line'}`} role="switch" aria-checked={on}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'right-0.5' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

/** Reminders on this device: turn on, nightly / follow-up switches, Test it, and Pause. */
export function RemindersCard({ zone, time, pausedUntil }: { zone: string; time: string; pausedUntil: string | null }) {
  const [support, setSupport] = useState<Support>('checking')
  const [sub, setSub] = useState<PushSubscription | null>(null)
  const [device, setDevice] = useState<Device | null>(null)
  const [paused, setPaused] = useState(pausedUntil)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const today = zone ? debriefDateFor(new Date(), zone) : ''

  const refresh = useCallback(async () => {
    const nav = navigator as Navigator & { standalone?: boolean }
    const env = {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
      standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
      iOS: /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      permission: ('Notification' in window ? Notification.permission : 'default') as NotificationPermission,
    }
    const s = pushSupport(env)
    setSupport(s)
    if (s !== 'ready' && s !== 'denied') return
    const reg = await navigator.serviceWorker.register('/sw.js')
    const existing = await reg.pushManager.getSubscription()
    setSub(existing)
    if (existing) {
      const res = await fetch('/api/push/subscribe').catch(() => null)
      const list = res?.ok ? ((await res.json()) as (Device & { endpoint: string })[]) : []
      const mine = list.find((d) => d.endpoint === existing.endpoint)
      if (mine) setDevice({ reminder_on: mine.reminder_on, followup_on: mine.followup_on })
      else setSub(null) // subscribed in the browser but not saved: offer to turn on again
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser capabilities once on mount
    refresh().catch(() => setSupport('unsupported'))
  }, [refresh])

  async function turnOn() {
    setBusy(true)
    setMsg('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setSupport(permission === 'denied' ? 'denied' : 'ready'); return }
      const reg = await navigator.serviceWorker.ready
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '') }))
      const json = s.toJSON()
      const label = /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computer'
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, label }) })
      if (!res.ok) throw new Error()
      setSub(s)
      setDevice({ reminder_on: true, followup_on: true })
      setMsg('Reminders are on ✓')
    } catch {
      setMsg("Couldn't turn reminders on. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    if (!sub) return
    setBusy(true)
    await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null)
    await sub.unsubscribe().catch(() => false)
    setSub(null)
    setDevice(null)
    setBusy(false)
    setMsg('Reminders are off on this device.')
  }

  async function toggle(key: keyof Device) {
    if (!sub || !device) return
    const next = { ...device, [key]: !device[key] }
    setDevice(next)
    const res = await fetch('/api/push/subscribe', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint, [key]: next[key] }) }).catch(() => null)
    if (!res?.ok) { setDevice(device); setMsg('Could not save, try again.') } else setMsg('Saved ✓')
  }

  async function test() {
    if (!sub) return
    setMsg('Sending…')
    const res = await fetch('/api/push/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null)
    if (res?.ok) setMsg('Sent. It should pop up in a few seconds.')
    else setMsg(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't send the test.")
  }

  async function pause(option: PauseOption | null) {
    const value = option ? pauseUntil(option, today) : null
    const supabase = createBrowserSupabase()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const { error } = await supabase.from('profiles').update({ reminders_paused_until: value }).eq('id', data.user.id)
    if (error) return setMsg('Could not save, try again.')
    setPaused(value)
    setMsg(value ? 'Paused ✓' : 'Reminders back on ✓')
  }

  const isPaused = !!paused && paused >= today
  const pausedLabel = paused ? new Date(`${paused}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''

  return (
    <Card className="mb-3">
      <p className="flex items-center gap-2 font-semibold"><Icon name="bell" size={17} className="text-muted" />Reminders</p>
      <p className="mt-0.5 text-sm text-muted">One nudge at {time || 'your debrief time'}, and one more an hour later if you haven&apos;t started. Never more.</p>

      {support === 'checking' && <p className="mt-3 text-sm text-muted">Checking this device…</p>}

      {support === 'needs-install' && (
        <div className="mt-3 rounded-card border border-line p-3 text-sm">
          <p className="font-semibold">On iPhone, reminders need the home screen app:</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
            <li>In Safari, tap Share <Icon name="share" size={14} className="-mt-0.5" /></li>
            <li>Tap <b className="text-ink">Add to Home Screen</b></li>
            <li>Open Daily Debrief from the new icon, come back here, and turn reminders on</li>
          </ol>
        </div>
      )}

      {support === 'unsupported' && <p className="mt-3 text-sm text-muted">This browser can&apos;t show reminders. Try your phone&apos;s home screen app, or Chrome on a computer.</p>}

      {support === 'denied' && !sub && (
        <p className="mt-3 text-sm text-[#f2c9b4]">Notifications are blocked for Daily Debrief. On iPhone: Settings › Notifications › Debrief › Allow Notifications. Then come back here.</p>
      )}

      {support === 'ready' && !sub && (
        <button onClick={turnOn} disabled={busy} className="mt-3 w-full rounded-card bg-accent py-3 font-bold text-on-accent disabled:opacity-60">
          {busy ? 'Turning on…' : 'Turn on reminders'}
        </button>
      )}

      {sub && device && (
        <div className="mt-2">
          <Switch on={device.reminder_on} onClick={() => toggle('reminder_on')} label="Nightly reminder" sub={`at ${time} on this device`} />
          <Switch on={device.followup_on} onClick={() => toggle('followup_on')} label="One follow-up if I forget" sub="60 minutes later, then nothing" />
          <div className="flex gap-2 border-t border-line pt-3">
            <button onClick={test} className="flex-1 rounded-card border border-line py-2 text-sm font-semibold">Test it</button>
            <button onClick={turnOff} disabled={busy} className="flex-1 rounded-card border border-line py-2 text-sm text-muted">Turn off here</button>
          </div>
        </div>
      )}

      {(sub || isPaused) && (
        <div className="mt-3 border-t border-line pt-3">
          {isPaused ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm"><Icon name="pause" size={15} />Paused through {pausedLabel}</span>
              <button onClick={() => pause(null)} className="text-sm font-semibold text-accent">Resume</button>
            </div>
          ) : (
            <>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm"><Icon name="pause" size={15} />Pause reminders <span className="text-xs text-muted">(vacation, sick, busy week)</span></p>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {([['tonight', 'Tonight'], ['3days', '3 days'], ['week', 'A week']] as const).map(([o, l]) => (
                  <button key={o} onClick={() => pause(o)} className="rounded-card border border-line py-2">{l}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-accent2">{msg}</p>}
    </Card>
  )
}
