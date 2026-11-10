import type { ReactNode } from 'react'

/**
 * The frosted top bar on phones: stays put while the page scrolls underneath, softly blurred.
 * On computers it's a plain page title (the sidebar is the frosted part there).
 */
export function PageHeader({ kicker, title, right, children }: { kicker?: ReactNode; title?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  return (
    <header className="glass sticky top-0 z-10 -mx-4 mb-4 border-b border-black/10 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3 lg:static lg:mx-0 lg:mb-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      {(kicker || title || right) && (
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            {kicker && <p className="text-[11px] font-bold tracking-[0.08em] text-glass-ink uppercase lg:text-muted">{kicker}</p>}
            {title && <h1 className="mt-0.5 font-serif text-[1.65rem] leading-tight font-semibold text-heading lg:text-[2rem]">{title}</h1>}
          </div>
          {right}
        </div>
      )}
      {children}
    </header>
  )
}
