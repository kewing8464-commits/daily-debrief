import { greetingFor } from '@/lib/greeting'

test('morning, afternoon, evening, and late night', () => {
  expect(greetingFor(4)).toBe('Good morning')
  expect(greetingFor(11)).toBe('Good morning')
  expect(greetingFor(12)).toBe('Good afternoon')
  expect(greetingFor(16)).toBe('Good afternoon')
  expect(greetingFor(17)).toBe('Good evening')
  expect(greetingFor(23)).toBe('Good evening')
  expect(greetingFor(1)).toBe('Good evening')
})
