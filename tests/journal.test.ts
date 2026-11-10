import { emptySummary, type DaySummary } from '@/lib/summary'
import {
  compareDays, dayBriefLine, daySummaryLine, overview, resolveRange, searchEntries, trend, type SavedDay,
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
    expect(resolveRange({ start: '2026-10-20', end: '2026-10-01' }, '2026-10-27')).toMatchObject({ start: '2026-10-01', end: '2026-10-20' })
  })
  test('"everything" (2000 to 2099) means the last 366 days ending today, not the future', () => {
    const r = resolveRange({ start: '2000-01-01', end: '2099-12-31' }, '2026-10-27')
    expect(r).toMatchObject({ start: '2025-10-27', end: '2026-10-27' })
    expect('note' in r && r.note).toBeTruthy()
  })
  test('a future-only range collapses to today', () => {
    expect(resolveRange({ start: '2099-01-01', end: '2099-12-31' }, '2026-10-27')).toMatchObject({ start: '2026-10-27', end: '2026-10-27' })
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

test('a full year of wordy day lines stays under about 20k tokens', () => {
  const wordy = mk('2026-10-23', 7, {
    oneLine: 'A long rambling day summary. '.repeat(70),
    tags: Array.from({ length: 12 }, (_, i) => `tag-number-${i}`),
    sleep: { hours: 7.5 }, workout: { did: true, type: 'lift', minutes: 60 }, alcohol: { drinks: 2 },
  })
  const year = Array.from({ length: 366 }, () => wordy)
  // ~4 characters per token; long ranges use the brief, numbers-only line
  expect(JSON.stringify(year.map(dayBriefLine)).length).toBeLessThan(80_000)
  expect(dayBriefLine(wordy)).not.toHaveProperty('oneLine')
  expect(daySummaryLine(wordy).oneLine.length).toBeLessThanOrEqual(140)
  expect(daySummaryLine(wordy).tags).toHaveLength(5)
})

test('searchEntries finds words in transcripts, ignoring case, newest first, with short snippets', () => {
  const { total, truncated, results: hits } = searchEntries(days, 'JAKE')
  expect(total).toBe(3)
  expect(truncated).toBe(false)
  expect(hits.map((h) => h.date)).toEqual(['2026-10-26', '2026-10-23', '2026-10-18'])
  const hunting = hits.find((h) => h.date === '2026-10-23')!
  expect(hunting.snippets.length).toBeGreaterThan(0)
  expect(hunting.snippets.length).toBeLessThanOrEqual(2)
  for (const s of hunting.snippets) expect(s.length).toBeLessThanOrEqual(160)
  expect(searchEntries(days, 'zebra')).toEqual({ total: 0, truncated: false, results: [] })
})

test('searchEntries counts every match but returns only the newest 30', () => {
  const many = Array.from({ length: 40 }, (_, i) => mk(`2026-09-${String((i % 30) + 1).padStart(2, '0')}`, 5, {}, 'saw Jake'))
    .map((d, i) => ({ ...d, day_date: i < 30 ? d.day_date : `2026-10-${String(i - 29).padStart(2, '0')}` }))
  const r = searchEntries(many, 'jake')
  expect(r.total).toBe(40)
  expect(r.truncated).toBe(true)
  expect(r.results).toHaveLength(30)
  expect(r.results[0].date).toBe('2026-10-10')
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

test('ratings flow into day lines and trends, skipping days without one', () => {
  const rated = [{ ...days[0], productive: 4, focus: 3 }, { ...days[1], productive: null, focus: null }, days[2]]
  expect(daySummaryLine(rated[0])).toMatchObject({ productive: 4, focus: 3 })
  expect(daySummaryLine(rated[2])).toMatchObject({ productive: null, focus: null })
  const t = trend(rated, 'productive')
  expect(t.daysWithValue).toBe(1)
  expect(t.average).toBe(4)
})
