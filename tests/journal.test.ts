import { emptySummary, type DaySummary } from '@/lib/summary'
import {
  compareDays, daySummaryLine, overview, resolveRange, searchEntries, trend, type SavedDay,
} from '@/lib/connector/journal'

const mk = (day_date: string, score: number, extra: Partial<DaySummary> = {}, said = ''): SavedDay => ({
  day_date,
  score,
  summary: { ...emptySummary(score), oneLine: `day ${day_date}`, ...extra },
  transcript: said ? [{ role: 'assistant', text: 'What did you get up to today?' }, { role: 'user', text: said }] : [],
})

// Ten days, Oct 18 to Oct 27. High days have workouts and good sleep; low days have drinks.
const days: SavedDay[] = [
  mk('2026-10-18', 9, { sleep: { hours: 8 }, workout: { did: true, type: 'lift', minutes: 60 }, tags: ['gym', 'family'], people: [{ name: 'Jake', feeling: 'positive' }], food: [{ item: 'steak' }] }),
  mk('2026-10-19', 8, { sleep: { hours: 7.5 }, workout: { did: true, minutes: 45 }, tags: ['gym'], food: [{ item: 'eggs' }] }),
  mk('2026-10-20', 4, { alcohol: { drinks: 5 }, tags: ['work'], people: [{ name: 'Boss', feeling: 'negative' }] }),
  mk('2026-10-21', 3, { sleep: { hours: 5 }, alcohol: { drinks: 3 }, cannabis: { used: true }, tags: ['work'] }),
  mk('2026-10-22', 6, { tags: ['work'] }),
  mk('2026-10-23', 7, { sleep: { hours: 7 }, tags: ['hunting'] }, 'Went hunting with jake up at the ranch, saw a big bull elk at first light and just sat and watched it for a long time before it walked off into the timber.'),
  mk('2026-10-24', 8, { workout: { did: true, minutes: 30 }, tags: ['gym', 'family'] }),
  mk('2026-10-25', 5, { alcohol: { drinks: 2 }, tags: ['work'] }),
  mk('2026-10-26', 9, { sleep: { hours: 8.5 }, workout: { did: true, minutes: 50 }, tags: ['gym'], people: [{ name: 'Jake', feeling: 'positive' }] }),
  mk('2026-10-27', 2, { alcohol: { drinks: 6 }, cannabis: { used: true }, tags: ['work'] }),
]

describe('resolveRange', () => {
  test('defaults to the last 30 days ending today', () => {
    expect(resolveRange({}, '2026-10-27')).toEqual({ start: '2026-09-28', end: '2026-10-27' })
  })
  test('swaps a reversed range', () => {
    expect(resolveRange({ start: '2026-12-01', end: '2026-11-01' }, '2026-10-27')).toMatchObject({ start: '2026-11-01', end: '2026-12-01' })
  })
  test('clamps to 366 days ending at end, with a note', () => {
    const r = resolveRange({ start: '2020-01-01', end: '2026-10-27' }, '2026-10-27')
    expect(r).toMatchObject({ start: '2025-10-27', end: '2026-10-27' })
    expect('note' in r && r.note).toMatch(/366/)
  })
  test('rejects a malformed date and names the field', () => {
    const r = resolveRange({ start: 'yesterday' }, '2026-10-27')
    expect('error' in r && r.error).toMatch(/start/)
    expect('error' in resolveRange({ end: '2026-02-30' }, '2026-10-27')).toBe(true)
  })
  test('only a start means start through today', () => {
    expect(resolveRange({ start: '2026-10-01' }, '2026-10-27')).toEqual({ start: '2026-10-01', end: '2026-10-27' })
  })
})

const range = { start: '2026-10-18', end: '2026-10-27' }

describe('overview', () => {
  test('counts, averages, best and worst days, streak, tags and people', () => {
    const o = overview(days, range)
    expect(o.debriefs).toBe(10)
    expect(o.averageScore).toBe(6.1)
    expect(o.best.map((d) => d.date)).toEqual(['2026-10-18', '2026-10-26', '2026-10-19'])
    expect(o.worst.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-21', '2026-10-20'])
    expect(o.currentStreak).toBe(10)
    expect(o.topTags[0]).toEqual({ tag: 'work', days: 5 })
    expect(o.people).toContainEqual({ name: 'Jake', positive: 2, negative: 0, neutral: 0 })
  })
  test('an empty journal is a friendly zero, not an error', () => {
    const o = overview([], range)
    expect(o.debriefs).toBe(0)
    expect(o.averageScore).toBeNull()
    expect(o.message).toMatch(/No saved debriefs/)
  })
})

test('daySummaryLine is compact and never carries the transcript', () => {
  const line = daySummaryLine(days[5])
  expect(line).not.toHaveProperty('transcript')
  expect(line).toMatchObject({ date: '2026-10-23', score: 7, sleepHours: 7, drinks: 0, tags: ['hunting'] })
})

test('a full year of day lines stays small', () => {
  const year = Array.from({ length: 366 }, (_, i) => ({ ...days[5], day_date: `d${i}` }))
  expect(JSON.stringify(year.map(daySummaryLine)).length).toBeLessThan(120_000)
})

test('searchEntries finds words in transcripts, ignoring case, with short snippets', () => {
  const hits = searchEntries(days, 'JAKE')
  expect(hits.map((h) => h.date)).toEqual(['2026-10-18', '2026-10-23', '2026-10-26'])
  const hunting = hits.find((h) => h.date === '2026-10-23')!
  expect(hunting.snippets.length).toBeGreaterThan(0)
  expect(hunting.snippets.length).toBeLessThanOrEqual(2)
  for (const s of hunting.snippets) expect(s.length).toBeLessThanOrEqual(160)
  expect(searchEntries(days, 'zebra')).toEqual([])
})

describe('trend', () => {
  test('drinks counts every day (missing means zero)', () => {
    const t = trend(days, 'drinks')
    expect(t.daysWithValue).toBe(10)
    expect(t.max).toBe(6)
  })
  test('sleep_hours skips days without hours', () => {
    const t = trend(days, 'sleep_hours')
    expect(t.daysWithValue).toBe(5)
    expect(t.min).toBe(5)
    expect(t.average).toBe(7.2)
  })
  test('worked_out and cannabis are 0 or 1', () => {
    expect(trend(days, 'worked_out').points.map((p) => p.value)).toEqual([1, 1, 0, 0, 0, 0, 1, 0, 1, 0])
    expect(trend(days, 'cannabis').average).toBe(0.2)
  })
})

test('compareDays contrasts two groups and says it is not cause and effect', () => {
  const c = compareDays(days, { minScore: 8 }, { maxScore: 5 })
  expect(c.groupA.days).toBe(4)
  expect(c.groupB.days).toBe(4)
  expect(c.groupA.workoutRate).toBe(1)
  expect(c.groupB.averageDrinks).toBe(4)
  expect(c.groupA.topPeople[0]).toBe('Jake')
  expect(c.caveat).toBe('These are patterns in your own entries, not proof of cause and effect.')
  expect(c.note).toMatch(/fewer than 5/)
})

test('compareDays filters by tag, workout, drinks, cannabis and weekday', () => {
  expect(compareDays(days, { tag: 'GYM' }, { workedOut: false }).groupA.days).toBe(4)
  expect(compareDays(days, { minDrinks: 3 }, { cannabis: true }).groupA.days).toBe(3)
  // 2026-10-18 is a Sunday
  expect(compareDays(days, { weekday: 0 }, {}).groupA.days).toBe(2)
})
