import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { debriefDateFor } from '@/lib/dates'
import {
  EMPTY_MESSAGE, METRICS, compareDays, daySummaryLine, overview, resolveRange, searchEntries, trend, type Range, type SavedDay,
} from '@/lib/connector/journal'
import type { JournalSource } from '@/lib/connector/source'

export type { JournalSource }

const date = z.string().describe('A date like 2026-10-27')
const rangeArgs = {
  start: date.optional().describe('First day to include, like 2026-10-01. Defaults to 30 days before end.'),
  end: date.optional().describe('Last day to include, like 2026-10-27. Defaults to today.'),
}
const filter = z.object({
  minScore: z.number().min(1).max(10).optional().describe('Only days scored at least this (1-10)'),
  maxScore: z.number().min(1).max(10).optional().describe('Only days scored at most this (1-10)'),
  tag: z.string().optional().describe('Only days with this tag, like "gym" or "work"'),
  workedOut: z.boolean().optional().describe('Only days with (true) or without (false) a workout'),
  minDrinks: z.number().min(0).optional().describe('Only days with at least this many drinks'),
  cannabis: z.boolean().optional().describe('Only days with (true) or without (false) weed'),
  weekday: z.number().int().min(0).max(6).optional().describe('Only this weekday: 0 Sunday through 6 Saturday'),
})

const json = (value: unknown, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  ...(isError ? { isError: true } : {}),
})

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }

/** The tools an AI app gets when someone adds their Daily Debrief connector link. All read-only. */
export function registerJournalTools(server: McpServer, source: JournalSource, now: () => Date) {
  // Resolve the range in the person's own time zone, then load their saved days in it.
  async function load(args: { start?: string; end?: string }): Promise<{ error: string } | { error?: undefined; range: Range; days: SavedDay[] }> {
    const profile = await source.profile()
    const today = debriefDateFor(now(), profile?.timezone ?? 'UTC')
    const range = resolveRange(args, today)
    if ('error' in range) return { error: range.error }
    return { range, days: await source.days(range.start, range.end) }
  }
  const empty = (range: Range) => json({ range, debriefs: 0, message: EMPTY_MESSAGE })

  server.registerTool('get_journal_overview', {
    title: 'Journal overview',
    description: 'Summary of a period of the user\'s Daily Debrief journal: number of debriefs, average day score (1-10), best and worst days, current streak, most common tags, and the people who came up and how the user felt about them. Start here for broad questions about how life has been going.',
    inputSchema: z.object(rangeArgs),
    annotations: readOnly,
  }, async (args) => {
    const r = await load(args)
    if (r.error !== undefined) return json({ error: r.error }, true)
    return json(overview(r.days, r.range))
  })

  server.registerTool('get_days', {
    title: 'List days',
    description: 'One compact line per saved day in a range: date, score, one-line summary, sleep hours, workout, drinks, weed, tags. Use it to scan a period. Call get_day for the full details of a single day.',
    inputSchema: z.object(rangeArgs),
    annotations: readOnly,
  }, async (args) => {
    const r = await load(args)
    if (r.error !== undefined) return json({ error: r.error }, true)
    if (!r.days.length) return empty(r.range)
    return json({ range: r.range, debriefs: r.days.length, days: r.days.map(daySummaryLine) })
  })

  server.registerTool('get_day', {
    title: 'One day in full',
    description: 'Everything saved for one day: the full summary (sleep, food, workout, drinks, weed, work, people, what made the user happy or annoyed, standout moments) plus the conversation the user had with Daily Debrief that night.',
    inputSchema: z.object({ date }),
    annotations: readOnly,
  }, async ({ date }) => {
    const r = await load({ start: date, end: date })
    if (r.error !== undefined) return json({ error: r.error.replace('"start"', '"date"') }, true)
    const day = r.days[0]
    if (!day) return json({ date, message: `No saved debrief on ${date}.` })
    return json({ date, score: day.score, summary: day.summary, transcript: day.transcript })
  })

  server.registerTool('search_entries', {
    title: 'Search the journal',
    description: 'Find days where the user mentioned something, like a person ("Jake"), a place, a food, or an activity ("hunting"). Searches what the user said and the saved summaries, ignoring case. Returns up to 30 days with short snippets.',
    inputSchema: z.object({ text: z.string().min(1).describe('Word or phrase to look for'), ...rangeArgs }),
    annotations: readOnly,
  }, async ({ text, ...args }) => {
    const r = await load(args)
    if (r.error !== undefined) return json({ error: r.error }, true)
    const results = searchEntries(r.days, text)
    return json({ range: r.range, text, matches: results.length, results })
  })

  server.registerTool('get_trends', {
    title: 'Trend over time',
    description: 'Day-by-day values of one measure with its average, min and max. Measures: score (1-10), sleep_hours, drinks, workout_minutes, worked_out (1 or 0), cannabis (1 or 0). Days without a value are left out.',
    inputSchema: z.object({ metric: z.enum(METRICS).describe('Which measure'), ...rangeArgs }),
    annotations: readOnly,
  }, async ({ metric, ...args }) => {
    const r = await load(args)
    if (r.error !== undefined) return json({ error: r.error }, true)
    if (!r.days.length) return empty(r.range)
    return json({ range: r.range, ...trend(r.days, metric) })
  })

  server.registerTool('compare_days', {
    title: 'Compare two kinds of days',
    description: 'Contrast two groups of days, for example good days (minScore 8) against rough days (maxScore 5), or workout days against rest days. For each group: count, average score, sleep, drinks, workout and weed rates, and the most common tags, foods and people. Good for "what do my best days have in common?" Results are correlations, not causes.',
    inputSchema: z.object({ group_a: filter.describe('First group'), group_b: filter.describe('Second group'), ...rangeArgs }),
    annotations: readOnly,
  }, async ({ group_a, group_b, ...args }) => {
    const r = await load(args)
    if (r.error !== undefined) return json({ error: r.error }, true)
    if (!r.days.length) return empty(r.range)
    return json({ range: r.range, ...compareDays(r.days, group_a, group_b) })
  })
}
