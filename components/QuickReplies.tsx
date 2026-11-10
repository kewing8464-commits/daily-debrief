export function QuickReplies({ options, onPick }: { options: string[]; onPick: (v: string) => void }) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onPick(o)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm active:bg-accent active:text-on-accent">
          {o}
        </button>
      ))}
    </div>
  )
}
