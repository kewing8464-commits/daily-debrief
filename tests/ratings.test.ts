import { DayPutSchema } from '@/lib/schemas'
import { FOCUS_LABELS, PRODUCTIVE_LABELS, ratingLabel } from '@/lib/ratings'

test('rating labels read the 1-4 scale', () => {
  expect(PRODUCTIVE_LABELS).toEqual(['Not', 'A bit', 'Solid', 'Very'])
  expect(FOCUS_LABELS).toEqual(['Scattered', 'Distracted', 'Steady', 'Locked in'])
  expect(ratingLabel('productive', 4)).toBe('Very')
  expect(ratingLabel('focus', 1)).toBe('Scattered')
  expect(ratingLabel('focus', null)).toBeNull()
})

const base = { transcript: [], summary: null, score: null, mode: 'type', durationSec: 0, timezone: 'UTC', status: 'draft' }

test('day saves accept optional productive and focus ratings', () => {
  expect(DayPutSchema.safeParse({ ...base, productive: 4, focus: 2 }).success).toBe(true)
  expect(DayPutSchema.safeParse({ ...base, productive: 5 }).success).toBe(false)
  const d = DayPutSchema.parse(base)
  expect(d.productive).toBeNull()
  expect(d.focus).toBeNull()
  expect(d.fromMemory).toBe(false)
})
