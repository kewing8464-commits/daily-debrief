import type { ConversationState, Turn } from '@/lib/conversation'
import { ConversationStateSchema } from '@/lib/schemas'

// iPhone can close a home-screen app at any time (screen lock, switching apps).
// The debrief is saved locally after every turn so reopening picks up where it left off.

export const DRAFT_KEY = 'debrief-draft'

export function serializeDraft(date: string, state: ConversationState): string {
  return JSON.stringify({ date, state })
}

/** Today's saved conversation, or null if there is none, it is from another day, or it is corrupt. */
export function restoreDraft(stored: string | null, today: string): ConversationState | null {
  if (!stored) return null
  try {
    const { date, state } = JSON.parse(stored) as { date?: string; state?: unknown }
    if (date !== today) return null
    const parsed = ConversationStateSchema.safeParse(state)
    return parsed.success ? (parsed.data as ConversationState) : null
  } catch {
    return null
  }
}

const DIVIDER: Turn = { role: 'assistant', text: 'Added later' }

/** A later session on an already-saved day: keep every earlier turn, then a divider, then the new ones. */
export function appendSession(saved: { transcript: Turn[] }, session: Turn[]): Turn[] {
  if (saved.transcript.length === 0) return [...session]
  return [...saved.transcript, DIVIDER, ...session]
}
