import { greetingFor } from '@/lib/greeting'

test('greeting follows the time of day', () => {
  expect(greetingFor(4, false)).toBe('Morning')
  expect(greetingFor(11, false)).toBe('Morning')
  expect(greetingFor(12, false)).toBe('Good afternoon')
  expect(greetingFor(16, false)).toBe('Good afternoon')
  expect(greetingFor(17, false)).toBe('Evening')
  expect(greetingFor(1, false)).toBe('Evening')
})

test('after the debrief is saved, it is a wrap', () => {
  expect(greetingFor(22, true)).toBe("That's a wrap 🌙")
})
