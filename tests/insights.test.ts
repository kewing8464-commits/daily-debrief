import { insightsProgress } from '@/lib/insights'

test('progress toward the 14 debriefs patterns need', () => {
  expect(insightsProgress(9)).toEqual({ remaining: 5, pct: 64 })
  expect(insightsProgress(20)).toEqual({ remaining: 0, pct: 100 })
  expect(insightsProgress(0)).toEqual({ remaining: 14, pct: 0 })
})
