import { z } from 'zod'
import type { IconName } from '@/components/Icon'
import type { ChatModel } from '@/lib/ai/provider'
import { nextTurn, type ConversationState, type NextQuestion } from '@/lib/conversation'
import type { TopicId } from '@/lib/topics'

// Vibe checks: quick notes during the day. The night debrief starts from them.

export const VIBE_TAGS = [
  { id: 'food', label: 'Food', icon: 'food', topic: 'food' },
  { id: 'workout', label: 'Workout', icon: 'workout', topic: 'workout' },
  { id: 'people', label: 'People', icon: 'people', topic: null },
  { id: 'happy', label: 'Happy', icon: 'happy', topic: 'happy' },
  { id: 'annoyed', label: 'Annoyed', icon: 'annoyed', topic: 'annoyed' },
  { id: 'work', label: 'Work', icon: 'work', topic: 'meetings' },
  { id: 'drinks', label: 'Drinks', icon: 'drinks', topic: 'beers' },
] as const satisfies readonly { id: string; label: string; icon: IconName; topic: TopicId | null }[]

const TAG_IDS = VIBE_TAGS.map((t) => t.id) as [string, ...string[]]

export const VibeCheckInputSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  tags: z.array(z.enum(TAG_IDS)).max(VIBE_TAGS.length).default([]),
  mode: z.enum(['type', 'talk']).default('type'),
})
export const VibeCheckEditSchema = VibeCheckInputSchema.pick({ text: true, tags: true })

export type VibeCheck = { id: string; day_date: string; created_at: string; text: string; mode: 'type' | 'talk'; tags: string[] }

export const OPENING = "Here's what you noted today:"

export function vibeTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

const byTime = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)

/** The day's notes as one block, oldest first: "7:10 AM: Gym before work". */
export function notesText(checks: VibeCheck[], tz: string): string {
  return [...checks].sort(byTime).map((c) => `${vibeTime(c.created_at, tz)}: ${c.text}`).join('\n')
}

/**
 * Open the night debrief from the day's vibe checks: the notes go in as the first answer, tagged
 * topics count as covered, and the AI (if it's up) marks anything else they cover and asks about the rest.
 */
export async function startFromVibeChecks(checks: VibeCheck[], tz: string, model: ChatModel): Promise<{ state: ConversationState; next: NextQuestion; usedAi: boolean }> {
  const covered = new Set<TopicId>()
  for (const c of checks) for (const tag of c.tags) {
    const topic = VIBE_TAGS.find((t) => t.id === tag)?.topic
    if (topic) covered.add(topic)
  }
  const opening: ConversationState = { turns: [{ role: 'assistant', text: OPENING }], covered: [...covered], skipped: [] }
  return nextTurn(opening, notesText(checks, tz), model)
}

export type TimelineItem =
  | { kind: 'vibe'; at: string; check: VibeCheck }
  | { kind: 'debrief'; at: string; score: number }

/** The day in order: each vibe check, then the night debrief (if saved). */
export function timelineItems(checks: VibeCheck[], debrief: { at: string; score: number } | null): TimelineItem[] {
  const items: TimelineItem[] = checks.map((check) => ({ kind: 'vibe', at: check.created_at, check }))
  if (debrief) items.push({ kind: 'debrief', at: debrief.at, score: debrief.score })
  return items.sort((a, b) => a.at.localeCompare(b.at))
}

/** Show "Yesterday's still open" on Today: before noon, only if yesterday has notes and no saved debrief. */
export function wrapUpYesterday(hour: number, yesterdayChecks: number, yesterdaySaved: boolean): boolean {
  return hour < 12 && yesterdayChecks > 0 && !yesterdaySaved
}
