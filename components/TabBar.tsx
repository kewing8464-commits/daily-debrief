import { Icon, type IconName } from './Icon'
import Link from 'next/link'

export type TabId = 'today' | 'journal' | 'insights' | 'you'

export const TABS: { id: TabId; href: string; icon: IconName; label: string }[] = [
  { id: 'today', href: '/', icon: 'today', label: 'Today' },
  { id: 'journal', href: '/calendar', icon: 'journal', label: 'Journal' },
  { id: 'insights', href: '/insights', icon: 'insights', label: 'Insights' },
  { id: 'you', href: '/settings', icon: 'you', label: 'You' },
]

/** Bottom tab bar on phones and tablets. Computers get the sidebar in AppShell instead. */
export function TabBar({ active }: { active: TabId }) {
  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-black/10 pt-2 text-[11px] font-semibold lg:hidden">
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} className={`flex flex-col items-center gap-0.5 px-4 ${t.id === active ? 'text-accent' : 'text-glass-ink'}`}>
          <Icon name={t.icon} size={22} />
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
