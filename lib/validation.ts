import { z } from 'zod'

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const SetupInputSchema = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you').max(40, 'Keep it under 40 characters'),
  debriefTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a time like 21:30'),
  timezone: z.string().refine(isTimeZone, 'Unknown time zone'),
})

export type SetupInput = z.infer<typeof SetupInputSchema>
