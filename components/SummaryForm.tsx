'use client'
import type { DaySummary } from '@/lib/summary'
import { ScorePicker } from './ScorePicker'

type Props = { value: DaySummary; onChange: (s: DaySummary) => void }

const field = 'w-full rounded-card border border-line bg-bg px-3 py-2 text-[15px] outline-none focus:border-accent'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 flex flex-col gap-1 text-xs font-semibold text-muted">
      {label}
      {children}
    </label>
  )
}

const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

/** Review or edit a day. Everything the AI pulled out of the conversation can be corrected here. */
export function SummaryForm({ value: s, onChange }: Props) {
  const set = (patch: Partial<DaySummary>) => onChange({ ...s, ...patch })
  const text = (k: 'morning' | 'did' | 'fun' | 'happy' | 'annoyed' | 'standout' | 'oneLine', label: string) => (
    <Row label={label}>
      <textarea rows={2} className={field} value={s[k] ?? ''} onChange={(e) => set({ [k]: e.target.value } as Partial<DaySummary>)} />
    </Row>
  )
  return (
    <div>
      <Row label="Day score">
        <ScorePicker value={s.score} onPick={(n) => set({ score: n })} />
      </Row>
      {text('oneLine', 'Your day in a sentence')}
      <div className="grid grid-cols-3 gap-2">
        <Row label="Fell asleep">
          <input className={field} value={s.sleep.bedtime ?? ''} placeholder="11:30 pm" onChange={(e) => set({ sleep: { ...s.sleep, bedtime: e.target.value } })} />
        </Row>
        <Row label="Woke up">
          <input className={field} value={s.sleep.wake ?? ''} placeholder="7:00 am" onChange={(e) => set({ sleep: { ...s.sleep, wake: e.target.value } })} />
        </Row>
        <Row label="Hours">
          <input className={field} inputMode="decimal" value={s.sleep.hours ?? ''} onChange={(e) => set({ sleep: { ...s.sleep, hours: num(e.target.value) } })} />
        </Row>
      </div>
      {text('morning', 'How the day started')}
      {text('did', 'What you did')}
      <Row label="What you ate (one per line)">
        <textarea
          rows={3}
          className={field}
          value={s.food.map((f) => (f.amount ? `${f.amount} ${f.item}` : f.item)).join('\n')}
          onChange={(e) => set({ food: e.target.value.split('\n').filter((l) => l.trim()).map((l) => ({ item: l.trim() })) })}
        />
      </Row>
      <div className="grid grid-cols-3 gap-2">
        <Row label="Worked out">
          <select className={field} value={s.workout.did ? 'yes' : 'no'} onChange={(e) => set({ workout: { ...s.workout, did: e.target.value === 'yes' } })}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Row>
        <Row label="Workout">
          <input className={field} value={s.workout.type ?? ''} onChange={(e) => set({ workout: { ...s.workout, type: e.target.value } })} />
        </Row>
        <Row label="Minutes">
          <input className={field} inputMode="numeric" value={s.workout.minutes ?? ''} onChange={(e) => set({ workout: { ...s.workout, minutes: num(e.target.value) } })} />
        </Row>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Drinks 🍺">
          <input className={field} inputMode="numeric" value={s.alcohol.drinks} onChange={(e) => set({ alcohol: { ...s.alcohol, drinks: num(e.target.value) ?? 0 } })} />
        </Row>
        <Row label="Weed 🌿">
          <select className={field} value={s.cannabis.used ? 'yes' : 'no'} onChange={(e) => set({ cannabis: { ...s.cannabis, used: e.target.value === 'yes' } })}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Row>
      </div>
      {text('fun', 'Fun')}
      {text('happy', 'Made you happy')}
      {text('annoyed', 'Annoyed you')}
      {text('standout', 'Stood out')}
    </div>
  )
}
