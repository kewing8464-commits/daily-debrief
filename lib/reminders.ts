// What the nightly reminders say, and whether this device can get them.
// Wording rules (decisions log, Voice): friendly, short, no guilt, at most one emoji,
// and never anything private on the lock screen (no drinks, weed, or what the notes say).

export type ReminderItem = { kind: 'nightly' | 'followup'; name: string; day: string; started: boolean; notes: number }

const NIGHTLY = [
  (n: string) => `Vibe check 🌙 How'd today hit, ${n}?`,
  () => 'How did today go? About 5 minutes and you’re done.',
  (n: string) => `Time for your debrief, ${n} 🌙`,
  () => 'Big day or quiet one? Tell me about it.',
]

function dayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function reminderMessage(item: ReminderItem): { title: string; body: string; url: string; tag: string } {
  const first = item.name.trim().split(/\s+/)[0] || 'you'
  let body: string
  if (item.kind === 'followup') {
    body = item.started ? 'Pick up where you left off. A couple more answers and it’s locked in.' : 'Still up? Give me 2 minutes on today.'
  } else if (item.notes > 0) {
    body = `Vibe check 🌙 ${item.notes} vibe ${item.notes === 1 ? 'check' : 'checks'} waiting, so it'll be quick.`
  } else {
    body = NIGHTLY[dayIndex(item.day) % NIGHTLY.length](first)
  }
  return { title: 'Daily Debrief', body, url: `/debrief?date=${item.day}`, tag: `debrief-${item.day}` }
}

export type PauseOption = 'tonight' | '3days' | 'week'

/** Last day (inclusive) reminders stay paused. */
export function pauseUntil(option: PauseOption, today: string): string {
  const add = option === 'tonight' ? 0 : option === '3days' ? 2 : 6
  const [y, m, d] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + add)).toISOString().slice(0, 10)
}

export type PushEnv = {
  serviceWorker: boolean
  pushManager: boolean
  notifications: boolean
  standalone: boolean
  iOS: boolean
  permission: 'default' | 'granted' | 'denied'
}

/** iPhone only allows web-app notifications from the home screen app (iOS 16.4+). */
export function pushSupport(env: PushEnv): 'ready' | 'needs-install' | 'denied' | 'unsupported' {
  if (env.iOS && !env.standalone) return 'needs-install'
  if (!env.serviceWorker || !env.pushManager || !env.notifications) return 'unsupported'
  if (env.permission === 'denied') return 'denied'
  return 'ready'
}
