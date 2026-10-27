import type { DaySummary } from '@/lib/summary'

export type DayRow = { day_date: string; score: number | null; status: 'draft' | 'saved'; summary: DaySummary | null }

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

/** This week at a glance: 7 bars ending today, the current streak, and average sleep. Only saved days count. */
export function weekStats(days: DayRow[], today: string) {
  const saved = new Map(days.filter((d) => d.status === 'saved').map((d) => [d.day_date, d]))
  const dates = Array.from({ length: 7 }, (_, i) => shift(today, i - 6))
  const bars = dates.map((date) => ({ date, score: saved.get(date)?.score ?? null }))

  let cursor = saved.has(today) ? today : shift(today, -1)
  let streak = 0
  while (saved.has(cursor)) {
    streak++
    cursor = shift(cursor, -1)
  }

  const hours = dates.map((d) => saved.get(d)?.summary?.sleep?.hours).filter((h): h is number => typeof h === 'number')
  const sleepAvg = hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null

  return { bars, streak, sleepAvg }
}
