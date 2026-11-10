import type { SavedDay } from '@/lib/connector/journal'
import { candidateFactors, factorDetail, headline, highlights, peopleScores, periodRange, recipe, series } from '@/lib/recipe'
import { emptySummary, type DaySummary } from '@/lib/summary'

const mk = (i: number, score: number, extra: Partial<DaySummary>): SavedDay => ({
  day_date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  score,
  summary: { ...emptySummary(score), ...extra, tags: [...(extra.tags ?? []), 'daily'] },
  transcript: [],
})

// 10 good days (workout, 8h sleep, gym) and 10 rough ones (4 drinks, 5h sleep, work).
// Jake shows up on the 5 best days, written two ways. Weed on only 2 days. 'daily' tag on every day.
const good = [10, 10, 9, 9, 9, 8, 8, 8, 8, 9]
const rough = [3, 4, 2, 3, 4, 3, 2, 4, 3, 4]
const days: SavedDay[] = [
  ...good.map((s, i) => mk(i, s, {
    workout: { did: true }, sleep: { hours: 8 }, tags: ['gym'],
    people: i < 5 ? [{ name: i < 3 ? 'Jake' : 'jake', feeling: 'positive' }] : [],
  })),
  ...rough.map((s, i) => mk(i + 10, s, {
    alcohol: { drinks: 4 }, sleep: { hours: 5 }, tags: ['work'], cannabis: { used: i < 2 },
  })),
]

test('periods: calendar month (clipped to today), rolling 3 months, all time', () => {
  expect(periodRange('month', '2026-11-09')).toEqual({ start: '2026-11-01', end: '2026-11-09', prevStart: '2026-10-01', prevEnd: '2026-10-31', label: 'November 2026' })
  expect(periodRange('month', '2026-11-09', '2026-10')).toMatchObject({ start: '2026-10-01', end: '2026-10-31', prevStart: '2026-09-01', prevEnd: '2026-09-30' })
  expect(periodRange('3m', '2026-11-09')).toMatchObject({ start: '2026-08-11', end: '2026-11-09', prevStart: '2026-05-12', prevEnd: '2026-08-10' })
  expect(periodRange('all', '2026-11-09')).toMatchObject({ start: '2000-01-01', prevStart: '', prevEnd: '' })
})

test('candidate factors merge casing and need 4+ days for people and tags', () => {
  const ids = candidateFactors(days).map((f) => f.id)
  expect(ids).toContain('person:jake')
  expect(ids).toContain('tag:gym')
  expect(ids.filter((id) => id.startsWith('person:'))).toHaveLength(1)
})

test('the recipe ranks the biggest differences, needing 4+ days on each side', () => {
  const r = recipe(days)
  expect(r).toHaveLength(5)
  expect(r[0]).toMatchObject({ id: 'person:jake', label: '👤 Time with Jake', diff: 3.4, withDays: 5, withoutDays: 15 })
  for (const f of r) {
    expect(f.withDays).toBeGreaterThanOrEqual(4)
    expect(f.withoutDays).toBeGreaterThanOrEqual(4)
  }
  expect(r.map((f) => f.id)).not.toContain('weed') // only 2 days
  expect(r.map((f) => f.id)).not.toContain('tag:daily') // every day has it
})

test('too few days to compare gives an empty recipe, not a crash', () => {
  expect(recipe(days.slice(0, 7))).toEqual([])
})

test('a factor in detail: with vs without, what else comes with it, one suggestion', () => {
  const d = factorDetail(days, 'workout')!
  expect(d.withDays).toHaveLength(10)
  expect(d.withoutDays).toHaveLength(10)
  expect(d.withAvg).toBe(8.8)
  expect(d.withoutAvg).toBe(3.2)
  expect(d.alsoTrue).toHaveLength(2)
  expect(d.alsoTrue[0]).toBe('You also slept 7.5h or more on 100% of these days vs 0% of the others.')
  expect(d.worthTrying.length).toBeGreaterThan(10)
  expect(factorDetail(days, 'nope')).toBeNull()
})

test('headline: average, verdict, counts, and change only when there is a previous period', () => {
  expect(headline(days, [])).toEqual({ avg: 6, verdict: 'Up and down', great: 10, rough: 10, count: 20, change: null })
  expect(headline(days, days.slice(10)).change).toBe(2.8)
  expect(headline([], []).avg).toBeNull()
})

