import { METRICS, trend, type Metric, type SavedDay } from '@/lib/connector/journal'

// "Your recipe for a good day": which things in your own entries line up with better or
// worse days. All pure math over saved days, so every number on the Insights tab is tested.

export type Period = 'month' | '3m' | 'year' | 'all'
export const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: '3m', label: '3 months' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All' },
]
export const MIN_SIDE = 4

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
const lastOfMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
const prevMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7)
}
const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function periodRange(period: Period, today: string, month?: string) {
  if (period === 'month') {
    const ym = month && /^\d{4}-\d{2}$/.test(month) && month <= today.slice(0, 7) ? month : today.slice(0, 7)
    const end = lastOfMonth(ym) < today ? lastOfMonth(ym) : today
    const pm = prevMonth(ym)
    return { start: `${ym}-01`, end, prevStart: `${pm}-01`, prevEnd: lastOfMonth(pm), label: monthLabel(ym) }
  }
  if (period === 'all') return { start: '2000-01-01', end: today, prevStart: '', prevEnd: '', label: 'All time' }
  const span = period === '3m' ? 91 : 365
  const start = shift(today, -(span - 1))
  const prevEnd = shift(start, -1)
  return { start, end: today, prevStart: shift(prevEnd, -(span - 1)), prevEnd, label: period === '3m' ? 'Last 3 months' : 'Last 12 months' }
}

export type Family = 'workout' | 'sleep' | 'drinks' | 'weed' | 'meetings' | 'person' | 'tag'
export type Factor = { id: string; label: string; family: Family; has: (d: SavedDay) => boolean }

const hours = (d: SavedDay) => d.summary.sleep?.hours
const drinks = (d: SavedDay) => d.summary.alcohol?.drinks ?? 0

// The fixed factors, with how to say "you also ..." about each.
const FIXED: (Factor & { also: string })[] = [
  { id: 'workout', label: '🏋️ Worked out', family: 'workout', also: 'worked out', has: (d) => !!d.summary.workout?.did },
  { id: 'sleep-7.5', label: '💤 Slept 7.5h or more', family: 'sleep', also: 'slept 7.5h or more', has: (d) => (hours(d) ?? 0) >= 7.5 },
  { id: 'sleep-6', label: '💤 Slept under 6h', family: 'sleep', also: 'slept under 6h', has: (d) => typeof hours(d) === 'number' && hours(d)! < 6 },
  { id: 'drinks-3', label: '🍺 3+ drinks', family: 'drinks', also: 'had 3+ drinks', has: (d) => drinks(d) >= 3 },
  { id: 'drinks-0', label: '🍺 No drinks', family: 'drinks', also: 'had no drinks', has: (d) => drinks(d) === 0 },
  { id: 'weed', label: '🌿 Weed', family: 'weed', also: 'had weed', has: (d) => !!d.summary.cannabis?.used },
  { id: 'meetings-4', label: '💼 4+ meetings', family: 'meetings', also: 'had 4+ meetings', has: (d) => (d.summary.work?.meetings ?? 0) >= 4 },
]

/** Names on one day, deduped ignoring case ("Jake" and "jake" are one), keeping the first spelling. */
function uniqueByLower(names: string[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const raw of names) {
    const name = raw.trim()
    if (name && !out.has(name.toLowerCase())) out.set(name.toLowerCase(), name)
  }
  return out
}

/** Every factor worth testing: the fixed ones, plus people and tags that show up on 4+ days. */
export function candidateFactors(days: SavedDay[]): Factor[] {
  const people = new Map<string, { name: string; count: number }>()
  const tags = new Map<string, { name: string; count: number }>()
  for (const d of days) {
    for (const [k, name] of uniqueByLower((d.summary.people ?? []).map((p) => p.name))) {
      const e = people.get(k) ?? { name, count: 0 }
      e.count++
      people.set(k, e)
    }
    for (const [k, name] of uniqueByLower(d.summary.tags ?? [])) {
      const e = tags.get(k) ?? { name, count: 0 }
      e.count++
      tags.set(k, e)
    }
  }
  const hasPerson = (k: string) => (d: SavedDay) => (d.summary.people ?? []).some((p) => p.name.trim().toLowerCase() === k)
  const hasTag = (k: string) => (d: SavedDay) => (d.summary.tags ?? []).some((t) => t.trim().toLowerCase() === k)
  return [
    ...FIXED,
    ...[...people].filter(([, v]) => v.count >= MIN_SIDE).map(([k, v]) => ({ id: `person:${k}`, label: `👤 Time with ${v.name}`, family: 'person' as const, has: hasPerson(k) })),
    ...[...tags].filter(([, v]) => v.count >= MIN_SIDE).map(([k, v]) => ({ id: `tag:${k}`, label: `🏷 ${v.name}`, family: 'tag' as const, has: hasTag(k) })),
  ]
}

