// Appearance: Light (default), Dark (warm dusk), or match the phone's setting.
// Saved in a cookie so the server paints the right theme on the first frame (no flash).

export type Theme = 'light' | 'dark' | 'system'
export const THEME_COOKIE = 'dd-theme'
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Match my phone' },
]

export function parseTheme(v: string | undefined): Theme {
  return v === 'dark' || v === 'system' ? v : 'light'
}

export const themeClass = (t: Theme) => `theme-${t}`
