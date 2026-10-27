import { DESIGN, scoreColor } from '@/lib/design'
import chosen from '@/design/chosen-design.json'

test('tokens come from the chosen design', () => {
  expect(DESIGN.colors).toEqual(chosen.colors)
  expect(DESIGN.radius).toBe(chosen.radius)
})

test('score colors', () => {
  expect(scoreColor(1)).toBe('#e89f88')
  expect(scoreColor(4)).toBe('#f2c9b4')
  expect(scoreColor(6)).toBe('#f0e2c4')
  expect(scoreColor(8)).toBe('#c7dcb9')
  expect(scoreColor(10)).toBe('#9fc29a')
  expect(scoreColor(null)).toBe('transparent')
})
