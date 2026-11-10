'use client'
import { useEffect, useState } from 'react'
import { isStaleBuildError, RELOAD_KEY, shouldAutoReload } from '@/lib/client-errors'

type Props = { error: unknown; retry: () => void }

function report(error: unknown) {
  const e = (error ?? {}) as { name?: string; message?: string; stack?: string; digest?: string }
  const body = JSON.stringify({
    name: String(e.name ?? 'Error').slice(0, 100),
    message: String(e.message ?? error).slice(0, 500),
    stack: String(e.stack ?? '').slice(0, 1500),
    digest: e.digest ? String(e.digest).slice(0, 100) : undefined,
    path: location.pathname,
  })
  const sent = navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'application/json' }))
  if (!sent) fetch('/api/client-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
}

/**
 * Shown when a screen fails. If the tab is just older than the latest update, it reloads itself
 * once instead. Every real error is reported so it can be fixed.
 */
export function ErrorScreen({ error, retry }: Props) {
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    const err = error as { name?: string; message?: string } | null
    if (isStaleBuildError(err)) {
      let last: number | null = null
      try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || null } catch {}
      if (shouldAutoReload(last, Date.now())) {
        try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())) } catch {}
        // eslint-disable-next-line react-hooks/set-state-in-effect -- show "updating" while the reload starts
        setReloading(true)
        location.reload()
        return
      }
    }
    report(error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-2xl font-semibold">{reloading ? 'Updating Daily Debrief…' : 'That screen hit a snag'}</p>
      {!reloading && (
        <>
          <p className="mt-2 max-w-sm text-sm text-muted">Your answers so far are saved on this device. Try again, and if it keeps happening, reload the app.</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => retry()} className="rounded-card bg-accent px-5 py-2.5 font-semibold text-on-accent">Try again</button>
            <button onClick={() => location.reload()} className="rounded-card border border-line px-5 py-2.5">Reload</button>
          </div>
        </>
      )}
    </div>
  )
}
