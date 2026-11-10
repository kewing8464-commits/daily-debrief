import { z } from 'zod'
import { DaySummarySchema } from '@/lib/summary'
import { TOPICS } from '@/lib/topics'

const topicId = z.enum(TOPICS.map((t) => t.id) as [string, ...string[]])

export const TurnSchema = z.object({
  role: z.enum(['assistant', 'user']),
  text: z.string().max(4000),
  topic: z.union([topicId, z.literal('score')]).optional(),
})

export const ConversationStateSchema = z.object({
  turns: z.array(TurnSchema).max(200),
  covered: z.array(topicId),
  skipped: z.array(topicId),
})

const rating = z.number().int().min(1).max(4).nullable().default(null)

/** Body of PUT /api/days/[date]. */
export const DayPutSchema = z.object({
  transcript: z.array(TurnSchema).max(400),
  summary: DaySummarySchema.nullable(),
  score: z.number().int().min(1).max(10).nullable(),
  productive: rating,
  focus: rating,
  mode: z.enum(['type', 'talk']),
  durationSec: z.number().int().min(0).max(24 * 3600),
  timezone: z.string().min(1).max(64),
  status: z.enum(['draft', 'saved']),
  // The updated_at of the day this screen loaded (null if there was none). Guards against
  // overwriting a day saved from another screen since then.
  expectedUpdatedAt: z.string().nullable().default(null),
  // Debriefed later than the next day, from memory.
  fromMemory: z.boolean().default(false),
})
