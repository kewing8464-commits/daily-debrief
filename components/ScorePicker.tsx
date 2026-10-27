import { scoreColor } from '@/lib/design'

export function ScorePicker({ value, onPick }: { value: number | null; onPick: (n: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onPick(n)}
          style={{ background: scoreColor(n), outline: value === n ? '3px solid var(--text)' : undefined, outlineOffset: 2 }}
          className="aspect-square rounded-card text-lg font-bold text-[#2a201b]"
        >
          {n}
        </button>
      ))}
    </div>
  )
}
