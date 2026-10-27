import { SetupInputSchema } from '@/lib/validation'

const ok = { name: 'Karson', debriefTime: '21:30', timezone: 'America/Denver' }

function errorFields(input: unknown) {
  const r = SetupInputSchema.safeParse(input)
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0]))
}

test('valid setup passes and trims the name', () => {
  const r = SetupInputSchema.parse({ ...ok, name: '  Karson ' })
  expect(r.name).toBe('Karson')
})

test('12-hour or out-of-range times fail on debriefTime', () => {
  expect(errorFields({ ...ok, debriefTime: '9:30pm' })).toEqual(['debriefTime'])
  expect(errorFields({ ...ok, debriefTime: '25:00' })).toEqual(['debriefTime'])
})

test('empty name fails on name', () => {
  expect(errorFields({ ...ok, name: '   ' })).toEqual(['name'])
})

test('unknown time zone fails on timezone', () => {
  expect(errorFields({ ...ok, timezone: 'Mars/Olympus' })).toEqual(['timezone'])
})
