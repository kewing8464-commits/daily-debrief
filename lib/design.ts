import chosen from '@/design/chosen-design.json'

// Design tokens come straight from the design Karson picked in the playground
// (design/chosen-design.json), so changing that file restyles the app.
export const DESIGN = {
  colors: chosen.colors,
  radius: chosen.radius,
  scale: chosen.scale / 100,
} as const

// Warm pastel day colors, two scores per step (spec: Global Constraints).
const SCORE_STEPS = ['#e89f88', '#f2c9b4', '#f0e2c4', '#c7dcb9', '#9fc29a']

export function scoreColor(score: number | null): string {
  if (score === null) return 'transparent'
  const clamped = Math.min(10, Math.max(1, Math.round(score)))
  return SCORE_STEPS[Math.ceil(clamped / 2) - 1]
}
