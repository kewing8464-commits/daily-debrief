'use client'

/** Four equal one-tap buttons. Tapping the picked one again clears it (the ratings are optional). */
export function RatingPicker({ labels, value, onPick }: { labels: readonly string[]; value: number | null; onPick: (n: number | null) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {labels.map((label, i) => {
        const n = i + 1
        const on = value === n
        return (
          <button
            key={label}
            onClick={() => onPick(on ? null : n)}
            className={`rounded-card border py-2.5 text-[13px] ${on ? 'border-accent2 bg-accent2 font-bold text-[#1e1714]' : 'border-line'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
