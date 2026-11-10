import Link from 'next/link'
import type { ReactNode } from 'react'
import { TABS, TabBar, type TabId } from './TabBar'
import { VibeCheckButton } from './VibeCheckButton'

/**
 * Every main screen sits in this. Phone and tablet: content plus the bottom tab bar.
 * Computer (lg, 1024px+): a left sidebar with the tabs and "Start debrief", no bottom bar.
 */
export function AppShell({ active, wide = false, children }: { active: TabId; wide?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="glass sticky top-0 hidden h-dvh w-[210px] shrink-0 flex-col gap-1 border-r border-black/10 px-3 py-5 lg:flex">
        <Link href="/" className="mb-5 px-3 font-serif text-lg">🌙 Daily Debrief</Link>
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`rounded-card px-3 py-2 text-[15px] ${t.id === active ? 'bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] font-semibold text-accent' : 'font-medium text-glass-ink hover:bg-[color-mix(in_srgb,var(--surface)_40%,transparent)]'}`}
          >
            {t.icon} {t.label}
          </Link>
        ))}
        <div className="mt-auto" />
        <VibeCheckButton variant="sidebar" />
        <Link href="/debrief" className="rounded-card bg-accent py-2.5 text-center font-bold text-on-accent">
          Start debrief
        </Link>
      </aside>
      <main className={`min-w-0 flex-1 px-4 pb-28 lg:px-10 lg:pt-10 lg:pb-12 ${wide ? '' : 'mx-auto w-full max-w-3xl'}`}>
        {children}
      </main>
      <TabBar active={active} />
    </div>
  )
}
