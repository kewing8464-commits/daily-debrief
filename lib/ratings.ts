// Two optional one-tap ratings after the day score, stored as 1-4.

export const PRODUCTIVE_LABELS = ['Not', 'A bit', 'Solid', 'Very'] as const
export const FOCUS_LABELS = ['Scattered', 'Distracted', 'Steady', 'Locked in'] as const
export const PRODUCTIVE_QUESTION = 'Get stuff done?'
export const FOCUS_QUESTION = 'Were you locked in?'

export type RatingKind = 'productive' | 'focus'

export function ratingLabel(kind: RatingKind, n: number | null | undefined): string | null {
  if (!n || n < 1 || n > 4) return null
  return (kind === 'productive' ? PRODUCTIVE_LABELS : FOCUS_LABELS)[n - 1]
}
