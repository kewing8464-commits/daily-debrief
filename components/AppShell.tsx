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
      <aside className="sticky top-0 hidden h-dvh w-[200px] shrink-0 flex-col gap-1 border-r border-line bg-surface px-3 py-5 lg:flex">
        <Link href="/" className="mb-5 px-3 font-serif text-lg">🌙 Daily Debrief</Link>
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`rounded-card px-3 py-2 text-[15px] ${t.id === active ? 'bg-bg text-accent' : 'text-muted hover:text-ink'}`}
          >
            {t.icon} {t.label}
          </Link>
        ))}
        <div className="mt-auto" />
        <VibeCheckButton variant="sidebar" />
        <Link href="/debrief" className="rounded-card bg-accent py-2.5 text-center font-bold text-[#1e1714]">
          Start debrief
        </Link>
      </aside>
      <main className={`safe-top flex-1 px-4 pb-28 lg:px-8 lg:pt-8 lg:pb-10 ${wide ? '' : 'mx-auto w-full max-w-3xl'}`}>
        {children}
      </main>
      <TabBar active={active} />
    </div>
  )
}
