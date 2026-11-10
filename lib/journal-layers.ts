import { compareDays, type SavedDay } from '@/lib/connector/journal'
import { scoreColor, scoreInk } from '@/lib/design'
import { PATTERN_THRESHOLD } from '@/lib/insights'
import type { DaySummary } from '@/lib/summary'

// The Journal calendar can be colored by one thing at a time.

export type Layer = 'mood' | 'productive' | 'focus' | 'sleep' | 'drinks' | 'gym'
export const LAYERS: { id: Layer; label: string }[] = [
  { id: 'mood', label: '😊 Mood' },
  { id: 'productive', label: '⚡ Productive' },
  { id: 'focus', label: '🎯 Focus' },
  { id: 'sleep', label: '💤 Sleep' },
  { id: 'drinks', label: '🍺 Drinks' },
  { id: 'gym', label: '🏋️ Gym' },
]

export type CalDay = { day_date: string; score: number; summary: DaySummary; productive: number | null; focus: number | null }

const SAGE = '0, 128, 158' // teal (good / more)
const TERRA = '196, 86, 42' // burnt orange (drinks)
const rgba = (rgb: string, a: number) => `rgba(${rgb}, ${Math.round(a * 100) / 100})`
const SURFACE = 'var(--surface)'
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const RATING_ALPHA = [0.25, 0.5, 0.75, 1]

const drinksOf = (d: CalDay) => d.summary.alcohol?.drinks ?? 0
const workedOut = (d: CalDay) => !!d.summary.workout?.did

type Cell = { background: string; empty: boolean; ink: string }
const STRONG_INK = '#ffffff'
const LIGHT_INK = 'var(--text)'

/** Background (and readable text color) for one day under a layer. `empty` means "nothing recorded". */
export function cellStyle(layer: Layer, d: CalDay): Cell {
  const { background, empty, alpha } = paint(layer, d)
  return { background, empty, ink: layer === 'mood' ? scoreInk(d.score) : alpha >= 0.55 ? STRONG_INK : LIGHT_INK }
}

function paint(layer: Layer, d: CalDay): { background: string; empty: boolean; alpha: number } {
  switch (layer) {
    case 'mood':
      return { background: scoreColor(d.score), empty: false, alpha: 1 }
    case 'productive':
    case 'focus': {
      const n = d[layer]
      return n ? { background: rgba(SAGE, RATING_ALPHA[n - 1]), empty: false, alpha: RATING_ALPHA[n - 1] } : { background: 'transparent', empty: true, alpha: 0 }
    }
    case 'sleep': {
      const h = d.summary.sleep?.hours
      if (typeof h !== 'number') return { background: 'transparent', empty: true, alpha: 0 }
      const a = clamp((h - 4) / 5, 0.15, 1)
      return { background: rgba(SAGE, a), empty: false, alpha: a }
    }
    case 'drinks': {
      const n = drinksOf(d)
      const a = Math.min(n, 6) / 6
      return { background: n ? rgba(TERRA, a) : SURFACE, empty: false, alpha: a }
    }
    case 'gym':
      return workedOut(d) ? { background: rgba(SAGE, 1), empty: false, alpha: 1 } : { background: SURFACE, empty: false, alpha: 0 }
  }
}

export function legendFor(layer: Layer): { low: string; high: string; swatches: string[] } {
  switch (layer) {
    case 'mood': return { low: 'rough', high: 'great', swatches: [2, 4, 6, 8, 10].map(scoreColor) }
    case 'productive': return { low: 'not', high: 'very', swatches: RATING_ALPHA.map((a) => rgba(SAGE, a)) }
    case 'focus': return { low: 'scattered', high: 'locked in', swatches: RATING_ALPHA.map((a) => rgba(SAGE, a)) }
    case 'sleep': return { low: '4h', high: '9h+', swatches: [0.15, 0.4, 0.7, 1].map((a) => rgba(SAGE, a)) }
    case 'drinks': return { low: 'none', high: '6+', swatches: [SURFACE, ...[2, 4, 6].map((n) => rgba(TERRA, n / 6))] }
    case 'gym': return { low: 'rest', high: 'worked out', swatches: [SURFACE, rgba(SAGE, 1)] }
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

export function monthStats(days: CalDay[]) {
  return {
    avgScore: avg(days.map((d) => d.score)),
    avgSleep: avg(days.map((d) => d.summary.sleep?.hours).filter((h): h is number => typeof h === 'number')),
    workouts: days.filter(workedOut).length,
    beers: days.reduce((sum, d) => sum + drinksOf(d), 0),
  }
}

/** Tapping a month stat switches the calendar to the matching layer. */
export const statLayer = { avgScore: 'mood', avgSleep: 'sleep', workouts: 'gym', beers: 'drinks' } as const satisfies Record<string, Layer>

export function dayIcons(d: CalDay): string {
  return (workedOut(d) ? '🏋️' : '') + (drinksOf(d) >= 3 ? '🍺' : '')
}

/** One plain sentence about this month's clearest difference between 8+ days and rough days. */
export function insightLine(days: SavedDay[], totalSaved: number): string | null {
  if (totalSaved < PATTERN_THRESHOLD) return null
  const { groupA: good, groupB: rough } = compareDays(days, { minScore: 8 }, { maxScore: 5 })
  if (!good.days || !rough.days) return null
  const pct = (x: number | null) => Math.round((x ?? 0) * 100)
  if (good.workoutRate !== null && rough.workoutRate !== null && good.workoutRate - rough.workoutRate >= 0.3) {
    return `Your 8+ days had a workout ${pct(good.workoutRate)}% of the time, vs ${pct(rough.workoutRate)}% on rough days.`
  }
  if (good.averageSleep !== null && rough.averageSleep !== null && good.averageSleep - rough.averageSleep >= 1) {
    return `You slept about ${round1(good.averageSleep - rough.averageSleep)}h more on your 8+ days.`
  }
  if (good.averageDrinks !== null && rough.averageDrinks !== null && rough.averageDrinks - good.averageDrinks >= 1.5) {
    return `Your rough days averaged ${round1(rough.averageDrinks - good.averageDrinks)} more drinks.`
  }
  return null
}
