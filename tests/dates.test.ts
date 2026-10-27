import { debriefDateFor, monthGrid } from '@/lib/dates'

const at = (iso: string) => new Date(iso)

test('before 4am counts as yesterday', () => {
  expect(debriefDateFor(at('2026-10-28T08:30:00Z'), 'America/Denver')).toBe('2026-10-27') // 02:30 MDT
  expect(debriefDateFor(at('2026-10-28T10:00:00Z'), 'America/Denver')).toBe('2026-10-28') // 04:00 MDT
  expect(debriefDateFor(at('2026-10-28T05:59:00Z'), 'America/Denver')).toBe('2026-10-27') // 23:59 MDT
})

test('DST end night', () => {
  expect(debriefDateFor(at('2026-11-01T09:30:00Z'), 'America/Denver')).toBe('2026-10-31') // 02:30 MST
})

test('time zone of the debrief, not the server', () => {
  expect(debriefDateFor(at('2026-10-28T03:00:00Z'), 'America/New_York')).toBe('2026-10-27') // 23:00 EDT
})

test('just after midnight on the 1st of a month goes back a month', () => {
  expect(debriefDateFor(at('2026-11-01T06:30:00Z'), 'America/Denver')).toBe('2026-10-31') // 00:30 MDT
  expect(debriefDateFor(at('2027-01-01T07:30:00Z'), 'America/Denver')).toBe('2026-12-31') // 00:30 MST
})

test('October 2026 starts on Thursday', () => {
  const g = monthGrid(2026, 10)
  expect(g.slice(0, 4)).toEqual([null, null, null, null])
  expect(g[4]).toBe('2026-10-01')
  expect(g.at(-1)).toBe('2026-10-31')
})

test('February 2028 has 29 days', () => {
  expect(monthGrid(2028, 2).filter(Boolean).length).toBe(29)
})

test('shiftMonth steps across year boundaries', async () => {
  const { shiftMonth } = await import('@/lib/dates')
  expect(shiftMonth('2026-10', 1)).toBe('2026-11')
  expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  expect(shiftMonth('2026-01', -1)).toBe('2025-12')
})
