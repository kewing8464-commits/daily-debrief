import { progressFilled, TOPICS } from '@/lib/topics'

test('progress fills one segment per topic covered or skipped, out of 12', () => {
  expect(progressFilled(['food', 'sleep'], ['weed'])).toBe(3)
  expect(progressFilled([...TOPICS.map((t) => t.id), 'food'], ['food'])).toBe(12)
  expect(progressFilled([], [])).toBe(0)
})
