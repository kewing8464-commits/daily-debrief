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
  // Neither reply can be rescued: plain text, then JSON that is not an object.
  const r = await summarizeTranscript(turns, 6, scripted('nope', JSON.stringify('just a sentence')))
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

test('a few wrongly typed fields are dropped or converted instead of losing the whole summary', async () => {
  // Real gpt-oss-120b output from a live test: booleans where text belongs, a number as a string.
  const real = {
    sleep: { bedtime: 'around 11', wake: '6:30' },
    workout: { did: true, type: 'lifting', minutes: '45' },
    food: [{ item: 'eggs' }, { item: 'steak' }],
    work: { meetings: 1, good: true, enjoyed: ['showing ranch'], disliked: [] },
    people: [{ name: 'Jake', feeling: 'negative' }],
    fun: true,
    annoyed: true,
    standout: 'pheasant hunting with my dad',
    tags: ['hunting'],
    oneLine: 'Lifted, showed a ranch, hunted with dad.',
  }
  const r = await summarizeTranscript(turns, 8, scripted(JSON.stringify(real)))
  expect(r.usedAi).toBe(true)
  expect(r.summary.workout).toEqual({ did: true, type: 'lifting', minutes: 45 })
  expect(r.summary.fun).toBeUndefined()
  expect(r.summary.annoyed).toBeUndefined()
  expect(r.summary.work.good).toBeUndefined()
  expect(r.summary.work.enjoyed).toEqual(['showing ranch'])
  expect(r.summary.standout).toBe('pheasant hunting with my dad')
  expect(r.summary.people).toEqual([{ name: 'Jake', feeling: 'negative' }])
})

test('an unknown feeling drops just that person', async () => {
  const r = await summarizeTranscript(turns, 8, scripted(JSON.stringify({ people: [{ name: 'Jake', feeling: 'annoyed' }, { name: 'Dad', feeling: 'positive' }] })))
  expect(r.summary.people).toEqual([{ name: 'Dad', feeling: 'positive' }])
})

test('quick-reply ranges become numbers: "1-2" is 1.5, "5+" is 5', async () => {
  const a = await summarizeTranscript(turns, 8, scripted(JSON.stringify({ alcohol: { drinks: '1-2', kind: 'beer' } })))
  expect(a.summary.alcohol).toEqual({ drinks: 1.5, kind: 'beer' })
  const b = await summarizeTranscript(turns, 8, scripted(JSON.stringify({ alcohol: { drinks: '5+' } })))
  expect(b.summary.alcohol.drinks).toBe(5)
})

test('a workout type or duration means they worked out, whatever "did" says', async () => {
  const r = await summarizeTranscript(turns, 8, scripted(JSON.stringify({ workout: { did: false, type: 'lifting', minutes: 45 } })))
  expect(r.summary.workout).toEqual({ did: true, type: 'lifting', minutes: 45 })
})
