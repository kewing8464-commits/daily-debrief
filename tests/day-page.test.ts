import { aiQuestion, dayNeighbors, filledSections } from '@/lib/day-page'
import { emptySummary } from '@/lib/summary'

test('day arrows never go past today', () => {
  expect(dayNeighbors('2026-10-27', '2026-10-27')).toEqual({ prev: '2026-10-26', next: null })
  expect(dayNeighbors('2026-10-31', '2026-11-05').next).toBe('2026-11-01')
  expect(dayNeighbors('2026-03-01', '2026-11-05').prev).toBe('2026-02-28')
})

test('only sections with something in them show, drinks always', () => {
  expect(filledSections(emptySummary(5)).map((s) => [s.key, s.body])).toEqual([['drinks', 'No drinks']])
})

test('sections come in a fixed order', () => {
  const full = {
    ...emptySummary(8),
    sleep: { bedtime: '10pm', wake: '6am', hours: 8 },
    morning: 'gym', did: 'showing', food: [{ item: 'eggs' }], workout: { did: true, type: 'lift', minutes: 60 },
    alcohol: { drinks: 2 }, cannabis: { used: true }, work: { meetings: 1, good: 'closed' },
    people: [{ name: 'Jake', feeling: 'positive' as const }], fun: 'fishing', happy: 'the bull', annoyed: 'traffic', standout: 'elk',
  }
  expect(filledSections(full).map((s) => s.key)).toEqual(['sleep', 'morning', 'did', 'food', 'workout', 'drinks', 'weed', 'work', 'people', 'fun', 'happy', 'annoyed', 'standout'])
  expect(filledSections(full).find((s) => s.key === 'drinks')?.body).toBe('2 beers')
})

test('a ready-made question for your AI', () => {
  expect(aiQuestion('2026-10-23', 10)).toBe('Tell me about my day on Oct 23 and what made it a 10.')
})

test('drink kind is only shown when it adds something', () => {
  expect(filledSections({ ...emptySummary(6), alcohol: { drinks: 2, kind: 'beer' } }).find((s) => s.key === 'drinks')?.body).toBe('2 beers')
  expect(filledSections({ ...emptySummary(6), alcohol: { drinks: 1, kind: 'IPA' } }).find((s) => s.key === 'drinks')?.body).toBe('1 beer (IPA)')
})

test('no emoji: sections carry an icon name, people say how it felt in words', () => {
  const s = { ...emptySummary(8), people: [{ name: 'Jake', feeling: 'positive' as const }, { name: 'Boss', feeling: 'negative' as const }] }
  const people = filledSections(s).find((x) => x.key === 'people')!
  expect(people.icon).toBe('people')
  expect(people.body).toBe('Jake (good), Boss (tense)')
})
