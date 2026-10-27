'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { startConversation, type ConversationState, type NextQuestion, type Turn } from '@/lib/conversation'
import { debriefDateFor } from '@/lib/dates'
import { appendSession, DRAFT_KEY, restoreDraft, serializeDraft } from '@/lib/draft'
import type { DaySummary } from '@/lib/summary'
import { TOPICS } from '@/lib/topics'
import { Bubble } from './Bubble'
import { QuickReplies } from './QuickReplies'
import { ScorePicker } from './ScorePicker'
import { SummaryForm } from './SummaryForm'

type Phase = 'loading' | 'chat' | 'score' | 'summarizing' | 'review' | 'saving'
type SavedDay = { transcript: Turn[]; score: number | null; summary: DaySummary | null; status: 'draft' | 'saved' }

const ADD_QUESTION = 'Anything you want to add to today?'

function readStorage(): string | null {
  try { return localStorage.getItem(DRAFT_KEY) } catch { return null }
}
function writeStorage(v: string | null) {
  try {
    if (v === null) localStorage.removeItem(DRAFT_KEY)
    else localStorage.setItem(DRAFT_KEY, v)
  } catch { /* private mode */ }
}

export function Debrief({ requestedDate }: { requestedDate?: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [date, setDate] = useState('')
  const [tz, setTz] = useState('UTC')
  const [state, setState] = useState<ConversationState>(startConversation)
  const [next, setNext] = useState<NextQuestion | null>(null)
  const [saved, setSaved] = useState<SavedDay | null>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'type' | 'talk'>('type')
  const [score, setScore] = useState<number | null>(null)
  const [summary, setSummary] = useState<DaySummary | null>(null)
  const [aiNote, setAiNote] = useState('')
  const [error, setError] = useState('')
  const started = useRef(0)
  const bottom = useRef<HTMLDivElement>(null)

  // Work out which date we are debriefing, then resume a draft, add to a saved day, or start fresh.
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const today = debriefDateFor(new Date(), zone)
    const d = requestedDate ?? today
    ;(async () => {
      const res = await fetch(`/api/days/${d}`)
      const row: SavedDay | null = res.ok ? await res.json() : null
      setTz(zone)
      setDate(d)
      started.current = Date.now()
      if (row?.status === 'saved') {
        setSaved(row)
        setScore(row.score)
        setState({ turns: [{ role: 'assistant', text: ADD_QUESTION }], covered: TOPICS.map((t) => t.id), skipped: [] })
        setNext({ topic: 'score', text: ADD_QUESTION })
      } else {
        const draft = restoreDraft(readStorage(), d) ?? (row?.transcript?.length ? { ...startConversation(), turns: row.transcript } : null)
        const s = draft ?? startConversation()
        setState(s)
        const lastQ = [...s.turns].reverse().find((t) => t.role === 'assistant')!
        const topic = TOPICS.find((t) => t.id === lastQ.topic)
        setNext({ topic: lastQ.topic ?? 'score', text: lastQ.text, quickReplies: topic?.quickReplies })
      }
      setPhase('chat')
    })()
  }, [requestedDate])

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [state.turns.length, phase])

  function persist(s: ConversationState) {
    writeStorage(serializeDraft(date, s))
    // Every 3 answers, also save a draft to the server (ignored if the day is already saved).
    const answers = s.turns.filter((t) => t.role === 'user').length
    if (!saved && answers > 0 && answers % 3 === 0) {
      fetch(`/api/days/${date}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript: s.turns, summary: null, score: null, mode, durationSec: Math.round((Date.now() - started.current) / 1000), timezone: tz, status: 'draft' }),
      }).catch(() => {})
    }
  }

  async function send(text: string, skip = false) {
    if (busy || (!skip && !text.trim())) return
    setAnswer('')
    setError('')
    // Adding to a saved day: one free answer, then straight to the score.
    if (saved) {
      setState({ ...state, turns: [...state.turns, { role: 'user', text: text.trim() }] })
      return setPhase('score')
    }
    setBusy(true)
    try {
      const res = await fetch('/api/debrief/turn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, answer: text.trim(), skip }),
      })
      if (!res.ok) throw new Error(`turn ${res.status}`)
      const r = (await res.json()) as { state: ConversationState; next: NextQuestion; usedAi: boolean }
      setState(r.state)
      setNext(r.next)
      persist(r.state)
      if (r.next.topic === 'score') setPhase('score')
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function finishWithScore(n: number) {
    setScore(n)
    setPhase('summarizing')
    const turns = saved ? appendSession(saved, state.turns) : state.turns
    try {
      const res = await fetch('/api/debrief/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ turns, score: n }),
      })
      const r = (await res.json()) as { summary: DaySummary; usedAi: boolean }
      setSummary(r.summary)
      setAiNote(r.usedAi ? '' : "The AI couldn't summarize this one, so fill in anything you want. Your full conversation is saved either way.")
    } catch {
      setSummary({ score: n, sleep: {}, food: [], workout: { did: false }, alcohol: { drinks: 0 }, cannabis: { used: false }, work: {}, people: [], tags: [], oneLine: '' })
      setAiNote("Couldn't reach the server for a summary. Fill in anything you want and save.")
    }
    setPhase('review')
  }

  async function save() {
    if (!summary) return
    setPhase('saving')
    const turns = saved ? appendSession(saved, state.turns) : state.turns
    const res = await fetch(`/api/days/${date}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transcript: turns,
        summary,
        score: summary.score,
        mode,
        durationSec: Math.round((Date.now() - started.current) / 1000),
        timezone: tz,
        status: 'saved',
      }),
    })
    if (!res.ok) {
      setError('Saving failed. Your answers are still here, try again in a moment.')
      return setPhase('review')
    }
    writeStorage(null)
    router.replace(`/day/${date}`)
    router.refresh()
  }

  const asked = state.turns.filter((t) => t.role === 'assistant').length
  const remaining = TOPICS.filter((t) => !state.covered.includes(t.id) && !state.skipped.includes(t.id) && t.id !== next?.topic).length
  const progress = phase === 'chat' && !saved ? `Question ${asked} of about ${asked + remaining + 1}` : ''

  return (
    <main className="safe-top flex min-h-dvh flex-col px-4">
      <div className="mb-3 flex rounded-card bg-[color-mix(in_srgb,var(--text)_8%,transparent)] p-1 text-sm font-bold">
        {(['talk', 'type'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-[5px] py-1.5 ${mode === m ? 'bg-surface text-ink' : 'text-muted'}`}>
            {m === 'talk' ? '🎙 Talk' : '⌨️ Type'}
          </button>
        ))}
      </div>
      {mode === 'talk' && (
        <p className="mb-3 rounded-card border border-line bg-surface p-3 text-sm text-muted">
          Voice is coming in the next update. For now, tap the 🎙 on your iPhone keyboard to dictate your answers.
        </p>
      )}
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{saved ? 'Adding to today' : progress}</span>
        <Link href="/" className="px-1 text-base">✕</Link>
      </div>

      <div className="flex-1 pb-4">
        {phase === 'loading' && <p className="text-muted">Getting your debrief ready…</p>}
        {phase !== 'loading' && state.turns.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />)}
        {busy && <p className="text-sm text-muted">…</p>}

        {phase === 'score' && (
          <div className="mt-4">
            <Bubble role="assistant" text="How would you rate today, 1 to 10?" />
            <ScorePicker value={score} onPick={finishWithScore} />
          </div>
        )}
        {phase === 'summarizing' && <p className="mt-4 text-muted">Putting your day together…</p>}
        {(phase === 'review' || phase === 'saving') && summary && (
          <div className="mt-4 rounded-card border border-line bg-surface p-3.5">
            <h2 className="mb-1 font-serif text-xl">Here&apos;s your day</h2>
            <p className="mb-3 text-sm text-muted">Fix anything that&apos;s off, then save.</p>
            {aiNote && <p className="mb-3 text-sm text-[#f2c9b4]">{aiNote}</p>}
            <SummaryForm value={summary} onChange={setSummary} />
            <button onClick={save} disabled={phase === 'saving'} className="mt-2 w-full rounded-card bg-accent py-3 font-bold text-[#1e1714] disabled:opacity-60">
              {phase === 'saving' ? 'Saving…' : 'Save my day'}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-[#e89f88]">{error}</p>}
        <div ref={bottom} />
      </div>

      {phase === 'chat' && (
        <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 pt-2">
          {next?.quickReplies && <QuickReplies options={next.quickReplies} onPick={(v) => send(v)} />}
          <form onSubmit={(e) => { e.preventDefault(); send(answer) }} className="flex items-end gap-2 rounded-[20px] border border-line bg-surface py-1.5 pr-1.5 pl-3">
            <textarea
              rows={1}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(answer) } }}
              placeholder="Type your answer…"
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-base outline-none"
            />
            <button disabled={busy || !answer.trim()} className="h-9 w-9 shrink-0 rounded-full bg-accent font-black text-[#1e1714] disabled:opacity-40">↑</button>
          </form>
          <div className="flex justify-between py-2 text-sm text-muted">
            {!saved ? <button onClick={() => send('', true)} disabled={busy}>Skip this one</button> : <span />}
            {!saved && <button onClick={() => setPhase('score')} disabled={busy}>End early</button>}
          </div>
        </div>
      )}
    </main>
  )
}
