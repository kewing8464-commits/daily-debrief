import Link from 'next/link'

type Tab = 'home' | 'calendar' | 'settings'
const TABS: { id: Tab; href: string; icon: string; label: string }[] = [
  { id: 'home', href: '/', icon: '☀︎', label: 'Today' },
  { id: 'calendar', href: '/calendar', icon: '📖', label: 'Journal' },
  { id: 'settings', href: '/settings', icon: '☺︎', label: 'You' },
]

export function TabBar({ active }: { active: Tab }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-surface pt-2 text-[11px]">
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} className={`flex flex-col items-center gap-0.5 px-4 ${t.id === active ? 'text-accent' : 'text-muted'}`}>
          <span className="text-lg leading-none">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
