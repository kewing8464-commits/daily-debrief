'use client'
import { useEffect, useState } from 'react'
import { parseTheme, THEME_COOKIE, themeClass, THEMES, type Theme } from '@/lib/theme'
import { Card } from './Card'

function applyTheme(t: Theme) {
  document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`
  THEMES.forEach((x) => document.body.classList.remove(themeClass(x.id)))
  document.body.classList.add(themeClass(t))
}

/** Light, Dark, or match the phone. Switches right away and is remembered on this device. */
export function AppearanceCard() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = document.cookie.split('; ').find((c) => c.startsWith(`${THEME_COOKIE}=`))?.split('=')[1]
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the saved choice after mount
    setTheme(parseTheme(saved))
  }, [])

  function pick(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  return (
    <Card className="mb-3">
      <p className="font-semibold">Appearance</p>
      <p className="mt-0.5 mb-3 text-sm text-muted">The bedtime debrief always uses the warm dark screen.</p>
      <div className="grid grid-cols-3 gap-1.5 rounded-card bg-[color-mix(in_srgb,var(--text)_7%,transparent)] p-1 text-sm">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className={`rounded-[7px] py-2 ${theme === t.id ? 'card-shadow bg-surface font-semibold text-ink' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </Card>
  )
}
