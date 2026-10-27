import { AiUnavailableError, type ChatModel } from '@/lib/ai/provider'
import type { Turn } from '@/lib/conversation'
import { emptySummary, summarizeTranscript } from '@/lib/summary'

const turns: Turn[] = [
  { role: 'assistant', text: 'How did you start your day?', topic: 'morning' },
  { role: 'user', text: 'Gym, then coffee with Jake. Two beers at dinner.', topic: 'morning' },
]

const good = {
  score: 3, // the model's guess must never override the user's own score
  sleep: { hours: 7.5 },
  morning: 'Gym, then coffee with Jake',
  food: [{ item: 'dinner' }],
  workout: { did: true, type: 'gym' },
  alcohol: { drinks: 2, kind: 'beer' },
  cannabis: { used: false },
  work: {},
  people: [{ name: 'Jake', feeling: 'positive' }],
  tags: ['gym'],
  oneLine: 'Gym, coffee with Jake, two beers at dinner.',
}

function scripted(...replies: (string | Error)[]): ChatModel & { calls: number } {
  const m = {
    calls: 0,
    async complete() {
      const r = replies[Math.min(m.calls++, replies.length - 1)]
      if (r instanceof Error) throw r
      return r
    },
  }
  return m
}

test('valid model JSON is parsed and the user score wins', async () => {
  const r = await summarizeTranscript(turns, 9, scripted(JSON.stringify(good)))
  expect(r.usedAi).toBe(true)
  expect(r.summary.score).toBe(9)
  expect(r.summary.alcohol).toEqual({ drinks: 2, kind: 'beer' })
  expect(r.summary.people).toEqual([{ name: 'Jake', feeling: 'positive' }])
})

test('invalid output is retried once', async () => {
  const m = scripted('not json', JSON.stringify(good))
  const r = await summarizeTranscript(turns, 8, m)
  expect(m.calls).toBe(2)
  expect(r.usedAi).toBe(true)
})

test('two invalid outputs fall back to an empty summary that keeps the score', async () => {
  const r = await summarizeTranscript(turns, 6, scripted('nope', JSON.stringify({ score: 6, workout: 'yes' })))
  expect(r.usedAi).toBe(false)
  expect(r.summary).toEqual(emptySummary(6))
})

test('an unavailable model falls back without retrying', async () => {
  const m = scripted(new AiUnavailableError('429'))
  const r = await summarizeTranscript(turns, 7, m)
  expect(m.calls).toBe(1)
  expect(r.summary).toEqual(emptySummary(7))
})

test('missing optional sections are filled with safe defaults', async () => {
  const r = await summarizeTranscript(turns, 5, scripted(JSON.stringify({ oneLine: 'Quiet day.' })))
  expect(r.usedAi).toBe(true)
  expect(r.summary).toMatchObject({ score: 5, food: [], people: [], tags: [], workout: { did: false }, alcohol: { drinks: 0 }, cannabis: { used: false }, oneLine: 'Quiet day.' })
})
