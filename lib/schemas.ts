import { z } from 'zod'
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
