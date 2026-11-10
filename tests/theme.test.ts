import { THEME_COOKIE, themeClass, parseTheme } from '@/lib/theme'

test('appearance: light, dark, or match the phone; anything else is light', () => {
  expect(parseTheme('dark')).toBe('dark')
  expect(parseTheme('system')).toBe('system')
  expect(parseTheme('light')).toBe('light')
  expect(parseTheme(undefined)).toBe('light')
  expect(parseTheme('neon')).toBe('light')
  expect(themeClass('dark')).toBe('theme-dark')
  expect(themeClass('system')).toBe('theme-system')
  expect(themeClass('light')).toBe('theme-light')
  expect(THEME_COOKIE).toBe('dd-theme')
})
