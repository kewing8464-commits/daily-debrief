import { emptySummary } from '@/lib/summary'
import type { SavedDay } from '@/lib/connector/journal'
import { registerJournalTools, type JournalSource } from '@/lib/connector/tools'

type Handler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>
type Registered = { config: { annotations?: { readOnlyHint?: boolean }; description?: string }; cb: Handler }

const mk = (day_date: string, score: number): SavedDay => ({
  day_date,
  score,
  summary: { ...emptySummary(score), oneLine: `day ${day_date}` },
  transcript: [{ role: 'user', text: `talked about ${day_date}` }],
})

function setup(saved: SavedDay[]) {
  const tools = new Map<string, Registered>()
  const asked: [string, string][] = []
  const server = { registerTool: (name: string, config: Registered['config'], cb: Handler) => void tools.set(name, { config, cb }) }
  const source: JournalSource = {
    profile: async () => ({ name: 'Karson', timezone: 'America/Denver' }),
    days: async (start, end) => {
      asked.push([start, end])
      return saved.filter((d) => d.day_date >= start && d.day_date <= end)
    },
  }
  // Oct 28 03:00 UTC is still Oct 27 in Denver
  registerJournalTools(server as never, source, () => new Date('2026-10-28T03:00:00Z'))
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await tools.get(name)!.cb(args)
    return { ...res, json: JSON.parse(res.content[0].text) }
  }
  return { tools, call, asked }
}

const saved = [mk('2026-10-25', 8), mk('2026-10-26', 4), mk('2026-10-27', 9)]

test('registers six read-only tools with descriptions', () => {
  const { tools } = setup(saved)
  expect([...tools.keys()].sort()).toEqual(['compare_days', 'get_day', 'get_days', 'get_journal_overview', 'get_trends', 'search_entries'])
  for (const t of tools.values()) {
    expect(t.config.annotations?.readOnlyHint).toBe(true)
    expect(t.config.description?.length).toBeGreaterThan(20)
  }
})

test('default range ends today in the user time zone', async () => {
  const { call, asked } = setup(saved)
  const r = await call('get_journal_overview')
  expect(r.json.range).toEqual({ start: '2026-09-28', end: '2026-10-27' })
  expect(asked[0]).toEqual(['2026-09-28', '2026-10-27'])
  expect(r.json.debriefs).toBe(3)
})

test('get_days lists days without transcripts', async () => {
  const { call } = setup(saved)
  const r = await call('get_days', { start: '2026-10-25', end: '2026-10-27' })
  expect(r.json.days).toHaveLength(3)
  expect(JSON.stringify(r.json)).not.toContain('talked about')
})

test('get_day returns the full day with its conversation, or a plain message', async () => {
  const { call } = setup(saved)
  const hit = await call('get_day', { date: '2026-10-26' })
  expect(hit.json.summary.score).toBe(4)
  expect(hit.json.transcript[0].text).toBe('talked about 2026-10-26')
  const miss = await call('get_day', { date: '2026-10-01' })
  expect(miss.json.message).toMatch(/No saved debrief on 2026-10-01/)
})

test('a reversed range is swapped and a bad date is a clear tool error', async () => {
  const { call } = setup(saved)
  const r = await call('get_days', { start: '2026-10-27', end: '2026-10-25' })
  expect(r.json.range).toEqual({ start: '2026-10-25', end: '2026-10-27' })
  const bad = await call('get_days', { start: 'last week' })
  expect(bad.isError).toBe(true)
  expect(bad.json.error).toMatch(/start/)
})

test('an empty range is a friendly message', async () => {
  const { call } = setup([])
  const r = await call('get_days')
  expect(r.json).toMatchObject({ debriefs: 0, message: 'No saved debriefs in this range yet.' })
})

test('search, trends and compare answer with their range', async () => {
  const { call } = setup(saved)
  expect((await call('search_entries', { text: '10-26' })).json.results[0].date).toBe('2026-10-26')
  expect((await call('get_trends', { metric: 'score' })).json.average).toBe(7)
  const c = await call('compare_days', { group_a: { minScore: 8 }, group_b: { maxScore: 5 } })
  expect(c.json.caveat).toMatch(/not proof of cause and effect/)
  expect(c.json.range.end).toBe('2026-10-27')
})
