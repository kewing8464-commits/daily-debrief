'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { startConversation, type ConversationState, type NextQuestion, type Turn } from '@/lib/conversation'
import { debriefDateFor } from '@/lib/dates'
import { appendSession, createDraftQueue, DRAFT_KEY, restoreDraft, serializeDraft } from '@/lib/draft'
import { emptySummary, mergeAddedSummary, type DaySummary } from '@/lib/summary'
import { TOPICS } from '@/lib/topics'
import { Bubble } from './Bubble'
import { QuickReplies } from './QuickReplies'
import { ScorePicker } from './ScorePicker'
import { SummaryForm } from './SummaryForm'

type Phase = 'loading' | 'chat' | 'score' | 'summarizing' | 'review' | 'saving'
type SavedDay = { transcript: Turn[]; score: number | null; summary: DaySummary | null; status: 'draft' | 'saved'; updated_at: string; duration_sec: number | null }

const MAX_ANSWER = 4000

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
  const drafts = useRef(createDraftQueue())
  // The version of the day this screen loaded; a save is refused if someone saved since.
  const loadedVersion = useRef<string | null>(null)
  const [loadTry, setLoadTry] = useState(0)
  const [offline, setOffline] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  // Work out which date we are debriefing, then resume a draft, add to a saved day, or start fresh.
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const today = debriefDateFor(new Date(), zone)
    const d = requestedDate ?? today
    ;(async () => {
      let row: SavedDay | null = null
      try {
        const res = await fetch(`/api/days/${d}`)
        if (!res.ok) throw new Error(`load ${res.status}`)
        row = await res.json()
        setOffline(false)
      } catch {
        // Can't tell whether this day was already saved: resume locally, but don't allow saving blind.
        setOffline(true)
      }
      setTz(zone)
      setDate(d)
      started.current = Date.now()
      loadedVersion.current = row?.updated_at ?? null
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
  }, [requestedDate, loadTry])

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [state.turns.length, phase])

  function persist(s: ConversationState) {
    writeStorage(serializeDraft(date, s))
    // Every 3 answers, also save a draft to the server (ignored if the day is already saved).
    const answers = s.turns.filter((t) => t.role === 'user').length
    if (!saved && answers > 0 && answers % 3 === 0) {
      const body = JSON.stringify({ transcript: s.turns, summary: null, score: null, mode, durationSec: Math.round((Date.now() - started.current) / 1000), timezone: tz, status: 'draft' })
      drafts.current.push(() => fetch(`/api/days/${date}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body }))
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
      if (res.status === 400) {
        setAnswer(text)
        return setError('That answer is too long to send in one go. Try splitting it up.')
      }
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
      if (!res.ok) throw new Error(`summarize ${res.status}`)
      const r = (await res.json()) as { summary: DaySummary; usedAi: boolean }
      // Adding to a saved day: the saved summary (with any hand edits) stays the base.
      setSummary(saved?.summary ? mergeAddedSummary(saved.summary, r, n) : r.summary)
      setAiNote(r.usedAi ? '' : saved ? "The AI couldn't update the summary, so your saved one is kept. Edit anything you want." : "The AI couldn't summarize this one, so fill in anything you want. Your full conversation is saved either way.")
    } catch {
      setSummary(saved?.summary ? { ...saved.summary, score: n } : emptySummary(n))
      setAiNote("Couldn't reach the server for a summary. Fill in anything you want and save.")
    }
    setPhase('review')
  }

  async function save() {
    if (!summary) return
    setPhase('saving')
    setError('')
    const turns = saved ? appendSession(saved, state.turns) : state.turns
    const thisSession = Math.round((Date.now() - started.current) / 1000)
    try {
      await drafts.current.flush() // a slow background draft must not land after this save
      const res = await fetch(`/api/days/${date}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcript: turns,
          summary,
          score: summary.score,
          mode,
          durationSec: (saved?.duration_sec ?? 0) + thisSession,
          timezone: tz,
          status: 'saved',
          expectedUpdatedAt: loadedVersion.current,
        }),
      })
      if (res.status === 409) {
        setError('This day was saved from another screen. Your answers are still here: reload to add them to the saved day.')
        return setPhase('review')
      }
      if (!res.ok) throw new Error(`save ${res.status}`)
    } catch {
      setError("Couldn't save. Check your connection, your answers are still here. Tap Save again in a moment.")
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
      {offline && (
        <div className="mb-3 rounded-card border border-line bg-surface p-3 text-sm">
          <p className="text-[#f2c9b4]">You seem to be offline. Your answers so far are kept on this phone.</p>
          <button onClick={() => { setPhase('loading'); setLoadTry((n) => n + 1) }} className="mt-2 font-semibold text-accent">Try again</button>
        </div>
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
              maxLength={MAX_ANSWER}
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
