import type { Turn } from '@/lib/conversation'
import { appendSession, restoreDraft, serializeDraft } from '@/lib/draft'
import { startConversation } from '@/lib/conversation'

test('a draft from today is restored', () => {
  const state = startConversation()
  const stored = serializeDraft('2026-10-27', state)
  expect(restoreDraft(stored, '2026-10-27')).toEqual(state)
})

test("yesterday's draft is not restored", () => {
  expect(restoreDraft(serializeDraft('2026-10-26', startConversation()), '2026-10-27')).toBeNull()
})

test('corrupt or missing storage is ignored', () => {
  expect(restoreDraft('{not json', '2026-10-27')).toBeNull()
  expect(restoreDraft(null, '2026-10-27')).toBeNull()
  expect(restoreDraft(JSON.stringify({ date: '2026-10-27', state: { turns: 'nope' } }), '2026-10-27')).toBeNull()
})

const old: Turn[] = [
  { role: 'assistant', text: 'How did you start your day?', topic: 'morning' },
  { role: 'user', text: 'Gym', topic: 'morning' },
]
const later: Turn[] = [
  { role: 'assistant', text: 'Anything to add?' },
  { role: 'user', text: 'Pizza at 11pm' },
]

test('a second session appends after a divider and keeps every earlier turn', () => {
  const merged = appendSession({ transcript: old }, later)
  expect(merged).toEqual([...old, { role: 'assistant', text: 'Added later' }, ...later])
})

test('appending to an empty day adds no divider', () => {
  expect(appendSession({ transcript: [] }, later)).toEqual(later)
})

test('appending twice keeps both sessions in order', () => {
  const once = appendSession({ transcript: old }, later)
  const twice = appendSession({ transcript: once }, [{ role: 'user', text: 'One more thing' }])
  expect(twice.slice(0, once.length)).toEqual(once)
  expect(twice.filter((t) => t.text === 'Added later')).toHaveLength(2)
})
