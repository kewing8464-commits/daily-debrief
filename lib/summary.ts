import { z } from 'zod'
import { AiUnavailableError, type ChatModel } from '@/lib/ai/provider'
import type { Turn } from '@/lib/conversation'

const text = z.string().max(2000)

// Everything except the score is optional in the model's output and gets a
// safe default, so a thin conversation still produces a valid day.
export const DaySummarySchema = z.object({
  score: z.number().int().min(1).max(10),
  sleep: z.object({ bedtime: text.optional(), wake: text.optional(), hours: z.number().min(0).max(24).optional() }).default({}),
  morning: text.optional(),
  did: text.optional(),
  food: z.array(z.object({ item: text, amount: text.optional() })).default([]),
  workout: z.object({ did: z.boolean(), type: text.optional(), minutes: z.number().min(0).max(1440).optional() }).default({ did: false }),
  alcohol: z.object({ drinks: z.number().min(0).max(100), kind: text.optional() }).default({ drinks: 0 }),
  cannabis: z.object({ used: z.boolean(), amount: text.optional() }).default({ used: false }),
  work: z.object({
    meetings: z.number().int().min(0).max(50).optional(),
    good: text.optional(),
    bad: text.optional(),
    enjoyed: z.array(text).optional(),
    disliked: z.array(text).optional(),
  }).default({}),
  people: z.array(z.object({ name: text, feeling: z.enum(['positive', 'negative', 'neutral']) })).default([]),
  fun: text.optional(),
  happy: text.optional(),
  annoyed: text.optional(),
  standout: text.optional(),
  tags: z.array(text).default([]),
  oneLine: text.default(''),
})

export type DaySummary = z.infer<typeof DaySummarySchema>

export function emptySummary(score: number): DaySummary {
  return DaySummarySchema.parse({ score })
}

const SYSTEM = `You turn a nightly debrief conversation into a JSON record of the person's day.
Only record what the person actually said. Never guess a number they did not say. Keep amounts in their own words.
Omit any field they did not talk about. Return JSON only, with these optional keys:
sleep {bedtime, wake, hours}, morning, did, food [{item, amount}], workout {did, type, minutes},
alcohol {drinks, kind}, cannabis {used, amount}, work {meetings, good, bad, enjoyed[], disliked[]},
people [{name, feeling: positive|negative|neutral}], fun, happy, annoyed, standout,
tags [short lowercase words useful for spotting patterns, e.g. "outdoors", "gym", "showing"],
oneLine (one sentence recap in their voice, first person, no em dashes).`

/** Structured day from the transcript. Falls back to an empty summary (score kept) if the AI cannot help. */
export async function summarizeTranscript(turns: Turn[], score: number, model: ChatModel): Promise<{ summary: DaySummary; usedAi: boolean }> {
  const transcript = turns.map((t) => `${t.role === 'assistant' ? 'Q' : 'A'}: ${t.text}`).join('\n')
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string
    try {
      raw = await model.complete({ system: SYSTEM, json: true, maxTokens: 2500, messages: [{ role: 'user', content: transcript }] })
    } catch (err) {
      if (err instanceof AiUnavailableError) break
      throw err
    }
    try {
      const parsed = DaySummarySchema.safeParse({ ...JSON.parse(raw), score })
      if (parsed.success) return { summary: parsed.data, usedAi: true }
    } catch {
      // not JSON; try once more
    }
  }
  return { summary: emptySummary(score), usedAi: false }
}
