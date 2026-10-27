import { scoreColor } from '@/lib/design'

export function ScoreChip({ score, size = 'md' }: { score: number | null; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-12 w-12 text-xl' : 'h-8 w-8 text-sm'
  return (
    <span
      className={`inline-flex ${cls} items-center justify-center rounded-card font-bold text-[#2a201b]`}
      style={{ background: score === null ? 'transparent' : scoreColor(score), border: score === null ? '1px dashed var(--muted)' : undefined }}
    >
      {score ?? '·'}
    </span>
  )
}
