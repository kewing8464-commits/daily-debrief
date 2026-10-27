import { AiUnavailableError, type ChatModel } from '@/lib/ai/provider'
import { nextTurn, startConversation } from '@/lib/conversation'
import { monthRange } from '@/lib/dates'
import { saveConflict } from '@/lib/days'
import { createDraftQueue } from '@/lib/draft'
import { mergeAddedSummary, emptySummary, summarizeTranscript, type DaySummary } from '@/lib/summary'

const savedSummary: DaySummary = {
  ...emptySummary(8),
  sleep: { hours: 7.5 },
  food: [{ item: 'eggs' }],
  workout: { did: true, type: 'lift', minutes: 45 },
  alcohol: { drinks: 2 },
  people: [{ name: 'Jake', feeling: 'positive' }],
  happy: 'client signed',
  oneLine: 'Good day.',
}

// C1
test('adding to a saved day while the AI is down keeps the saved summary and takes the new score', () => {
  const r = mergeAddedSummary(savedSummary, { summary: emptySummary(9), usedAi: false }, 9)
  expect(r).toEqual({ ...savedSummary, score: 9 })
})

test('adding with the AI working keeps hand edits and fills only what was missing', () => {
  const fresh: DaySummary = { ...emptySummary(9), sleep: { hours: 6 }, food: [{ item: 'eggs' }, { item: 'pizza' }], alcohol: { drinks: 4 }, fun: 'pizza with Sam', people: [{ name: 'Sam', feeling: 'positive' }], oneLine: 'Good day, pizza late.' }
  const r = mergeAddedSummary(savedSummary, { summary: fresh, usedAi: true }, 9)
  expect(r.score).toBe(9)
  expect(r.sleep).toEqual({ hours: 7.5 }) // hand-entered value wins
  expect(r.food).toEqual([{ item: 'eggs' }, { item: 'pizza' }])
  expect(r.alcohol.drinks).toBe(4) // new session can only add drinks
  expect(r.fun).toBe('pizza with Sam')
  expect(r.happy).toBe('client signed')
  expect(r.people.map((p) => p.name)).toEqual(['Jake', 'Sam'])
  expect(r.workout).toEqual(savedSummary.workout)
  expect(r.oneLine).toBe('Good day, pizza late.')
})

// I1a
test('the draft queue lets a final save wait for an in-flight draft write', async () => {
  const order: string[] = []
  const q = createDraftQueue()
  q.push(() => new Promise<void>((res) => setTimeout(() => { order.push('draft'); res() }, 20)))
  await q.flush()
  order.push('save')
  expect(order).toEqual(['draft', 'save'])
})

test('a failed draft write does not block the final save', async () => {
  const q = createDraftQueue()
  q.push(() => Promise.reject(new Error('offline')))
  await expect(q.flush()).resolves.toBeUndefined()
})

// I1b
test('saving over a saved day requires having loaded that exact version', () => {
  const existing = { status: 'saved' as const, updated_at: '2026-10-27T22:00:00Z' }
  expect(saveConflict(existing, { status: 'saved', expectedUpdatedAt: null })).toBe(true)
  expect(saveConflict(existing, { status: 'saved', expectedUpdatedAt: '2026-10-27T21:00:00Z' })).toBe(true)
  expect(saveConflict(existing, { status: 'saved', expectedUpdatedAt: '2026-10-27T22:00:00Z' })).toBe(false)
  expect(saveConflict(null, { status: 'saved', expectedUpdatedAt: null })).toBe(false)
  expect(saveConflict({ status: 'draft', updated_at: 'x' }, { status: 'saved', expectedUpdatedAt: null })).toBe(false)
  expect(saveConflict(existing, { status: 'draft', expectedUpdatedAt: null })).toBe(true) // drafts never touch a saved day
})

// I2
test('month range ends before the next month, never on an invalid date like Nov 31', () => {
  expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', before: '2026-12-01' })
  expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', before: '2027-01-01' })
})

// M5 (re-graded to Important)
const model = (reply: string): ChatModel => ({ complete: async () => reply })
test('a turn survives the model returning JSON null', async () => {
  const r = await nextTurn(startConversation(), 'coffee', model('null'))
  expect(r.usedAi).toBe(false)
  expect(r.next.topic).toBe('sleep')
})

test('a turn survives an unexpected error from the model', async () => {
  const boom: ChatModel = { complete: async () => { throw new TypeError('weird') } }
  const r = await nextTurn(startConversation(), 'coffee', boom)
  expect(r.usedAi).toBe(false)
})

test('a summary survives an unexpected error from the model', async () => {
  const boom: ChatModel = { complete: async () => { throw new TypeError('weird') } }
  const r = await summarizeTranscript([], 7, boom)
  expect(r).toEqual({ summary: emptySummary(7), usedAi: false })
  void AiUnavailableError
})
