// Late nights belong to the day you are wrapping up: before this hour, a
// debrief counts toward the previous date.
const DAY_STARTS_AT_HOUR = 4

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** The date ('YYYY-MM-DD') a debrief started at `now` in `timeZone` belongs to. */
export function debriefDateFor(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  const y = get('year'), m = get('month'), d = get('day'), h = get('hour')
  if (h >= DAY_STARTS_AT_HOUR) return toIso(y, m, d)
  // Calendar arithmetic in UTC is safe here: we only step back one calendar day.
  const prev = new Date(Date.UTC(y, m - 1, d - 1))
  return toIso(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate())
}

/** Sunday-first month grid: leading nulls, then every date of the month. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (string | null)[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIso(year, month, d))
  return cells
}

/** 'YYYY-MM' moved by `delta` months. */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`
}
