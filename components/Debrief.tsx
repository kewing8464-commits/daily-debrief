'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { startConversation, type ConversationState, type NextQuestion, type Turn } from '@/lib/conversation'
import { debriefDateFor } from '@/lib/dates'
import { appendSession, createDraftQueue, DRAFT_KEY, restoreDraft, serializeDraft } from '@/lib/draft'
import { emptySummary, mergeAddedSummary, type DaySummary } from '@/lib/summary'
import { FOCUS_LABELS, FOCUS_QUESTION, PRODUCTIVE_LABELS, PRODUCTIVE_QUESTION } from '@/lib/ratings'
import { fromMemoryFor } from '@/lib/today'
import { progressFilled, SCORE_QUESTION, TOPICS } from '@/lib/topics'
import { Bubble } from './Bubble'
import { QuickReplies } from './QuickReplies'
import { RatingPicker } from './RatingPicker'
import { ScorePicker } from './ScorePicker'
import { SummaryForm } from './SummaryForm'
import { RECORDER_MESSAGES, useRecorder } from './useRecorder'
import { useSpeaker } from './useSpeaker'

type Phase = 'loading' | 'chat' | 'score' | 'summarizing' | 'review' | 'saving'
type SavedDay = { transcript: Turn[]; score: number | null; productive?: number | null; focus?: number | null; from_memory?: boolean | null; summary: DaySummary | null; status: 'draft' | 'saved'; updated_at: string; duration_sec: number | null }

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

