import Link from 'next/link'

export type TabId = 'today' | 'journal' | 'insights' | 'you'

export const TABS: { id: TabId; href: string; icon: string; label: string }[] = [
  { id: 'today', href: '/', icon: '☀︎', label: 'Today' },
  { id: 'journal', href: '/calendar', icon: '📖', label: 'Journal' },
  { id: 'insights', href: '/insights', icon: '📊', label: 'Insights' },
  { id: 'you', href: '/settings', icon: '☺︎', label: 'You' },
]

/** Bottom tab bar on phones and tablets. Computers get the sidebar in AppShell instead. */
export function TabBar({ active }: { active: TabId }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-surface pt-2 text-[11px] lg:hidden">
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} className={`flex flex-col items-center gap-0.5 px-4 ${t.id === active ? 'text-accent' : 'text-muted'}`}>
          <span className="text-lg leading-none">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
