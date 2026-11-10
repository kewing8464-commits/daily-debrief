import chosen from '@/design/chosen-design.json'

// Design tokens come straight from the design Karson picked in the playground
// (design/chosen-design.json), so changing that file restyles the app.
export const DESIGN = {
  colors: chosen.colors,
  radius: chosen.radius,
  scale: chosen.scale / 100,
} as const

export const NIGHT = chosen.night
export const CHART = chosen.chart

// Day mood is a diverging scale: rough (burnt orange) -> neutral -> great (green), two scores per step.
// The pair passes the colorblind checks (dataviz validate_palette.js, light and dark).
const SCORE_STEPS = ['#c4562a', '#e0a185', '#e3ddd4', '#7db69f', '#178f6a']
const SCORE_INK = ['#ffffff', '#1f1c19', '#1f1c19', '#1f1c19', '#ffffff']

const step = (score: number) => Math.ceil(Math.min(10, Math.max(1, Math.round(score))) / 2) - 1

export function scoreColor(score: number | null): string {
  if (score === null) return 'transparent'
  return SCORE_STEPS[step(score)]
}

/** Text color that stays readable on scoreColor(score). */
export function scoreInk(score: number | null): string {
  if (score === null) return 'var(--text)'
  return SCORE_INK[step(score)]
}
