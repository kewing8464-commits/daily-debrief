import type { Turn } from '@/lib/conversation'
import type { DaySummary } from '@/lib/summary'

// Everything the AI connector can tell an AI about a person's journal.
// Pure functions over saved days, so every answer is testable.

export type SavedDay = { day_date: string; score: number; summary: DaySummary; transcript: Turn[] }
export type Range = { start: string; end: string; note?: string }

export const MAX_RANGE_DAYS = 366
export const CAVEAT = 'These are patterns in your own entries, not proof of cause and effect.'
export const EMPTY_MESSAGE = 'No saved debriefs in this range yet.'

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return shift(s, 0) === s
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
const round1 = (n: number) => Math.round(n * 10) / 10
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

/** Turn the AI's optional start/end into a safe range. Defaults to the last 30 days ending today. */
export function resolveRange(input: { start?: string; end?: string }, today: string): Range | { error: string } {
  for (const field of ['start', 'end'] as const) {
    const v = input[field]
    if (v !== undefined && !isDate(v)) return { error: `"${field}" must be a real date like 2026-10-27, got "${v}".` }
  }
  let end = input.end ?? today
  let start = input.start ?? (input.end ? shift(end, -29) : shift(today, -29))
  if (start > end) [start, end] = [end, start]
  if (daysBetween(start, end) + 1 > MAX_RANGE_DAYS) {
    start = shift(end, -(MAX_RANGE_DAYS - 1))
    return { start, end, note: `Ranges are limited to ${MAX_RANGE_DAYS} days, so this starts at ${start}.` }
  }
  return { start, end }
}

const drinks = (d: SavedDay) => d.summary.alcohol?.drinks ?? 0
const workedOut = (d: SavedDay) => !!d.summary.workout?.did
const usedCannabis = (d: SavedDay) => !!d.summary.cannabis?.used

