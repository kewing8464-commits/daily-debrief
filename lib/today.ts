/**
 * Today's "Start" button. Only a quiet "Start early" link in the morning so it doesn't nag,
 * a small button from noon (for nights out), and big at the top from an hour before debrief time until 4am.
 */
export function startButton(nowMin: number, debriefMin: number, saved: boolean): 'hidden' | 'early' | 'normal' | 'prominent' {
  if (saved) return 'hidden'
  if (nowMin < 4 * 60) return 'prominent'
  if (nowMin < 12 * 60) return 'early'
  return nowMin >= debriefMin - 60 ? 'prominent' : 'normal'
}

/** "21:30" or "21:30:00" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** "21:30" -> "9:30 pm" */
export function prettyTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

/** A day debriefed two or more days late is "from memory". Adding to a saved day keeps its label. */
export function fromMemoryFor(row: { status: string; from_memory?: boolean | null } | null, date: string, today: string): boolean {
  if (row?.status === 'saved') return !!row.from_memory
  return date < dayBefore(today)
}
