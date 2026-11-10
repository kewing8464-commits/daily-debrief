import { COPY } from '@/lib/copy'

/** The Today greeting for an hour 0-23. Once tonight's debrief is saved, it's a wrap. */
export function greetingFor(hour: number, wrapped: boolean): string {
  if (wrapped) return COPY.wrapped
  if (hour >= 4 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Evening'
}