const round1 = (n: number) => Math.round(n * 10) / 10
const mean = (days: SavedDay[]) => (days.length ? days.reduce((a, d) => a + d.score, 0) / days.length : null)

function split(days: SavedDay[], f: Factor) {
  const withDays = days.filter(f.has)
  const withoutDays = days.filter((d) => !f.has(d))
  return { withDays, withoutDays }
}

export type RecipeRow = { id: string; label: string; diff: number; withAvg: number; withoutAvg: number; withDays: number; withoutDays: number }

/** The 5 factors that move the score most, vs the average of all days in the period. */
export function recipe(days: SavedDay[]): RecipeRow[] {
  const avg = mean(days)
  if (avg === null) return []
  const all = round1(avg)
  return candidateFactors(days)
    .map((f) => ({ f, ...split(days, f) }))
    .filter(({ withDays, withoutDays }) => withDays.length >= MIN_SIDE && withoutDays.length >= MIN_SIDE)
    .map(({ f, withDays, withoutDays }) => ({
      id: f.id,
      label: f.label,
      // From the rounded averages, so the numbers on screen subtract cleanly.
      diff: round1(round1(mean(withDays)!) - all),
      withAvg: round1(mean(withDays)!),
      withoutAvg: round1(mean(withoutDays)!),
      withDays: withDays.length,
      withoutDays: withoutDays.length,
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.withDays - a.withDays || a.id.localeCompare(b.id))
    .slice(0, 5)
}

const TRY: Record<Family, [string, string]> = {
  workout: ['Try fitting in even a short workout on a day that looks quiet, and see if the score follows.', 'Notice how your workout days actually feel; the pattern says they run a little rougher.'],
  sleep: ['Try protecting your bedtime on a couple of nights and see what the next days score.', 'Watch the nights before these days; a little more sleep might be worth testing.'],
  drinks: ['Notice how the day goes when you skip the drinks, and compare.', 'Next time, pay attention to how the day after a few drinks goes.'],
  weed: ['Keep an eye on how these days go compared to the rest.', 'Next time, notice how the day goes when you skip it.'],
  meetings: ['Notice what makes the meeting-heavy days work, and see if it repeats.', 'On meeting-heavy days, try blocking a little time for something that usually lifts you.'],
  person: ['Try making time for them on a day that would otherwise be quiet.', 'Notice how you feel after time with them, and what might change that.'],
  tag: ['Try adding more of this when you can, and see if the score follows.', 'Next time this comes up, notice how the rest of the day goes.'],
}

// Short sleep and no drinks point the opposite way from their family's "good" direction.
const INVERSE = new Set(['sleep-6', 'drinks-0'])

function worthTrying(factor: Factor, better: boolean): string {
  if (factor.id === 'drinks-0') {
    return better ? 'Try a few more drink-free days and see if the scores hold.' : 'Interesting: your drink-free days scored a bit lower. Notice what else is going on those days.'
  }
  if (factor.id === 'sleep-6') {
    return better ? 'Interesting: your short-sleep days scored higher. Notice what else is going on those days.' : TRY.sleep[0]
  }
  if (factor.id === 'sleep-7.5' && !better) return 'Interesting: your longer-sleep days scored a bit lower. Notice what else is going on those days.'
  const positive = INVERSE.has(factor.id) ? !better : better
  return TRY[factor.family][positive ? 0 : 1]
}

export function factorDetail(days: SavedDay[], id: string) {
  const factor = candidateFactors(days).find((f) => f.id === id)
  if (!factor) return null
  const { withDays, withoutDays } = split(days, factor)
  if (!withDays.length || !withoutDays.length) return null
  const rate = (group: SavedDay[], f: Factor) => group.filter(f.has).length / group.length
  // Siblings in the same family are true by definition (no drinks vs 3+ drinks), so skip them.
  const alsoTrue = FIXED.filter((f) => f.family !== factor.family)
    .map((f) => ({ f, a: rate(withDays, f), b: rate(withoutDays, f) }))
    .filter(({ a, b }) => Math.abs(a - b) >= 0.3)
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))
    .slice(0, 2)
    .map(({ f, a, b }) => `You also ${f.also} on ${Math.round(a * 100)}% of these days vs ${Math.round(b * 100)}% of the others.`)
  const withAvg = round1(mean(withDays)!)
  const withoutAvg = round1(mean(withoutDays)!)
  return { factor, withDays, withoutDays, withAvg, withoutAvg, alsoTrue, worthTrying: worthTrying(factor, withAvg >= withoutAvg) }
}