test('highlights: best and toughest day, best week, longest streak', () => {
  const h = highlights(days)
  expect(h.best?.day_date).toBe('2026-10-01')
  expect(h.toughest?.day_date).toBe('2026-10-13')
  expect(h.bestWeek).toEqual({ start: '2026-10-01', end: '2026-10-07', avg: 9 })
  expect(h.longestStreak).toBe(20)
})

test('people: average score on the days they come up', () => {
  expect(peopleScores(days)).toEqual([{ name: 'Jake', days: 5, avg: 9.4 }])
})

test('trend series carries a 7-day average', () => {
  const s = series(days, 'score')
  expect(s).toHaveLength(20)
  expect(s[6].avg7).toBe(9)
})

// ---- review fixes ----
const flipped: SavedDay[] = [
  ...[9, 9, 8, 9].map((s, i) => mk(i, s, { sleep: { hours: 5 }, alcohol: { drinks: 0 } })),
  ...[3, 4, 3, 4].map((s, i) => mk(i + 4, s, { sleep: { hours: 8 }, alcohol: { drinks: 4 } })),
]

test('"worth trying" follows the factor\'s own direction, not just its family', () => {
  // Here short sleep lines up with BETTER days, so no "protect your bedtime" advice.
  expect(factorDetail(flipped, 'sleep-6')!.worthTrying).not.toMatch(/protecting your bedtime/)
  expect(factorDetail(flipped, 'sleep-7.5')!.worthTrying).not.toMatch(/more sleep might be worth/)
  expect(factorDetail(flipped, 'drinks-0')!.worthTrying).not.toMatch(/day after a few drinks/)
})

test('"also true" never lists a sibling that is true by definition', () => {
  const lines = factorDetail(days, 'drinks-0')!.alsoTrue
  for (const l of lines) expect(l).not.toMatch(/drinks/)
  expect(factorDetail(days, 'sleep-7.5')!.alsoTrue.join(' ')).not.toMatch(/slept/)
})

test('a name written twice on one day counts once', () => {
  const dup = [mk(0, 10, { people: [{ name: 'Jake', feeling: 'positive' }, { name: 'jake', feeling: 'positive' }] }), mk(1, 2, { people: [{ name: 'Jake', feeling: 'neutral' }] })]
  expect(peopleScores(dup)).toEqual([{ name: 'Jake', days: 2, avg: 6 }])
  const four = [0, 1].flatMap((i) => [mk(i, 8, { people: [{ name: 'Jake', feeling: 'positive' }, { name: 'JAKE', feeling: 'positive' }] })])
  expect(candidateFactors(four).map((f) => f.id)).not.toContain('person:jake')
})

test('best week dates stay inside the days it averages', () => {
  const tail = [27, 28, 29, 30].map((d, i) => ({ ...mk(i, 9, {}), day_date: `2026-10-${d}` }))
  expect(highlights(tail).bestWeek).toEqual({ start: '2026-10-27', end: '2026-10-30', avg: 9 })
})

test('the trend line averages the last 7 calendar days, not the last 7 entries', () => {
  // A gap: Oct 1 (score 2), then Oct 20 to 22 (score 10). The Oct 20 average must not include Oct 1.
  const gap = [{ ...mk(0, 2, {}) }, ...[19, 20, 21].map((i) => mk(i, 10, {}))]
  const s = series(gap, 'score')
  expect(s.find((p) => p.date === '2026-10-20')!.avg7).toBe(10)
})

test('the shown numbers subtract cleanly: diff = shown with-average minus shown overall average', () => {
  for (const r of recipe(days)) {
    const overall = Math.round((days.reduce((a, d) => a + d.score, 0) / days.length) * 10) / 10
    expect(r.diff).toBeCloseTo(r.withAvg - overall, 5)
  }
})

test('rounding: with 7.25 and overall 6.04 shows 7.3, 6.0 and +1.3', () => {
  const r25 = [
    ...[7, 7, 7, 8].map((s, i) => mk(i, s, { workout: { did: true } })),
    ...[5, 5, 5, 5, ...Array(17).fill(6)].map((s, i) => mk(i + 4, s, {})),
  ]
  const w = recipe(r25).find((r) => r.id === 'workout')!
  expect(w.withAvg).toBe(7.3)
  expect(w.diff).toBe(1.3)
})
