'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { timeAgo } from '@/lib/time-ago'

type Status = { connected: boolean; createdAt?: string; lastUsedAt?: string | null }

const PROJECT_INSTRUCTIONS =
  'You have my Daily Debrief journal through the Daily Debrief connector. When I ask about my life, habits, moods, sleep, food, drinking, workouts, people, or work, look it up with the connector tools before answering, use real dates and numbers, and say when a pattern is only a correlation.'

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      setDone(false)
    }
  }
  return (
    <button onClick={copy} className="shrink-0 rounded-card bg-accent px-3 py-2 text-sm font-bold text-[#1e1714]">
      {done ? 'Copied ✓' : label}
    </button>
  )
}

function Guide({ title, steps, children }: { title: string; steps: string[]; children?: React.ReactNode }) {
  return (
    <details className="mt-2 rounded-card border border-line px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      {children}
    </details>
  )
}

export function ConnectAi() {
  const [status, setStatus] = useState<Status | null>(null)
  const [url, setUrl] = useState('')
  const [confirm, setConfirm] = useState<'replace' | 'revoke' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/connector')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStatus)
      .catch(() => setError('Could not load your connector. Refresh to try again.'))
  }, [])

  async function create() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/connector', { method: 'POST' })
      if (!r.ok) throw new Error()
      const { url } = await r.json()
      setUrl(url)
      setStatus({ connected: true, createdAt: new Date().toISOString(), lastUsedAt: null })
    } catch {
      setError('Could not create a link. Try again.')
    }
    setBusy(false)
    setConfirm(null)
  }

  async function revoke() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/connector', { method: 'DELETE' })
      if (!r.ok) throw new Error()
      setUrl('')
      setStatus({ connected: false })
    } catch {
      setError('Could not revoke the link. Try again.')
    }
    setBusy(false)
    setConfirm(null)
  }

  const statusLine = !status
    ? '…'
    : !status.connected
      ? 'Not connected'
      : status.lastUsedAt
        ? `Connected, last used ${timeAgo(status.lastUsedAt, new Date())}`
        : 'Link created, not used yet'

  return (
    <Card className="mb-3">
      <p className="font-semibold">Connect your AI 🔌</p>
      <p className="mt-1 text-sm text-muted">
        Give Claude, ChatGPT, or another AI app read-only access to your saved debriefs, then ask it about your life.
      </p>
      <p className="mt-2 text-sm">{statusLine}</p>

      {url && (
        <div className="mt-3 rounded-card border border-accent p-3">
          <p className="text-sm font-semibold">Your connector link</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-bg px-2 py-2 text-xs">{url}</code>
            <CopyButton text={url} />
          </div>
          <p className="mt-2 text-xs text-muted">Copy it now. You won&apos;t see this link again.</p>
        </div>
      )}

      {status && !status.connected && (
        <button onClick={create} disabled={busy} className="mt-3 w-full rounded-card bg-accent py-3 font-bold text-[#1e1714] disabled:opacity-60">
          Create my connector link
        </button>
      )}

      {status?.connected && confirm === null && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => setConfirm('replace')} className="flex-1 rounded-card border border-line py-2.5 text-sm font-semibold">Replace link</button>
          <button onClick={() => setConfirm('revoke')} className="flex-1 rounded-card border border-line py-2.5 text-sm font-semibold text-muted">Revoke</button>
        </div>
      )}

      {confirm && (
        <div className="mt-3 rounded-card border border-line p-3">
          <p className="text-sm">
            {confirm === 'replace'
              ? 'Your old link stops working right away. You\'ll need to paste the new one into your AI app.'
              : 'Your AI app loses access to your journal right away.'}
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={confirm === 'replace' ? create : revoke} disabled={busy} className="flex-1 rounded-card bg-accent py-2.5 text-sm font-bold text-[#1e1714] disabled:opacity-60">
              {confirm === 'replace' ? 'Make a new link' : 'Revoke access'}
            </button>
            <button onClick={() => setConfirm(null)} className="flex-1 rounded-card border border-line py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-accent">{error}</p>}

      <p className="mt-3 text-xs text-muted">Anyone with this link can read your journal. Don&apos;t share it. Revoke it any time.</p>

      <Guide
        title="Set it up in Claude"
        steps={[
          'On claude.ai, open Settings, then Connectors.',
          'Tap Add custom connector. Name it Daily Debrief and paste your link. Tap Add.',
          'Make a Project called My Life and paste the instructions below into it.',
          'In a chat inside that project, turn on Daily Debrief from the tools menu and ask away.',
        ]}
      >
        <div className="mt-2 rounded-card bg-bg p-2">
          <p className="text-xs text-muted">{PROJECT_INSTRUCTIONS}</p>
          <div className="mt-2 flex justify-end"><CopyButton text={PROJECT_INSTRUCTIONS} label="Copy instructions" /></div>
        </div>
        <p className="mt-2 text-xs text-muted">Try asking: &quot;What do my best days have in common?&quot;</p>
      </Guide>
      <Guide
        title="Set it up in ChatGPT"
        steps={[
          'On chatgpt.com, open Settings, then Apps & Connectors, then Advanced, and turn on Developer mode.',
          'Back in Apps & Connectors, tap Create. Name it Daily Debrief, paste your link, choose No authentication, and tap Create.',
          'In a chat, open the + menu, pick Daily Debrief, and ask away.',
        ]}
      />
    </Card>
  )
}