export function Debrief({ requestedDate, ratingsOn = true }: { requestedDate?: string; ratingsOn?: boolean }) {
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
  const [productive, setProductive] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [fromMemory, setFromMemory] = useState(false)
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
  const speaker = useSpeaker()
  const recorder = useRecorder((text) => send(text))

  // Talk by default on phones, Type on computers, unless they picked one before.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dd.mode')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved choice after mount
      if (saved === 'talk' || saved === 'type') setMode(saved)
      else if (!window.matchMedia('(min-width: 1024px)').matches) setMode('talk')
    } catch {}
  }, [])

  function pickMode(m: 'talk' | 'type') {
    setMode(m)
    recorder.clearError()
    try { localStorage.setItem('dd.mode', m) } catch {}
  }

  // A blocked microphone shouldn't strand anyone: drop to typing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the recorder's permission result
    if (recorder.error === 'denied' || recorder.error === 'unsupported') setMode('type')
  }, [recorder.error])

  // In Talk mode, read each new question out loud.
  const spokenFor = useRef('')
  useEffect(() => {
    if (mode !== 'talk') return
    const text = phase === 'chat' ? next?.text : phase === 'score' ? SCORE_QUESTION : ''
    if (text && spokenFor.current !== text) {
      spokenFor.current = text
      speaker.speak(text)
    }
  }, [mode, phase, next, speaker])

  // Keep the screen awake mid-debrief (where the browser allows it).
  useEffect(() => {
    if (phase !== 'chat' && phase !== 'score') return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [phase])

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
      setFromMemory(fromMemoryFor(row, d, today))
      started.current = Date.now()
      loadedVersion.current = row?.updated_at ?? null
      if (row?.status === 'saved') {
        setSaved(row)
        setScore(row.score)
        setProductive(row.productive ?? null)
        setFocus(row.focus ?? null)
        setState({ turns: [{ role: 'assistant', text: ADD_QUESTION }], covered: TOPICS.map((t) => t.id), skipped: [] })
        setNext({ topic: 'score', text: ADD_QUESTION })
      } else {
        let s: ConversationState | null = restoreDraft(readStorage(), d) ?? (row?.transcript?.length ? { ...startConversation(), turns: row.transcript } : null)
        if (!s) {
          // Fresh debrief: start from today's vibe checks if there are any.
          try {
            const res = await fetch('/api/debrief/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: d }) })
            if (!res.ok) throw new Error(`start ${res.status}`)
            s = ((await res.json()) as { state: ConversationState }).state
          } catch {
            s = startConversation()
          }
        }
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
          productive,
          focus,
          fromMemory,
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
    ;(navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {})
    router.replace(`/day/${date}?saved=1`)
    router.refresh()
  }

  const filled = progressFilled(state.covered, state.skipped)

  return (
    <div className="flex min-h-dvh lg:justify-center lg:gap-8">
    <main className="safe-top flex min-h-dvh w-full max-w-2xl flex-col px-4 lg:pt-8">
      <div className="mb-3 flex rounded-card bg-[color-mix(in_srgb,var(--text)_8%,transparent)] p-1 text-sm font-bold">
        {(['talk', 'type'] as const).map((m) => (
          <button key={m} onClick={() => pickMode(m)} className={`flex-1 rounded-[5px] py-1.5 ${mode === m ? 'bg-surface text-ink' : 'text-muted'}`}>
            {m === 'talk' ? '🎙 Talk' : '⌨️ Type'}
          </button>
        ))}
      </div>
      {recorder.error && (
        <p className="mb-3 rounded-card border border-line bg-surface p-3 text-sm text-[#f2c9b4]">{RECORDER_MESSAGES[recorder.error]}</p>
      )}
      {offline && (
        <div className="mb-3 rounded-card border border-line bg-surface p-3 text-sm">
          <p className="text-[#f2c9b4]">You seem to be offline. Your answers so far are kept on this phone.</p>
          <button onClick={() => { setPhase('loading'); setLoadTry((n) => n + 1) }} className="mt-2 font-semibold text-accent">Try again</button>
        </div>
      )}
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        {saved ? (
          <span>Adding to this day</span>
        ) : (
          <span className="flex flex-1 gap-[3px] pr-3" aria-label={`${filled} of 12 topics covered`}>
            {TOPICS.map((t, i) => <span key={t.id} className={`h-[3px] flex-1 rounded ${i < filled ? 'bg-accent2' : 'bg-line'}`} />)}
          </span>
        )}
        <span className="flex items-center gap-3">
          {mode === 'talk' && (
            <button onClick={speaker.toggle} aria-label={speaker.on ? 'Mute the questions' : 'Read the questions out loud'} className="text-base">
              {speaker.on ? '🔊' : '🔇'}
            </button>
          )}
          <Link href="/" className="px-1 text-base">✕</Link>
        </span>
      </div>

      <div className="flex-1 pb-4">
        {phase === 'loading' && <p className="text-muted">Getting your debrief ready…</p>}
        {phase !== 'loading' && state.turns.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />)}
        {busy && <p className="text-sm text-muted">…</p>}

        {phase === 'score' && (
          <div className="mt-4">
            <Bubble role="assistant" text={SCORE_QUESTION} />
            <ScorePicker value={score} onPick={(n) => (ratingsOn ? setScore(n) : finishWithScore(n))} />
            {ratingsOn && (
              <>
                <p className="mt-5 mb-2 font-serif text-lg">⚡ {PRODUCTIVE_QUESTION}</p>
                <RatingPicker labels={PRODUCTIVE_LABELS} value={productive} onPick={setProductive} />
                <p className="mt-4 mb-2 font-serif text-lg">🎯 {FOCUS_QUESTION}</p>
                <RatingPicker labels={FOCUS_LABELS} value={focus} onPick={setFocus} />
                <p className="mt-2 text-xs text-muted">Both optional.</p>
                <button
                  onClick={() => score && finishWithScore(score)}
                  disabled={!score}
                  className="mt-4 w-full rounded-card bg-accent py-3 font-bold text-[#1e1714] disabled:opacity-40"
                >
                  Next: review
                </button>
              </>
            )}
          </div>
        )}
        {phase === 'summarizing' && <p className="mt-4 text-muted">Putting your day together…</p>}
        {(phase === 'review' || phase === 'saving') && summary && (
          <div className="mt-4 rounded-card border border-line bg-surface p-3.5">
            {fromMemory && <p className="text-xs tracking-wide text-muted">FROM MEMORY</p>}
            <h2 className="mb-1 font-serif text-xl">Here&apos;s your day</h2>
            <p className="mb-3 text-sm text-muted">Fix anything that&apos;s off, then save.</p>
            {aiNote && <p className="mb-3 text-sm text-[#f2c9b4]">{aiNote}</p>}
            <SummaryForm value={summary} onChange={setSummary} />
            <button onClick={save} disabled={phase === 'saving'} className="mt-2 w-full rounded-card bg-accent py-3 font-bold text-[#1e1714] disabled:opacity-60">
              {phase === 'saving' ? 'Saving…' : 'Lock it in'}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-[#e89f88]">{error}</p>}
        <div ref={bottom} />
      </div>

      {phase === 'chat' && mode === 'talk' && (
        <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 pt-3">
          {next?.quickReplies && recorder.status === 'idle' && <QuickReplies options={next.quickReplies} onPick={(v) => send(v)} />}
          <div className="flex h-12 items-center justify-center gap-[3px]" aria-hidden>
            {recorder.levels.map((v, i) => (
              <span key={i} className="w-1 rounded bg-accent transition-[height] duration-75" style={{ height: `${Math.max(4, v * 46)}px`, opacity: recorder.status === 'recording' ? 1 : 0.35 }} />
            ))}
          </div>
          <p className="mb-2 text-center text-xs text-muted">
            {busy ? 'Thinking…' : recorder.status === 'recording' ? 'Listening… tap to stop' : recorder.status === 'transcribing' ? 'Getting your words…' : 'Tap the mic and talk'}
          </p>
          <div className="mb-2 flex items-center justify-between">
            {!saved ? <button onClick={() => send('', true)} disabled={busy || recorder.status !== 'idle'} className="w-20 text-left text-sm text-muted">Skip</button> : <span className="w-20" />}
            <button
              onClick={() => (recorder.status === 'recording' ? recorder.stop() : recorder.start())}
              disabled={busy || recorder.status === 'transcribing'}
              aria-label={recorder.status === 'recording' ? 'Stop recording' : 'Start talking'}
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent text-2xl text-[#1e1714] disabled:opacity-50 ${recorder.status === 'recording' ? 'shadow-[0_0_0_10px_rgba(224,137,95,0.25)]' : ''}`}
            >
              {recorder.status === 'recording' ? '■' : '🎙'}
            </button>
            {!saved ? <button onClick={() => setPhase('score')} disabled={busy || recorder.status !== 'idle'} className="w-20 text-right text-sm text-muted">I&apos;m done</button> : <span className="w-20" />}
          </div>
        </div>
      )}

      {phase === 'chat' && mode === 'type' && (
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
    {!saved && phase !== 'loading' && (
      <aside className="hidden w-[260px] shrink-0 pt-8 lg:block">
        <div className="sticky top-8 rounded-card border border-line bg-surface p-4">
          <p className="mb-2 text-[10px] tracking-wide text-muted">TONIGHT SO FAR · {filled} OF 12</p>
          {TOPICS.map((t) => {
            const done = state.covered.includes(t.id)
            const skipped = state.skipped.includes(t.id)
            return (
              <p key={t.id} className={`flex gap-2 py-1 text-sm ${done ? '' : 'text-muted'}`}>
                <span className="w-4 text-center">{done ? '✓' : skipped ? '–' : '○'}</span>
                {t.label.charAt(0).toUpperCase() + t.label.slice(1)}
              </p>
            )
          })}
        </div>
      </aside>
    )}
    </div>
  )
}
