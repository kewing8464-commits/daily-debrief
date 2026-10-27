export function Bubble({ role, text }: { role: 'assistant' | 'user'; text: string }) {
  if (role === 'assistant' && text === 'Added later') {
    return <p className="my-3 text-center text-xs text-muted">Added later</p>
  }
  return role === 'assistant' ? (
    <div className="mb-2 max-w-[88%] rounded-card border-l-[3px] border-accent bg-surface px-3 py-2.5 font-serif text-[15px] leading-snug">{text}</div>
  ) : (
    <div className="mb-2 ml-auto max-w-[85%] rounded-card bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] px-3 py-2.5 text-[15px] leading-snug">{text}</div>
  )
}
