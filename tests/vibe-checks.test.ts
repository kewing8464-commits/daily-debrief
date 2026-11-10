import type { ChatModel } from '@/lib/ai/provider'
import { notesText, startFromVibeChecks, timelineItems, VibeCheckInputSchema, wrapUpYesterday, type VibeCheck } from '@/lib/vibe-checks'

const down: ChatModel = { complete: async () => { throw new Error('AI down') } }
const vc = (time: string, text: string, tags: string[] = []): VibeCheck => ({
  id: time, day_date: '2026-11-09', created_at: `2026-11-09T${time}:00Z`, text, mode: 'type', tags,
})
// 14:10 and 19:40 UTC are 7:10 am and 12:40 pm in Denver (MST, UTC-7)
const checks = [vc('19:40', 'Lunch with Galen, burrito bowl', ['food', 'people']), vc('14:10', 'Gym before work, legs 50 min', ['workout'])]

test('vibe check input: trimmed text, known tags only, type by default', () => {
  expect(VibeCheckInputSchema.parse({ text: '  hi  ' })).toEqual({ text: 'hi', tags: [], mode: 'type' })
  expect(VibeCheckInputSchema.safeParse({ text: '   ' }).success).toBe(false)
  expect(VibeCheckInputSchema.safeParse({ text: 'x', tags: ['bogus'] }).success).toBe(false)
  expect(VibeCheckInputSchema.safeParse({ text: 'x'.repeat(1001) }).success).toBe(false)
})

test('notes read in time order with local times', () => {
  expect(notesText(checks, 'America/Denver')).toBe('7:10 AM: Gym before work, legs 50 min\n12:40 PM: Lunch with Galen, burrito bowl')
})

test('the debrief starts from the notes and skips tagged topics even when the AI is down', async () => {
  const r = await startFromVibeChecks(checks, 'America/Denver', down)
  expect(r.state.turns[0]).toMatchObject({ role: 'assistant', text: "Here's what you noted today:" })
  expect(r.state.turns[1]).toMatchObject({ role: 'user', text: notesText(checks, 'America/Denver') })
  expect(r.state.covered).toEqual(expect.arrayContaining(['workout', 'food']))
  expect(r.next.topic).toBe('morning')
})

test('with the AI up, its question about the next topic is used', async () => {
  const ai: ChatModel = { complete: async () => JSON.stringify({ covered: ['did'], nextTopic: 'morning', question: 'Solid lunch. How did the morning start?' }) }
  const r = await startFromVibeChecks(checks, 'America/Denver', ai)
  expect(r.state.covered).toEqual(expect.arrayContaining(['workout', 'food', 'did']))
  expect(r.next.text).toBe('Solid lunch. How did the morning start?')
})

test('timeline: vibe checks and the debrief in time order', () => {
  const items = timelineItems(checks, { at: '2026-11-10T04:30:00Z', score: 8 })
  expect(items.map((i) => i.kind)).toEqual(['vibe', 'vibe', 'debrief'])
  expect(items[0].at).toBe('2026-11-09T14:10:00Z')
  expect(timelineItems([], null)).toEqual([])
})

test('"wrap up yesterday" shows only until noon, only for an open day with notes', () => {
  expect(wrapUpYesterday(10, 2, false)).toBe(true)
  expect(wrapUpYesterday(13, 2, false)).toBe(false)
  expect(wrapUpYesterday(10, 0, false)).toBe(false)
  expect(wrapUpYesterday(10, 2, true)).toBe(false)
})
