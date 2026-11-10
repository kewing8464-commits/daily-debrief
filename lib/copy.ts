// The app's voice: a chill friend for the fun parts, plain words for anything
// practical or private. Strings here are the ones the design log fixed.

export const COPY = {
  saved: 'Locked in ✓',
  wrapped: "That's a wrap",
  emptyDay: 'Nothing here. Quiet day?',
  stillLearning: (n: number) => `Still learning you. ${n} more ${n === 1 ? 'day' : 'days'}.`,
  firstDebrief: (time: string) => `Your first vibe check is tonight at ${time}.`,
} as const

/** "7 days straight". Nothing at all for 0: a broken streak is never mentioned. */
export function streakLabel(n: number): string | null {
  if (n <= 0) return null
  return n === 1 ? '1 day' : `${n} days straight`
}

/** How the AI talks during the debrief. */
export const AI_VOICE = `Voice: a chill friend checking in, not a form or a therapist. Short, curious, casual. Mirror the words they use.
Light, natural swearing is fine when it fits ("damn, that's a rough one"), never aimed at them, never forced.
Never lecture about drinking, weed, or food, and never guilt them about anything.`