export function headline(days: SavedDay[], prevDays: SavedDay[], isMonth = true) {
  const avg = mean(days)
  const prev = mean(prevDays)
  const word = isMonth ? 'month' : 'stretch'
  const verdict = avg === null ? 'Nothing here yet'
    : avg >= 8 ? `A great ${word}`
    : avg >= 6.5 ? `A good ${word} with some rough patches`
    : avg >= 5 ? 'Up and down'
    : `A tough ${word}`
  return {
    avg: avg === null ? null : round1(avg),
    verdict,
    great: days.filter((d) => d.score >= 8).length,
    rough: days.filter((d) => d.score <= 4).length,
    count: days.length,
    change: avg !== null && prev !== null ? round1(avg - prev) : null,
  }
}

export function highlights(days: SavedDay[]) {
  const sorted = [...days].sort((a, b) => a.day_date.localeCompare(b.day_date))
  const best = [...sorted].sort((a, b) => b.score - a.score)[0]
  const toughest = [...sorted].sort((a, b) => a.score - b.score)[0]
  const byDate = new Map(sorted.map((d) => [d.day_date, d]))
  let bestWeek: { start: string; end: string; avg: number } | undefined
  for (const d of sorted) {
    const week = Array.from({ length: 7 }, (_, i) => byDate.get(shift(d.day_date, i))).filter((x): x is SavedDay => !!x)
    if (week.length < 4) continue
    const avg = round1(mean(week)!)
    if (!bestWeek || avg > bestWeek.avg) bestWeek = { start: d.day_date, end: week[week.length - 1].day_date, avg }
  }
  let longestStreak = 0
  let run = 0
  sorted.forEach((d, i) => {
    run = i > 0 && shift(sorted[i - 1].day_date, 1) === d.day_date ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
  })
  return { best, toughest, bestWeek, longestStreak }
}

export function peopleScores(days: SavedDay[]): { name: string; days: number; avg: number }[] {
  const people = new Map<string, { name: string; scores: number[] }>()
  for (const d of days) {
    for (const [k, name] of uniqueByLower((d.summary.people ?? []).map((p) => p.name))) {
      const e = people.get(k) ?? { name, scores: [] }
      e.scores.push(d.score)
      people.set(k, e)
    }
  }
  return [...people.values()]
    .filter((p) => p.scores.length >= 2)
    .map((p) => ({ name: p.name, days: p.scores.length, avg: round1(p.scores.reduce((a, b) => a + b, 0) / p.scores.length) }))
    .sort((a, b) => b.avg - a.avg || b.days - a.days)
}

export const TREND_METRICS: { id: Metric; label: string }[] = [
  { id: 'score', label: '😊 Score' },
  { id: 'sleep_hours', label: '💤 Sleep' },
  { id: 'drinks', label: '🍺 Drinks' },
  { id: 'worked_out', label: '🏋️ Workouts' },
  { id: 'productive', label: '⚡ Productive' },
  { id: 'focus', label: '🎯 Focus' },
]
export const isMetric = (v: string): v is Metric => (METRICS as readonly string[]).includes(v)

/** Day-by-day values of one measure, with the average of the last 7 calendar days for the trend line. */
export function series(days: SavedDay[], metric: Metric): { date: string; value: number; avg7: number }[] {
  const sorted = [...days].sort((a, b) => a.day_date.localeCompare(b.day_date))
  const points = trend(sorted, metric).points
  return points.map((p) => {
    const from = shift(p.date, -6)
    const win = points.filter((q) => q.date >= from && q.date <= p.date)
    return { date: p.date, value: p.value, avg7: round1(win.reduce((a, b) => a + b.value, 0) / win.length) }
  })
}
