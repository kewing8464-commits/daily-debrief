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

// The model sometimes puts the wrong type in one field ("fun": true, "minutes": "45").
// Clean each field on its own so one bad value never throws away the whole day.
type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 2000) : undefined)
// Numbers may arrive as "45", a quick-reply range like "1-2" (midpoint), or "5+" (the floor).
const num = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v !== 'string') return undefined
  const range = v.trim().match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/)
  if (range) return (Number(range[1]) + Number(range[2])) / 2
  const n = Number(v.trim().replace(/\+$/, ''))
  return v.trim() !== '' && Number.isFinite(n) ? n : undefined
}
const bool = (v: unknown) => (typeof v === 'boolean' ? v : v === 'yes' || v === 'true' ? true : v === 'no' || v === 'false' ? false : undefined)
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => !!x) : undefined)
const prune = <T extends Obj>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

export function cleanModelSummary(raw: unknown, score: number): DaySummary | null {
  if (!isObj(raw)) return null
  const o = raw
  const sleep = isObj(o.sleep) ? o.sleep : {}
  const workout = isObj(o.workout) ? o.workout : {}
  const alcohol = isObj(o.alcohol) ? o.alcohol : {}
  const cannabis = isObj(o.cannabis) ? o.cannabis : {}
  const work = isObj(o.work) ? o.work : {}
  const meetings = num(work.meetings)
  const candidate = prune({
    score,
    sleep: prune({ bedtime: str(sleep.bedtime), wake: str(sleep.wake), hours: num(sleep.hours) }),
    morning: str(o.morning),
    did: str(o.did),
    food: Array.isArray(o.food)
      ? o.food.filter(isObj).map((f) => prune({ item: str(f.item), amount: str(f.amount) })).filter((f) => f.item)
      : [],
    workout: prune({
      // Models sometimes say did: false next to "lifting, 45 min"; the details win.
      did: str(workout.type) !== undefined || (num(workout.minutes) ?? 0) > 0 ? true : bool(workout.did) ?? false,
      type: str(workout.type),
      minutes: num(workout.minutes),
    }),
    alcohol: prune({ drinks: num(alcohol.drinks) ?? 0, kind: str(alcohol.kind) }),
    cannabis: prune({ used: bool(cannabis.used) ?? false, amount: str(cannabis.amount) }),
    work: prune({
      meetings: meetings === undefined ? undefined : Math.round(meetings),
      good: str(work.good),
      bad: str(work.bad),
      enjoyed: strList(work.enjoyed),
      disliked: strList(work.disliked),
    }),
    people: Array.isArray(o.people)
      ? o.people.filter(isObj).filter((p) => str(p.name) && ['positive', 'negative', 'neutral'].includes(p.feeling as string))
          .map((p) => ({ name: str(p.name)!, feeling: p.feeling }))
      : [],
    fun: str(o.fun),
    happy: str(o.happy),
    annoyed: str(o.annoyed),
    standout: str(o.standout),
    tags: strList(o.tags) ?? [],
    oneLine: str(o.oneLine) ?? '',
  })
  const parsed = DaySummarySchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export const SUMMARY_SYSTEM = `You turn a nightly debrief conversation into a JSON record of the person's day.
Only record what the person actually said. Never guess a number they did not say. Keep amounts in their own words.
Omit any field they did not talk about. Text fields are short descriptions in their words (never true/false). Numbers are plain numbers.
Return JSON only. Fill every key the conversation touches:
- sleep {bedtime, wake, hours}: when they fell asleep last night and woke up; hours only if stated or clearly implied.
- morning: how the day started. did: the main things they did today.
- food [{item, amount}]: every food or drink they ate, one item each; amount only if they said it.
- workout {did, type, minutes}. alcohol {drinks (number), kind}. cannabis {used, amount}.
- work {meetings (number), good, bad, enjoyed[], disliked[]}: meetings and work tasks they liked or did not.
- people [{name, feeling: positive|negative|neutral}]: everyone they mentioned spending time with.
- fun: fun things they did. happy: what made them happy. annoyed: what bothered or annoyed them. standout: anything cool or memorable.
- tags: short lowercase words useful for spotting patterns, e.g. "outdoors", "gym", "showing", "hunting".
- oneLine: one sentence recap in their voice, first person, no em dashes.`

/** Structured day from the transcript. Falls back to an empty summary (score kept) if the AI cannot help. */
export async function summarizeTranscript(turns: Turn[], score: number, model: ChatModel): Promise<{ summary: DaySummary; usedAi: boolean }> {
  const transcript = turns.map((t) => `${t.role === 'assistant' ? 'Q' : 'A'}: ${t.text}`).join('\n')
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string
    try {
      raw = await model.complete({ system: SUMMARY_SYSTEM, json: true, maxTokens: 2500, messages: [{ role: 'user', content: transcript }] })
    } catch (err) {
      if (err instanceof AiUnavailableError) break
      throw err
    }
    try {
      const summary = cleanModelSummary(JSON.parse(raw), score)
      if (summary) return { summary, usedAi: true }
    } catch {
      // not JSON; try once more
    }
  }
  return { summary: emptySummary(score), usedAi: false }
}
