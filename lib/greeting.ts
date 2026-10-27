/** "Good morning" / "Good afternoon" / "Good evening" for an hour 0-23. Late night counts as evening. */
export function greetingFor(hour: number): string {
  if (hour >= 4 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}
