import { timeAgo } from '@/lib/time-ago'

const now = new Date('2026-10-27T20:00:00Z')

test('timeAgo reads naturally', () => {
  expect(timeAgo('2026-10-27T19:59:30Z', now)).toBe('just now')
  expect(timeAgo('2026-10-27T19:58:00Z', now)).toBe('2 minutes ago')
  expect(timeAgo('2026-10-27T19:00:00Z', now)).toBe('1 hour ago')
  expect(timeAgo('2026-10-27T18:00:00Z', now)).toBe('2 hours ago')
  expect(timeAgo('2026-10-26T20:00:00Z', now)).toBe('yesterday')
  expect(timeAgo('2026-10-20T20:00:00Z', now)).toBe('7 days ago')
})
