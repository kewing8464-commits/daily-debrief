import { pauseUntil, pushSupport, reminderMessage } from '@/lib/reminders'

const base = { name: 'Karson', day: '2026-11-09', started: false, notes: 0 }

test('nightly reminder: personal, short, opens the debrief for that day', () => {
  const m = reminderMessage({ ...base, kind: 'nightly' })
  expect(m.title).toBe('Daily Debrief')
  expect(m.url).toBe('/debrief?date=2026-11-09')
  expect(m.body.length).toBeLessThan(90)
  expect(m.body).not.toMatch(/forgot|missed|!!/i)
})

test('nightly mentions how many vibe checks are waiting, never what they say', () => {
  const m = reminderMessage({ ...base, kind: 'nightly', notes: 3 })
  expect(m.body).toMatch(/3 vibe checks/)
})

test('the nightly wording rotates by day', () => {
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
  const bodies = new Set(days.map((day) => reminderMessage({ ...base, kind: 'nightly', day }).body))
  expect(bodies.size).toBeGreaterThan(1)
})

test('follow-up: lower the bar, or pick up where you left off', () => {
  expect(reminderMessage({ ...base, kind: 'followup' }).body).toBe('Still up? Give me 2 minutes on today.')
  expect(reminderMessage({ ...base, kind: 'followup', started: true }).body).toBe('Pick up where you left off. A couple more answers and it’s locked in.')
})

test('pause options', () => {
  expect(pauseUntil('tonight', '2026-11-09')).toBe('2026-11-09')
  expect(pauseUntil('3days', '2026-11-09')).toBe('2026-11-11')
  expect(pauseUntil('week', '2026-11-30')).toBe('2026-12-06')
})

test('can this device get reminders?', () => {
  const ok = { serviceWorker: true, pushManager: true, notifications: true, standalone: true, iOS: true, permission: 'default' as const }
  expect(pushSupport(ok)).toBe('ready')
  expect(pushSupport({ ...ok, standalone: false })).toBe('needs-install') // iPhone in Safari, not the home screen app
  expect(pushSupport({ ...ok, standalone: false, iOS: false })).toBe('ready') // Android/computer browsers are fine
  expect(pushSupport({ ...ok, permission: 'denied' })).toBe('denied')
  expect(pushSupport({ ...ok, pushManager: false, standalone: false })).toBe('needs-install')
  expect(pushSupport({ ...ok, iOS: false, pushManager: false })).toBe('unsupported')
})
