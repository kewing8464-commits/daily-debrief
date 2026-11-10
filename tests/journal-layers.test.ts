import type { SavedDay } from '@/lib/connector/journal'
import { scoreColor } from '@/lib/design'
import { cellStyle, dayIcons, insightLine, legendFor, monthStats, type CalDay } from '@/lib/journal-layers'
import { emptySummary, type DaySummary } from '@/lib/summary'

const day = (day_date: string, score: number, extra: Partial<DaySummary> = {}, r: Partial<CalDay> = {}): CalDay => ({
  day_date, score, summary: { ...emptySummary(score), ...extra }, productive: null, focus: null, ...r,
})

test('mood colors match the calendar score colors', () => {
  expect(cellStyle('mood', day('2026-10-01', 8)).background).toBe(scoreColor(8))
})

test('days without a rating or sleep hours show as empty, not zero', () => {
  expect(cellStyle('productive', day('2026-10-01', 8)).empty).toBe(true)
  expect(cellStyle('focus', day('2026-10-01', 8, {}, { focus: 4 })).empty).toBe(false)
  expect(cellStyle('sleep', day('2026-10-01', 8)).empty).toBe(true)
})

test('no drinks and no workout are the plain surface, not the darkest color', () => {
  expect(cellStyle('drinks', day('2026-10-01', 8)).background).toBe('var(--surface)')
  expect(cellStyle('gym', day('2026-10-01', 8)).background).toBe('var(--surface)')
  expect(cellStyle('gym', day('2026-10-01', 8, { workout: { did: true } })).background).not.toBe('var(--surface)')
})

test('every layer has a legend', () => {
  for (const l of ['mood', 'productive', 'focus', 'sleep', 'drinks', 'gym'] as const) expect(legendFor(l).swatches.length).toBeGreaterThan(1)
})

test('month stats, including an empty month', () => {
  expect(monthStats([])).toEqual({ avgScore: null, avgSleep: null, workouts: 0, beers: 0 })
  const s = monthStats([
    day('2026-10-01', 8, { sleep: { hours: 8 }, workout: { did: true }, alcohol: { drinks: 2 } }),
    day('2026-10-02', 5, { sleep: { hours: 6 }, alcohol: { drinks: 4 } }),
    day('2026-10-03', 9),
  ])
  expect(s).toEqual({ avgScore: 7.3, avgSleep: 7, workouts: 1, beers: 6 })
})

test('day icons: workout and 3+ drinks', () => {
  expect(dayIcons(day('2026-10-01', 4, { workout: { did: true }, alcohol: { drinks: 4 } }))).toBe('🏋️🍺')
  expect(dayIcons(day('2026-10-01', 7, { alcohol: { drinks: 2 } }))).toBe('')
})

const saved = (d: CalDay): SavedDay => ({ ...d, transcript: [] })
const month: SavedDay[] = [
  ...[9, 8, 10, 8].map((s, i) => saved(day(`2026-10-0${i + 1}`, s, { workout: { did: true }, sleep: { hours: 8 } }))),
  ...[3, 4, 2, 5].map((s, i) => saved(day(`2026-10-1${i + 1}`, s, { alcohol: { drinks: 5 }, sleep: { hours: 5 } }))),
]

test('the month insight waits for 14 debriefs, then names the clearest pattern', () => {
  expect(insightLine(month, 10)).toBeNull()
  expect(insightLine(month, 20)).toBe('Your 8+ days had a workout 100% of the time, vs 0% on rough days.')
})

test('text stays readable: white on strong colors, page ink on faint ones', () => {
  expect(cellStyle('mood', day('2026-10-01', 3)).ink).toBe('#1f1c19')
  expect(cellStyle('mood', day('2026-10-01', 10)).ink).toBe('#ffffff')
  expect(cellStyle('gym', day('2026-10-01', 8, { workout: { did: true } })).ink).toBe('#ffffff')
  expect(cellStyle('drinks', day('2026-10-01', 8, { alcohol: { drinks: 1 } })).ink).toBe('var(--text)')
  expect(cellStyle('gym', day('2026-10-01', 8)).ink).toBe('var(--text)')
})
