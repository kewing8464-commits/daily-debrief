import { DESIGN, NIGHT, scoreColor, scoreInk } from '@/lib/design'
import chosen from '@/design/chosen-design.json'

test('tokens come from the chosen design', () => {
  expect(DESIGN.colors).toEqual(chosen.colors)
  expect(NIGHT).toEqual(chosen.night)
  expect(DESIGN.radius).toBe(chosen.radius)
})

test('mood colors run rough (burnt orange) through neutral to great (teal)', () => {
  expect(scoreColor(1)).toBe('#c4562a')
  expect(scoreColor(4)).toBe('#e0a185')
  expect(scoreColor(6)).toBe('#e3ddd4')
  expect(scoreColor(8)).toBe('#7fb8c6')
  expect(scoreColor(10)).toBe('#00809e')
  expect(scoreColor(null)).toBe('transparent')
})

test('numbers on mood colors stay readable', () => {
  expect(scoreInk(1)).toBe('#ffffff')
  expect(scoreInk(6)).toBe('#1f1c19')
  expect(scoreInk(10)).toBe('#ffffff')
})
