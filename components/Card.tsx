import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-shadow rounded-card border border-line bg-surface p-3.5 ${className}`}>{children}</div>
}
