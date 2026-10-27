// Rules for writing a day, kept apart from the route so they can be tested.

type Existing = { status: 'draft' | 'saved'; updated_at: string } | null
type Incoming = { status: 'draft' | 'saved'; expectedUpdatedAt: string | null }

/**
 * True when this write would clobber a saved day it has not seen:
 * a background draft over a saved day, or a save from a screen that loaded
 * an older version (another tab, a second device, a failed load).
 */
export function saveConflict(existing: Existing, incoming: Incoming): boolean {
  if (!existing || existing.status !== 'saved') return false
  if (incoming.status === 'draft') return true
  return incoming.expectedUpdatedAt !== existing.updated_at
}
