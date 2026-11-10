import { bestStreak, type DayRow } from '@/lib/stats'
import { emptySummary } from '@/lib/summary'
import { startButton } from '@/lib/today'

const DEBRIEF = 21 * 60 + 30

test('the Start button appears at noon and gets big an hour before debrief time', () => {
  expect(startButton(9 * 60, DEBRIEF, false)).toBe('hidden')
  expect(startButton(13 * 60, DEBRIEF, false)).toBe('normal')
  expect(startButton(21 * 60, DEBRIEF, false)).toBe('prominent')
  expect(startButton(23 * 60, DEBRIEF, false)).toBe('prominent')
  expect(startButton(1 * 60, DEBRIEF, false)).toBe('prominent') // after midnight, still tonight
  expect(startButton(21 * 60, DEBRIEF, true)).toBe('hidden')
})

test('best streak is the longest run of saved days', () => {
  const row = (day_date: string): DayRow => ({ day_date, score: 7, status: 'saved', summary: emptySummary(7) })
  expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'].map(row))).toBe(3)
  expect(bestStreak([])).toBe(0)
  expect(bestStreak([{ ...row('2026-10-01'), status: 'draft' }])).toBe(0)
})
