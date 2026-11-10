import type { DaySummary } from '@/lib/summary'

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** The day before and after, for the ‹ › arrows. There is no "next" past today. */
export function dayNeighbors(date: string, today: string): { prev: string; next: string | null } {
  const next = shift(date, 1)
  return { prev: shift(date, -1), next: next > today ? null : next }
}

export type Section = { key: string; icon: string; title: string; body: string }

/** The parts of a saved day worth showing, in reading order. Empty parts are left out. */
export function filledSections(s: DaySummary): Section[] {
  const sleep = [s.sleep?.bedtime && `asleep ${s.sleep.bedtime}`, s.sleep?.wake && `up ${s.sleep.wake}`, s.sleep?.hours && `${s.sleep.hours}h`].filter(Boolean).join(' · ')
  const workout = s.workout?.did ? [s.workout.type || 'Worked out', s.workout.minutes && `${s.workout.minutes} min`].filter(Boolean).join(' · ') : ''
  const drinks = s.alcohol?.drinks ?? 0
  const work = [s.work?.meetings !== undefined && `${s.work.meetings} ${s.work.meetings === 1 ? 'meeting' : 'meetings'}`, s.work?.good, s.work?.bad].filter(Boolean).join(' · ')
  const face = (f: string) => (f === 'positive' ? ' 🙂' : f === 'negative' ? ' 😕' : '')
  const all: Section[] = [
    { key: 'sleep', icon: '💤', title: 'Sleep', body: sleep },
    { key: 'morning', icon: '🌅', title: 'Morning', body: s.morning ?? '' },
    { key: 'did', icon: '📍', title: 'What you did', body: s.did ?? '' },
    { key: 'food', icon: '🍽', title: 'Food', body: (s.food ?? []).map((f) => (f.amount ? `${f.amount} ${f.item}` : f.item)).join(', ') },
    { key: 'workout', icon: '🏋️', title: 'Workout', body: workout },
    { key: 'drinks', icon: '🍺', title: 'Drinks', body: drinks ? `${drinks} ${drinks === 1 ? 'beer' : 'beers'}${s.alcohol?.kind && !/^beers?$/i.test(s.alcohol.kind.trim()) ? ` (${s.alcohol.kind})` : ''}` : 'No drinks' },
    { key: 'weed', icon: '🌿', title: 'Weed', body: s.cannabis?.used ? s.cannabis.amount || 'Yes' : '' },
    { key: 'work', icon: '💼', title: 'Work', body: work },
    { key: 'people', icon: '👥', title: 'People', body: (s.people ?? []).map((p) => `${p.name}${face(p.feeling)}`).join(', ') },
    { key: 'fun', icon: '🎉', title: 'Fun', body: s.fun ?? '' },
    { key: 'happy', icon: '😊', title: 'Happy', body: s.happy ?? '' },
    { key: 'annoyed', icon: '😤', title: 'Annoyed', body: s.annoyed ?? '' },
    { key: 'standout', icon: '⭐', title: 'Standout', body: s.standout ?? '' },
  ]
  return all.filter((x) => x.body)
}

export const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

/** A question to paste into Claude or ChatGPT about this day. */
export function aiQuestion(date: string, score: number): string {
  return `Tell me about my day on ${shortDate(date)} and what made it a ${score}.`
}
