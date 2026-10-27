import { emptySummary } from '@/lib/summary'
import { weekStats, type DayRow } from '@/lib/stats'

const day = (day_date: string, score: number | null, hours?: number): DayRow => ({
  day_date,
  score,
  status: score === null ? 'draft' : 'saved',
  summary: score === null ? null : { ...emptySummary(score), sleep: hours === undefined ? {} : { hours } },
})

test('seven bars ending today, oldest first, empty dates included', () => {
  const s = weekStats([day('2026-10-27', 8), day('2026-10-23', 4)], '2026-10-27')
  expect(s.bars.map((b) => b.date)).toEqual(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
  expect(s.bars.map((b) => b.score)).toEqual([null, null, 4, null, null, null, 8])
})

test('streak counts consecutive saved days ending today', () => {
  const s = weekStats([day('2026-10-25', 6), day('2026-10-26', 7), day('2026-10-27', 8)], '2026-10-27')
  expect(s.streak).toBe(3)
})

test('streak still counts through yesterday when today is not done yet', () => {
  const s = weekStats([day('2026-10-25', 6), day('2026-10-26', 7)], '2026-10-27')
  expect(s.streak).toBe(2)
})

test('a gap resets the streak', () => {
  const s = weekStats([day('2026-10-23', 6), day('2026-10-25', 7), day('2026-10-26', 7)], '2026-10-27')
  expect(s.streak).toBe(2)
})

test('drafts do not count toward the streak or the bars', () => {
  const s = weekStats([day('2026-10-27', null), day('2026-10-26', 7)], '2026-10-27')
  expect(s.streak).toBe(1)
  expect(s.bars.at(-1)!.score).toBeNull()
})

test('sleep average ignores days without hours and rounds to one decimal', () => {
  const s = weekStats([day('2026-10-25', 6, 7), day('2026-10-26', 7, 8.25), day('2026-10-27', 8)], '2026-10-27')
  expect(s.sleepAvg).toBe(7.6)
})

test('no sleep data gives null', () => {
  expect(weekStats([], '2026-10-27').sleepAvg).toBeNull()
})

test('the streak crosses a month boundary', () => {
  const s = weekStats([day('2026-10-31', 6), day('2026-11-01', 7)], '2026-11-01')
  expect(s.streak).toBe(2)
})