function countTop(values: string[], limit: number): { value: string; count: number }[] {
  const counts = new Map<string, { value: string; count: number }>()
  for (const v of values) {
    const key = v.trim().toLowerCase()
    if (!key) continue
    const hit = counts.get(key)
    if (hit) hit.count++
    else counts.set(key, { value: v.trim(), count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)).slice(0, limit)
}

const dayTags = (d: SavedDay) => [...new Set((d.summary.tags ?? []).map((t) => t.toLowerCase()))]

export function overview(days: SavedDay[], range: Range) {
  const brief = (d: SavedDay) => ({ date: d.day_date, score: d.score, oneLine: d.summary.oneLine })
  const byScore = [...days].sort((a, b) => b.score - a.score || a.day_date.localeCompare(b.day_date))
  const worstFirst = [...days].sort((a, b) => a.score - b.score || a.day_date.localeCompare(b.day_date))

  const dates = new Set(days.map((d) => d.day_date))
  let cursor = dates.has(range.end) ? range.end : shift(range.end, -1)
  let currentStreak = 0
  while (dates.has(cursor)) {
    currentStreak++
    cursor = shift(cursor, -1)
  }

  const people = new Map<string, { name: string; positive: number; negative: number; neutral: number }>()
  for (const d of days) {
    for (const p of d.summary.people ?? []) {
      const key = p.name.trim().toLowerCase()
      const row = people.get(key) ?? { name: p.name.trim(), positive: 0, negative: 0, neutral: 0 }
      row[p.feeling]++
      people.set(key, row)
    }
  }

  return {
    range,
    debriefs: days.length,
    ...(days.length ? {} : { message: EMPTY_MESSAGE }),
    averageScore: avg(days.map((d) => d.score)),
    best: byScore.slice(0, 3).map(brief),
    worst: worstFirst.slice(0, 3).map(brief),
    currentStreak,
    topTags: countTop(days.flatMap(dayTags), 10).map((t) => ({ tag: t.value, days: t.count })),
    people: [...people.values()].sort((a, b) => b.positive + b.negative + b.neutral - (a.positive + a.negative + a.neutral)),
  }
}

/** One compact line per day for lists. No transcript, so a year of days fits in an AI's context. */
export function daySummaryLine(d: SavedDay) {
  return {
    date: d.day_date,
    score: d.score,
    oneLine: d.summary.oneLine,
    sleepHours: d.summary.sleep?.hours ?? null,
    workout: workedOut(d) ? { type: d.summary.workout.type ?? null, minutes: d.summary.workout.minutes ?? null } : null,
    drinks: drinks(d),
    cannabis: usedCannabis(d),
    tags: d.summary.tags ?? [],
  }
}

function summaryText(s: DaySummary): string[] {
  return [
    s.oneLine, s.morning, s.did, s.fun, s.happy, s.annoyed, s.standout, s.work?.good, s.work?.bad,
    ...(s.work?.enjoyed ?? []), ...(s.work?.disliked ?? []),
    ...(s.food ?? []).map((f) => (f.amount ? `${f.amount} ${f.item}` : f.item)),
    ...(s.people ?? []).map((p) => `${p.name} (${p.feeling})`),
    ...(s.tags ?? []), s.workout?.type, s.alcohol?.kind,
  ].filter((x): x is string => !!x)
}

// Up to 160 characters around the match, with an ellipsis where text was cut.
function snippet(text: string, at: number): string {
  if (text.length <= 160) return text
  const start = Math.max(0, Math.min(at - 60, text.length - 158))
  return `${start > 0 ? '…' : ''}${text.slice(start, start + 158)}${start + 158 < text.length ? '…' : ''}`
}

/** Days whose words mention `text`, newest last, with up to two short snippets each. Max 30 days. */
export function searchEntries(days: SavedDay[], text: string) {
  const needle = text.trim().toLowerCase()
  if (!needle) return []
  const hits: { date: string; score: number; snippets: string[] }[] = []
  for (const d of days) {
    const sources = [...d.transcript.filter((t) => t.role === 'user').map((t) => t.text), ...summaryText(d.summary)]
    const snippets: string[] = []
    for (const s of sources) {
      const at = s.toLowerCase().indexOf(needle)
      if (at >= 0 && snippets.length < 2) snippets.push(snippet(s, at))
    }
    if (snippets.length) hits.push({ date: d.day_date, score: d.score, snippets })
    if (hits.length >= 30) break
  }
  return hits
}

export const METRICS = ['score', 'sleep_hours', 'drinks', 'workout_minutes', 'worked_out', 'cannabis'] as const
export type Metric = (typeof METRICS)[number]

function metricValue(d: SavedDay, metric: Metric): number | null {
  switch (metric) {
    case 'score': return d.score
    case 'sleep_hours': return d.summary.sleep?.hours ?? null
    case 'drinks': return drinks(d)
    case 'workout_minutes': return workedOut(d) ? d.summary.workout.minutes ?? null : 0
    case 'worked_out': return workedOut(d) ? 1 : 0
    case 'cannabis': return usedCannabis(d) ? 1 : 0
  }
}

export function trend(days: SavedDay[], metric: Metric) {
  const points = days
    .map((d) => ({ date: d.day_date, value: metricValue(d, metric) }))
    .filter((p): p is { date: string; value: number } => p.value !== null)
  const values = points.map((p) => p.value)
  return {
    metric,
    points,
    average: avg(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    daysWithValue: points.length,
  }
}

export type DayFilter = {
  minScore?: number
  maxScore?: number
  tag?: string
  workedOut?: boolean
  minDrinks?: number
  cannabis?: boolean
  /** 0 Sunday through 6 Saturday */
  weekday?: number
}

function matches(d: SavedDay, f: DayFilter): boolean {
  if (f.minScore !== undefined && d.score < f.minScore) return false
  if (f.maxScore !== undefined && d.score > f.maxScore) return false
  if (f.tag !== undefined && !dayTags(d).includes(f.tag.trim().toLowerCase())) return false
  if (f.workedOut !== undefined && workedOut(d) !== f.workedOut) return false
  if (f.minDrinks !== undefined && drinks(d) < f.minDrinks) return false
  if (f.cannabis !== undefined && usedCannabis(d) !== f.cannabis) return false
  if (f.weekday !== undefined && new Date(`${d.day_date}T12:00:00Z`).getUTCDay() !== f.weekday) return false
  return true
}

function describeGroup(group: SavedDay[]) {
  const rate = (pred: (d: SavedDay) => boolean) => (group.length ? round1(group.filter(pred).length / group.length) : null)
  return {
    days: group.length,
    averageScore: avg(group.map((d) => d.score)),
    averageSleep: avg(group.map((d) => d.summary.sleep?.hours).filter((h): h is number => typeof h === 'number')),
    averageDrinks: avg(group.map(drinks)),
    workoutRate: rate(workedOut),
    cannabisRate: rate(usedCannabis),
    topTags: countTop(group.flatMap(dayTags), 5).map((t) => t.value),
    topFoods: countTop(group.flatMap((d) => (d.summary.food ?? []).map((f) => f.item)), 5).map((t) => t.value),
    topPeople: countTop(group.flatMap((d) => (d.summary.people ?? []).map((p) => p.name)), 5).map((t) => t.value),
  }
}

/** Contrast two kinds of days, for example 8+ days against 5-or-lower days. */
export function compareDays(days: SavedDay[], a: DayFilter, b: DayFilter) {
  const groupA = describeGroup(days.filter((d) => matches(d, a)))
  const groupB = describeGroup(days.filter((d) => matches(d, b)))
  const small = groupA.days < 5 || groupB.days < 5
  return {
    groupA,
    groupB,
    caveat: CAVEAT,
    ...(small ? { note: 'One of these groups has fewer than 5 days, so treat any difference as a hint, not a pattern.' } : {}),
  }
}
