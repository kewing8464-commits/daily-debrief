/** Patterns need this many saved debriefs before they mean anything. */
export const PATTERN_THRESHOLD = 14

export function insightsProgress(saved: number): { remaining: number; pct: number } {
  const done = Math.min(Math.max(saved, 0), PATTERN_THRESHOLD)
  return { remaining: PATTERN_THRESHOLD - done, pct: Math.round((done / PATTERN_THRESHOLD) * 100) }
}

export const ASK_YOUR_AI = [
  'What do my best days have in common?',
  'How does drinking affect my next day?',
  'Who do I have the best days with?',
]
